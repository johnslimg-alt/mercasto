<?php

namespace App\Console\Commands;

use App\Events\NewNotification;
use App\Mail\SellerCorrectionRequiredMail;
use App\Mail\SellerReviewIncompleteMail;
use App\Models\Ad;
use App\Models\User;
use App\Services\AdModerationGuidanceService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Tells a seller that a hidden ad of theirs is not published, in the two cases where the
 * platform knows something worth saying and knows it truthfully:
 *
 *   - `manual_review` with a seller-fixable issue, where AdModerationGuidanceService decides
 *     the issue may be described to the seller at all (an assist-only rollout or a policy hold
 *     must not be downgraded into "fix your photo" advice);
 *   - `failed`, where the automatic review itself never produced a verdict.
 *
 * The second case used to reach nobody. `failed` is not a judgement about the ad: it is the
 * technical state left when the moderation pipeline could not complete, the row is parked
 * `archived`, and it is still listed in the admin queue
 * (AdminAdModerationController::UNFINISHED_MODERATION_STATUSES). Because the failure cause is
 * not reliably persisted, the notice says only what is certainly true — the review did not
 * finish, it was not the seller's doing, and the ad is not published — and never asks the
 * seller to correct anything, since nothing they can edit would re-queue a `failed` ad
 * (AdController's re-moderation branch covers manual_review and admin_changes_requested only).
 */
class SendSellerCorrectionNotices extends Command
{
    /**
     * Every notice type that carries `ad_ids` in its data payload.
     *
     * Both are read back before deciding who still needs to hear something, and the union is
     * deliberate: an ad a seller was already told about must not be the subject of a second,
     * differently-worded notice.
     */
    private const NOTICE_TYPE_CORRECTION = 'seller_correction_required';

    private const NOTICE_TYPE_INCOMPLETE = 'seller_review_incomplete';

    protected $signature = 'ads:notify-seller-corrections
                            {--execute : Persist notices and queue email delivery}
                            {--limit=500 : Maximum ads to inspect per moderation status}';

    protected $description = 'Notify sellers about fixable manual-review ads and about ads whose automatic review could not be completed';

    public function handle(AdModerationGuidanceService $guidance): int
    {
        $execute = (bool) $this->option('execute');
        $limit = max(1, min(1000, (int) $this->option('limit')));

        $corrections = $this->notifyFixableCorrections($guidance, $execute, $limit);
        $incomplete = $this->notifyIncompleteReviews($execute, $limit);

        $this->table(
            ['Mode', 'Scope', 'Ads', 'Sellers', 'Eligible sellers', 'In-app', 'Emails'],
            [
                [
                    $execute ? 'execute' : 'dry-run',
                    'manual_review (fixable)',
                    $corrections['ads'],
                    $corrections['sellers'],
                    $corrections['eligible'],
                    $corrections['in_app'],
                    $corrections['emails'],
                ],
                [
                    $execute ? 'execute' : 'dry-run',
                    'failed (review not completed)',
                    $incomplete['ads'],
                    $incomplete['sellers'],
                    $incomplete['eligible'],
                    $incomplete['in_app'],
                    $incomplete['emails'],
                ],
            ],
        );

        return self::SUCCESS;
    }

    /**
     * Fixable manual-review ads. Scope, eligibility filtering and copy are unchanged; the only
     * difference from the original implementation is that the send loop is now shared with the
     * `failed` scope below.
     *
     * @return array{ads: int, sellers: int, eligible: int, in_app: int, emails: int}
     */
    private function notifyFixableCorrections(AdModerationGuidanceService $guidance, bool $execute, int $limit): array
    {
        $items = Ad::query()
            ->with('latestModerationDecision')
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', 'manual_review')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(function (Ad $ad) use ($guidance): ?array {
                $correction = $guidance->sellerCorrection($ad);
                if (! is_array($correction)) {
                    return null;
                }

                return [
                    'ad' => $ad,
                    'messages' => is_array($correction['messages'] ?? null) ? $correction['messages'] : [],
                    'issue_codes' => is_array($correction['issue_codes'] ?? null) ? $correction['issue_codes'] : [],
                ];
            })
            ->filter()
            ->values();

        return $this->dispatchNotices($items, $execute, [
            'type' => self::NOTICE_TYPE_CORRECTION,
            'link' => '/profile?tab=my_ads&filter=needs_correction',
            'title' => 'Tu anuncio requiere una corrección',
            'title_plural' => 'Tus anuncios requieren correcciones',
            'message' => 'Corrige la información indicada y vuelve a enviar el anuncio a revisión.',
            'message_plural' => 'Tienes :count anuncios que puedes corregir y volver a enviar a revisión.',
        ], fn (User $user, int $count, array $messages, string $link) => new SellerCorrectionRequiredMail(
            $user,
            $count,
            $messages,
            $link,
        ));
    }

    /**
     * Ads whose automatic review could not be completed.
     *
     * Two ads can share a seller, so the notice is aggregated exactly like the correction one.
     * Eligibility does not consult AdModerationGuidanceService: there is no model output to be
     * non-authoritative about, and refusing to name a cause we did not record is not the same
     * as withholding a verdict.
     *
     * @return array{ads: int, sellers: int, eligible: int, in_app: int, emails: int}
     */
    private function notifyIncompleteReviews(bool $execute, int $limit): array
    {
        $items = Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', 'failed')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (Ad $ad): array => [
                'ad' => $ad,
                'messages' => [],
                'issue_codes' => ['review_incomplete'],
            ]);

        return $this->dispatchNotices($items, $execute, [
            'type' => self::NOTICE_TYPE_INCOMPLETE,
            // `pending` is where MyAdsScreen already lists a `failed` archived ad
            // (HUMAN_REVIEW_STATUSES contains it), so the deep link lands on the ad itself
            // instead of an empty "needs correction" list.
            'link' => '/profile?tab=my_ads&filter=pending',
            'title' => 'No pudimos completar la revisión de tu anuncio',
            'title_plural' => 'No pudimos completar la revisión de tus anuncios',
            'message' => 'La revisión automática de tu anuncio no se completó por un problema técnico, no por un error tuyo. El anuncio no está publicado y, por ahora, no necesitas hacer nada: si requerimos algún cambio, te avisaremos por aquí.',
            'message_plural' => 'La revisión automática no se completó en :count de tus anuncios por un problema técnico, no por un error tuyo. Esos anuncios no están publicados y, por ahora, no necesitas hacer nada: si requerimos algún cambio, te avisaremos por aquí.',
        ], fn (User $user, int $count, array $messages, string $link) => new SellerReviewIncompleteMail(
            $user,
            $count,
            $link,
        ));
    }

    /**
     * Group ads by seller and notify each seller who has not already been told about them.
     *
     * @param  Collection<int, array{ad: Ad, messages: array<int, string>, issue_codes: array<int, string>}>  $items
     * @param  array{type: string, link: string, title: string, title_plural: string, message: string, message_plural: string}  $copy
     * @param  callable(User, int, array<int, string>, string): object  $makeMail
     * @return array{ads: int, sellers: int, eligible: int, in_app: int, emails: int}
     */
    private function dispatchNotices(Collection $items, bool $execute, array $copy, callable $makeMail): array
    {
        $groups = $items->groupBy(fn (array $item) => (int) $item['ad']->user_id);

        $stats = [
            'ads' => $items->count(),
            'sellers' => $groups->count(),
            'eligible' => 0,
            'in_app' => 0,
            'emails' => 0,
        ];

        foreach ($groups as $userId => $groupItems) {
            $adIds = $groupItems->pluck('ad.id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            $newAdIds = array_values(array_diff($adIds, $this->previouslyNotifiedAdIds((int) $userId)));
            if ($newAdIds === []) {
                continue;
            }

            $stats['eligible']++;
            if (! $execute) {
                continue;
            }

            $user = User::query()->find($userId);
            if (! $user) {
                continue;
            }

            $messages = $groupItems
                ->flatMap(fn (array $item) => $item['messages'])
                ->filter()
                ->unique()
                ->values()
                ->all();
            $issueCodes = $groupItems
                ->flatMap(fn (array $item) => $item['issue_codes'])
                ->filter()
                ->unique()
                ->values()
                ->all();

            $count = count($adIds);
            $notification = $this->persistNotice(
                $user,
                $adIds,
                $newAdIds,
                $issueCodes,
                $copy['type'],
                $copy['link'],
                $count === 1 ? $copy['title'] : $copy['title_plural'],
                str_replace(':count', (string) $count, $count === 1 ? $copy['message'] : $copy['message_plural']),
            );
            if (! $notification) {
                continue;
            }

            $stats['in_app']++;
            broadcast(new NewNotification((int) $user->id, $notification))->toOthers();

            if ($this->emailEnabled($user) && filled($user->email)) {
                try {
                    Mail::to($user->email)->queue($makeMail($user, $count, $messages, $this->actionUrl($copy['link'])));
                    $stats['emails']++;
                } catch (Throwable $error) {
                    Log::warning('Could not queue seller correction email', [
                        'user_id' => $user->id,
                        'type' => $copy['type'],
                        'error' => $error->getMessage(),
                    ]);
                }
            }
        }

        return $stats;
    }

    /**
     * Ad ids this seller has already been told about, across every notice type that carries
     * them. The union is what makes a second run — or a second scope matching the same ad —
     * unable to re-notify anyone.
     *
     * @return array<int, int>
     */
    private function previouslyNotifiedAdIds(int $userId): array
    {
        return DB::table('user_notifications')
            ->where('user_id', $userId)
            ->whereIn('type', [self::NOTICE_TYPE_CORRECTION, self::NOTICE_TYPE_INCOMPLETE])
            ->get(['data'])
            ->flatMap(function ($row) {
                $data = is_array($row->data)
                    ? $row->data
                    : (json_decode((string) $row->data, true) ?: []);

                return is_array($data['ad_ids'] ?? null) ? $data['ad_ids'] : [];
            })
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function persistNotice(
        User $user,
        array $adIds,
        array $newAdIds,
        array $issueCodes,
        string $type,
        string $link,
        string $title,
        string $message,
    ): ?array {
        return DB::transaction(function () use ($user, $adIds, $newAdIds, $issueCodes, $type, $link, $title, $message) {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first();

            $stillNew = array_values(array_diff(
                $newAdIds,
                $this->previouslyNotifiedAdIds((int) $user->id),
            ));
            if ($stillNew === []) {
                return null;
            }

            $notification = [
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'data' => json_encode([
                    'ad_ids' => $adIds,
                    'new_ad_ids' => $stillNew,
                    'issue_codes' => $issueCodes,
                ], JSON_THROW_ON_ERROR),
                'link' => $link,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);

            return $notification;
        }, 3);
    }

    private function emailEnabled(User $user): bool
    {
        $preferences = $user->notification_preferences ?? [];
        if (array_key_exists('email_alerts', $preferences)) {
            return (bool) $preferences['email_alerts'];
        }

        return $user->email_notifications === null
            ? true
            : (bool) $user->email_notifications;
    }

    /**
     * Absolute frontend URL for the email call to action.
     *
     * The in-app `link` is deliberately relative; an email cannot be, so the same path is
     * resolved against the frontend base here, exactly as the original implementation did.
     */
    private function actionUrl(string $path = '/profile?tab=my_ads&filter=needs_correction'): string
    {
        $baseUrl = rtrim((string) config(
            'app.frontend_url',
            config('app.url', 'https://mercasto.com'),
        ), '/');

        return $baseUrl.$path;
    }
}

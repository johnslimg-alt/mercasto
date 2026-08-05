<?php

namespace App\Console\Commands;

use App\Events\NewNotification;
use App\Mail\SellerCorrectionRequiredMail;
use App\Models\Ad;
use App\Models\User;
use App\Services\AdModerationGuidanceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendSellerCorrectionNotices extends Command
{
    protected $signature = 'ads:notify-seller-corrections
                            {--execute : Persist notices and queue email delivery}
                            {--limit=500 : Maximum manual-review ads to inspect}';

    protected $description = 'Notify sellers about fixable manual-review ads without exposing sensitive review cases';

    public function handle(AdModerationGuidanceService $guidance): int
    {
        $execute = (bool) $this->option('execute');
        $limit = max(1, min(1000, (int) $this->option('limit')));

        $groups = Ad::query()
            ->with('latestModerationDecision')
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', 'manual_review')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (Ad $ad) => [
                'ad' => $ad,
                'correction' => $guidance->sellerCorrection($ad),
            ])
            ->filter(fn (array $item) => is_array($item['correction']))
            ->groupBy(fn (array $item) => (int) $item['ad']->user_id);

        $summary = [
            'ads' => $groups->flatten(1)->count(),
            'sellers' => $groups->count(),
            'eligible_sellers' => 0,
            'in_app' => 0,
            'emails' => 0,
        ];

        foreach ($groups as $userId => $items) {
            $adIds = $items->pluck('ad.id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            $newAdIds = array_values(array_diff($adIds, $this->previouslyNotifiedAdIds((int) $userId)));
            if ($newAdIds === []) {
                continue;
            }

            $summary['eligible_sellers']++;
            if (! $execute) {
                continue;
            }

            $user = User::query()->find($userId);
            if (! $user) {
                continue;
            }

            $messages = $items
                ->flatMap(fn (array $item) => $item['correction']['messages'] ?? [])
                ->filter()
                ->unique()
                ->values()
                ->all();
            $issueCodes = $items
                ->flatMap(fn (array $item) => $item['correction']['issue_codes'] ?? [])
                ->filter()
                ->unique()
                ->values()
                ->all();

            $notification = $this->persistNotice(
                $user,
                $adIds,
                $newAdIds,
                $messages,
                $issueCodes,
            );
            if (! $notification) {
                continue;
            }

            $summary['in_app']++;
            broadcast(new NewNotification((int) $user->id, $notification))->toOthers();

            if ($this->emailEnabled($user) && filled($user->email)) {
                try {
                    Mail::to($user->email)->queue(new SellerCorrectionRequiredMail(
                        $user,
                        count($adIds),
                        $messages,
                        $this->actionUrl(),
                    ));
                    $summary['emails']++;
                } catch (Throwable $error) {
                    Log::warning('Could not queue seller correction email', [
                        'user_id' => $user->id,
                        'error' => $error->getMessage(),
                    ]);
                }
            }
        }

        $this->table(
            ['Mode', 'Fixable ads', 'Sellers', 'Eligible sellers', 'In-app', 'Emails'],
            [[
                $execute ? 'execute' : 'dry-run',
                $summary['ads'],
                $summary['sellers'],
                $summary['eligible_sellers'],
                $summary['in_app'],
                $summary['emails'],
            ]],
        );

        return self::SUCCESS;
    }

    private function previouslyNotifiedAdIds(int $userId): array
    {
        return DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('type', 'seller_correction_required')
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
        array $messages,
        array $issueCodes,
    ): ?array {
        return DB::transaction(function () use ($user, $adIds, $newAdIds, $messages, $issueCodes) {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first();

            $stillNew = array_values(array_diff(
                $newAdIds,
                $this->previouslyNotifiedAdIds((int) $user->id),
            ));
            if ($stillNew === []) {
                return null;
            }

            $count = count($adIds);
            $notification = [
                'user_id' => $user->id,
                'title' => $count === 1
                    ? 'Tu anuncio requiere una corrección'
                    : 'Tus anuncios requieren correcciones',
                'message' => $count === 1
                    ? 'Corrige la información indicada y vuelve a enviar el anuncio a revisión.'
                    : "Tienes {$count} anuncios que puedes corregir y volver a enviar a revisión.",
                'type' => 'seller_correction_required',
                'data' => json_encode([
                    'ad_ids' => $adIds,
                    'new_ad_ids' => $stillNew,
                    'issue_codes' => $issueCodes,
                ], JSON_THROW_ON_ERROR),
                'link' => '/profile?tab=my_ads&filter=needs_correction',
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

    private function actionUrl(): string
    {
        $baseUrl = rtrim((string) config(
            'app.frontend_url',
            config('app.url', 'https://mercasto.com'),
        ), '/');

        return $baseUrl . '/profile?tab=my_ads&filter=needs_correction';
    }
}

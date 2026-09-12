<?php

namespace App\Console\Commands;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\ListingDuplicateDetector;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resolves content-identical resubmissions by acting on a duplicate group.
 *
 * This is the operator's lever for acting on what the moderation pipeline only
 * surfaces. It exists because a duplicate ad must stop being `approved` BEFORE
 * `ads:reconcile-moderation-visibility --apply` runs: that command keys on
 * `ai_moderation_status = 'approved'`, so `--limit` cannot exclude duplicates
 * (they hold the lowest ids) and `status` alone cannot fix it.
 *
 * It reuses App\Services\ListingDuplicateDetector for the group key. There is no
 * second detector, so the pipeline and this command can never disagree about what
 * "duplicate" means: grouping uses the detector's own fingerprint
 * (seller + normalized title + normalized price + normalized description), and the
 * default `--keep=earliest` additionally cross-checks every row it would change
 * against ListingDuplicateDetector::detect(), which nominates the earliest earlier
 * submission as the original.
 *
 * The policy is a FLAG, never a hardcoded opinion: --action and --keep are the
 * operator's decision, dry-run is the default, and nothing is written without
 * --apply.
 *
 * Safety properties:
 *  - only members of a proven exact-duplicate group are ever touched;
 *  - a group containing a `status = 'active'` ad is skipped entirely and reported
 *    loudly, so already-public inventory is never retroactively hidden;
 *  - only rows currently `ai_moderation_status = 'approved'` are candidates, which
 *    is what makes a second --apply a guaranteed no-op;
 *  - every change runs in a transaction that re-reads the row, re-asserts the group
 *    fingerprint and then performs a conditional UPDATE re-asserting the exact
 *    predicate, so nothing outside the group can change.
 *
 * Reached from the console kernel: Laravel 11 discovers commands in
 * app/Console/Commands automatically (there is no app/Console/Kernel.php), so this
 * is run as `php artisan ads:resolve-duplicate-submissions ...`. It is deliberately
 * NOT scheduled in routes/console.php — it is an operator action, not a cron.
 */
class ResolveDuplicateSubmissions extends Command
{
    protected $signature = 'ads:resolve-duplicate-submissions
        {--action=manual_review : What to do with the duplicates: manual_review or reject}
        {--keep=earliest : Which member of each group to keep: earliest or latest}
        {--since= : Only consider ads created on or after this date/time}
        {--limit=0 : Maximum number of duplicate rows to change (0 = no limit)}
        {--apply : Persist the changes (dry-run by default)}';

    protected $description = 'Resolve exact-duplicate submissions by routing or rejecting the copies (dry-run by default)';

    public function handle(ListingDuplicateDetector $detector): int
    {
        $action = (string) $this->option('action');
        $keep = (string) $this->option('keep');
        $apply = (bool) $this->option('apply');
        $limit = max(0, (int) $this->option('limit'));

        if (! in_array($action, ['manual_review', 'reject'], true)) {
            $this->error('--action must be manual_review or reject.');

            return self::FAILURE;
        }

        if (! in_array($keep, ['earliest', 'latest'], true)) {
            $this->error('--keep must be earliest or latest.');

            return self::FAILURE;
        }

        $since = null;
        if (($sinceOption = $this->option('since')) !== null && $sinceOption !== '') {
            try {
                $since = Carbon::parse((string) $sinceOption);
            } catch (\Throwable) {
                $this->error('--since is not a valid date/time.');

                return self::FAILURE;
            }
        }

        if (! $apply) {
            $this->info('DRY RUN: no changes will be written. Re-run with --apply to persist.');
        }

        $this->line(sprintf('Policy: action=%s keep=%s%s', $action, $keep, $limit > 0 ? ' limit='.$limit : ''));

        $pool = Ad::query()
            ->where('is_catalog_filler', false)
            ->when($since, fn ($query) => $query->where('created_at', '>=', $since))
            ->orderBy('id')
            ->get(['id', 'user_id', 'title', 'price', 'description', 'status', 'ai_moderation_status', 'expires_at', 'created_at']);

        $groups = $pool
            ->groupBy(fn (Ad $ad): string => $detector->fingerprint($ad))
            ->filter(fn (Collection $members): bool => $members->count() > 1);

        $tableRows = [];
        $toChange = [];
        $skippedActiveGroups = [];
        $changed = 0;

        foreach ($groups as $fingerprint => $members) {
            $keeper = $keep === 'latest' ? $members->last() : $members->first();

            // Already-public inventory is never retroactively hidden: skip the whole
            // group and surface it for a human instead.
            $activeMembers = $members->where('status', 'active');
            if ($activeMembers->isNotEmpty()) {
                $skippedActiveGroups[] = sprintf(
                    'group of %d (seller %s, kept #%d) contains active ad(s) #%s',
                    $members->count(),
                    (string) $keeper->user_id,
                    $keeper->id,
                    $activeMembers->pluck('id')->implode(', #'),
                );

                continue;
            }

            $candidates = $members
                ->reject(fn (Ad $ad): bool => $ad->id === $keeper->id)
                ->filter(fn (Ad $ad): bool => $ad->ai_moderation_status === Ad::MODERATION_APPROVED)
                ->filter(function (Ad $ad) use ($detector, $keeper, $keep): bool {
                    if ($keep !== 'earliest') {
                        // Grouping by the detector's own fingerprint is the proof of
                        // membership; the detector's `id <` rule is intentionally
                        // inverted when the operator asks to keep the latest.
                        return true;
                    }

                    $signal = $detector->detect($ad);

                    return $signal['is_duplicate'] && (int) $signal['duplicate_of_ad_id'] === (int) $keeper->id;
                })
                ->values();

            if ($candidates->isEmpty()) {
                // Still reported, so the operator can see the group exists but holds
                // nothing actionable (e.g. every copy is already in human review).
                $tableRows[] = [
                    $keeper->id,
                    '—',
                    (string) $keeper->user_id,
                    mb_strimwidth((string) $keeper->title, 0, 40, '…'),
                ];

                continue;
            }

            foreach ($candidates as $candidate) {
                $toChange[] = ['ad' => $candidate, 'keeper' => $keeper->id, 'fingerprint' => $fingerprint, 'group_size' => $members->count()];
            }

            $tableRows[] = [
                $keeper->id,
                $candidates->pluck('id')->implode(', '),
                (string) $keeper->user_id,
                mb_strimwidth((string) $keeper->title, 0, 40, '…'),
            ];
        }

        $truncated = $limit > 0 && count($toChange) > $limit;
        if ($truncated) {
            $toChange = array_slice($toChange, 0, $limit);
        }

        if ($tableRows !== []) {
            $this->newLine();
            $this->table(['Kept', 'To change', 'Seller', 'Title'], $tableRows);
        }

        foreach ($skippedActiveGroups as $skipped) {
            $this->warn('SKIPPED (contains active inventory): '.$skipped);
        }

        foreach ($toChange as $item) {
            if ($apply) {
                $changed += $this->applyResolution($detector, $item, $action, $keep);
            }
        }

        $this->newLine();
        $this->line(sprintf('Duplicate groups found        : %d', $groups->count()));
        $this->line(sprintf('Groups skipped (active member): %d', count($skippedActiveGroups)));
        $this->line(sprintf('Duplicate rows %s: %d', $apply ? 'changed' : 'to change', $apply ? $changed : count($toChange)));

        if ($truncated) {
            $this->warn(sprintf('--limit=%d truncated the work list; re-run to continue.', $limit));
        }

        if (! $apply) {
            $this->newLine();
            $this->info(sprintf('Dry run complete. Would change %d row(s) with --action=%s --keep=%s.', count($toChange), $action, $keep));
        } else {
            $this->info(sprintf('Applied. %d row(s) changed.', $changed));
        }

        $this->reportReconcileProjection($toChange, $apply);

        return self::SUCCESS;
    }

    /**
     * @param  array{ad: Ad, keeper: int, fingerprint: string, group_size: int}  $item
     */
    private function applyResolution(ListingDuplicateDetector $detector, array $item, string $action, string $keep): int
    {
        $ad = $item['ad'];

        return DB::transaction(function () use ($detector, $item, $action, $keep, $ad): int {
            $fresh = Ad::query()->lockForUpdate()->find($ad->id);

            if (! $fresh) {
                return 0;
            }

            // Re-assert group membership on the locked row before touching it.
            if ($detector->fingerprint($fresh) !== $item['fingerprint']) {
                return 0;
            }

            $attributes = $action === 'reject'
                ? [
                    // Mirrors AdminAdModerationController::decide() for a rejection.
                    'status' => 'rejected',
                    'ai_moderation_status' => 'admin_rejected',
                ]
                : [
                    // The pipeline's manual-review state. `status` is deliberately left
                    // untouched: the row is already hidden, and only the approval marker
                    // has to go for the reconciliation predicate to stop matching it.
                    'ai_moderation_status' => 'manual_review',
                ];

            $affected = Ad::query()
                ->whereKey($fresh->id)
                ->where('is_catalog_filler', false)
                ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
                ->where('status', '!=', 'active')
                ->update(array_merge($attributes, [
                    'ai_moderation_reason' => $detector->reasonForId((int) $item['keeper']),
                    'ai_moderation_confidence' => null,
                    'ai_moderated_at' => now(),
                    'updated_at' => now(),
                ]));

            if ($affected !== 1) {
                return 0;
            }

            AdModerationDecision::create([
                'ad_id' => $fresh->id,
                'source' => 'system',
                'decision' => $action === 'reject' ? 'rejected' : 'manual_review',
                'reason' => $detector->reasonForId((int) $item['keeper']),
                'metadata' => [
                    'duplicate_resolution' => [
                        'command' => 'ads:resolve-duplicate-submissions',
                        'action' => $action,
                        'keep' => $keep,
                        'kept_ad_id' => (int) $item['keeper'],
                        'fingerprint' => $item['fingerprint'],
                        'group_size' => $item['group_size'],
                        'previous_ai_moderation_status' => Ad::MODERATION_APPROVED,
                    ],
                ],
            ]);

            return 1;
        }, 3);
    }

    /**
     * Show what ads:reconcile-moderation-visibility would match afterwards, so the
     * operator can see the effect of one command on the next.
     *
     * @param  array<int, array{ad: Ad, keeper: int, fingerprint: string, group_size: int}>  $toChange
     */
    private function reportReconcileProjection(array $toChange, bool $apply): void
    {
        $reconcileMatches = Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->whereNull('expires_at')
            ->count();

        if ($apply) {
            $this->line(sprintf(
                'ads:reconcile-moderation-visibility now matches: %d',
                $reconcileMatches
            ));

            return;
        }

        $wouldLeave = 0;
        foreach ($toChange as $item) {
            $ad = $item['ad'];
            if ($ad->status === 'archived' && $ad->expires_at === null) {
                $wouldLeave++;
            }
        }

        $this->line(sprintf(
            'ads:reconcile-moderation-visibility would then match: %d (currently %d)',
            max(0, $reconcileMatches - $wouldLeave),
            $reconcileMatches
        ));
    }
}

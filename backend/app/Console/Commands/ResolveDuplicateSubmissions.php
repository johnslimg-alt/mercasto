<?php

namespace App\Console\Commands;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\ListingDuplicateDetector;
use App\Traits\ReportsAdLifetimePreflight;
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
 *
 * Irreversibility: the "second --apply is a no-op" property is not an undo. Only rows
 * with `ai_moderation_status = 'approved'` are changed, so after a run a second --apply
 * selects none of the rows it changed, and the command never returns a row to
 * 'approved'. The preflight block below states that, plus the exact size of the change
 * and the ordering key that decides which member survives, before any write.
 */
class ResolveDuplicateSubmissions extends Command
{
    use ReportsAdLifetimePreflight;

    protected $signature = 'ads:resolve-duplicate-submissions
        {--action=manual_review : What to do with the duplicates: manual_review or reject}
        {--keep=earliest : Which member of each group to keep, by submission order (created_at, then id as tiebreaker): earliest or latest}
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

        // Printed in both modes, before the first write: the lifetime the FOLLOWING
        // activation step will stamp, and the fact that this sweep cannot be re-run as an
        // undo. Additive output only - the command's contract is unchanged.
        $this->printActivationPreflight([
            'NEXT STEP' => 'ads:reconcile-moderation-visibility --apply runs after this one and activates the rows still approved, each with expires_at = the date above; the rows changed here are not activated by it.',
            'ONE-SHOT' => "only rows with ai_moderation_status='approved' are changed, so a later --apply selects none of the rows changed here: re-running is not an undo, and this command never returns a row to 'approved'.",
        ]);

        if (! $apply) {
            $this->info('DRY RUN: no changes will be written. Re-run with --apply to persist.');
        }

        $this->line(sprintf('Policy: action=%s keep=%s%s', $action, $keep, $limit > 0 ? ' limit='.$limit : ''));
        $this->line('Ordering: '.ListingDuplicateDetector::ORDER_DESCRIPTION.' — "earliest" and "latest" are resolved against this key, not against ad id.');

        $pool = Ad::query()
            ->where('is_catalog_filler', false)
            ->when($since, fn ($query) => $query->where('created_at', '>=', $since))
            ->orderBy('id')
            ->get(['id', 'user_id', 'title', 'price', 'description', 'status', 'ai_moderation_status', 'expires_at', 'created_at']);

        // Group members are put in SUBMISSION order (created_at, id as tiebreaker), not
        // ad-id order, so --keep=earliest|latest means the earliest/latest submission.
        // Ad id is an insertion counter, which is not the same concept as submission
        // time. The ordering helper is shared with the detector so the pipeline and
        // this command can never disagree about which row is the original.
        $pool = $detector->sortBySubmissionOrder($pool);

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
                ->values();

            // Reference the true original. With --keep=earliest the detector nominates
            // the globally earliest same-content submission, which may sit OUTSIDE a
            // --since window; requiring it to equal the window-local keeper would drop
            // every actionable row and let a following reconciliation publish both
            // copies. Membership is proven by the detector, not by that equality.
            $referenceId = (int) $keeper->id;
            $signals = [];

            if ($keep === 'earliest' && $candidates->isNotEmpty()) {
                $verified = [];

                foreach ($candidates as $candidate) {
                    $signal = $detector->detect($candidate);

                    if (! $signal['is_duplicate']) {
                        continue;
                    }

                    $verified[] = $candidate;
                    $signals[$candidate->id] = $signal;
                    $referenceId = (int) $signal['duplicate_of_ad_id'];
                }

                $candidates = collect($verified);
            }

            if ($candidates->isEmpty()) {
                // Still reported, so the operator can see the group exists but holds
                // nothing actionable (e.g. every copy is already in human review).
                $tableRows[] = [
                    $referenceId,
                    $this->submittedAt($keeper),
                    '—',
                    (string) $keeper->user_id,
                    mb_strimwidth((string) $keeper->title, 0, 40, '…'),
                ];

                continue;
            }

            foreach ($candidates as $candidate) {
                $signal = $signals[$candidate->id] ?? null;

                $toChange[] = [
                    'ad' => $candidate,
                    'keeper' => $referenceId,
                    'fingerprint' => $fingerprint,
                    'group_size' => $members->count(),
                    'candidate_count' => $signal['candidate_count'] ?? null,
                    'candidates_truncated' => (bool) ($signal['candidates_truncated'] ?? false),
                ];
            }

            $tableRows[] = [
                $referenceId,
                $referenceId === (int) $keeper->id
                    ? $this->submittedAt($keeper)
                    : '(earlier submission outside the --since window)',
                $candidates->pluck('id')->implode(', '),
                (string) $keeper->user_id,
                mb_strimwidth((string) $keeper->title, 0, 40, '…'),
            ];
        }

        $truncated = $limit > 0 && count($toChange) > $limit;
        if ($truncated) {
            $toChange = array_slice($toChange, 0, $limit);
        }

        // Preflight for the write that follows, so the operator sees the exact size of the
        // change and the ordering key that picks the survivor before anything is written.
        // In dry-run it is the projection of what --apply would do. Additive output only.
        $this->line(sprintf(
            'Preflight: %s %d row(s) (--action=%s, --keep=%s); survivors are kept by %s, not by ad id.',
            $apply ? 'this run will change' : 'a following --apply would change',
            count($toChange),
            $action,
            $keep,
            ListingDuplicateDetector::ORDER_DESCRIPTION
        ));

        if ($tableRows !== []) {
            $this->newLine();
            $this->table(['Kept', 'Kept at (submitted)', 'To change', 'Seller', 'Title'], $tableRows);
        }

        foreach ($skippedActiveGroups as $skipped) {
            $this->warn('SKIPPED (contains active inventory): '.$skipped);
        }

        $stale = 0;
        foreach ($toChange as $item) {
            if ($apply) {
                $applied = $this->applyResolution($detector, $item, $action, $keep);
                $changed += $applied;

                if ($applied === 0) {
                    $stale++;
                }
            }
        }

        if ($stale > 0) {
            $this->warn(sprintf(
                '%d row(s) were skipped because the row or its original changed while the command was running. Re-run to re-evaluate.',
                $stale
            ));
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
     * Submission timestamp shown in the dry-run table so the operator can see the
     * value the ordering key was evaluated against.
     */
    private function submittedAt(Ad $ad): string
    {
        return $ad->created_at?->toDateTimeString() ?? '(no timestamp)';
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

            // The keeper must still exist and still be the same content, otherwise the
            // row would be recorded as a duplicate of an ad that no longer exists or no
            // longer matches. Locked and checked inside the same transaction.
            $keeper = Ad::query()->lockForUpdate()->find($item['keeper']);

            if (! $keeper || $detector->fingerprint($keeper) !== $item['fingerprint']) {
                return 0;
            }

            $attributes = $action === 'reject'
                ? [
                    // Mirrors AdminAdModerationController::decide() for a rejection.
                    'status' => 'rejected',
                    'ai_moderation_status' => 'admin_rejected',
                ]
                : [
                    // The pipeline's manual-review state. `archived` is required, not
                    // cosmetic: the admin queue only lists pending or archived
                    // unfinished ads, and AdRenewalService::fulfill() refuses to
                    // reactivate anything outside active/expired/paused/inactive, so an
                    // archived row cannot be paid back into publication while it is
                    // still under review.
                    'status' => 'archived',
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
                    // The same structured signal the detector writes, so the admin
                    // payload keeps rendering suspected_duplicate for the very rows this
                    // command routed to review. Without it this decision is the newest
                    // one and the evidence would silently disappear.
                    'duplicate' => $detector->evidenceFor(
                        (int) $item['keeper'],
                        (string) $item['fingerprint'],
                        $item['candidate_count'] ?? null,
                        (bool) ($item['candidates_truncated'] ?? false),
                    ),
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

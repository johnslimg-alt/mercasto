<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\SitemapController;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Support\ActivationLifetimeProvenance;
use App\Traits\ReportsAdLifetimePreflight;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Corrects the publication lifetime of ads that `ads:reconcile-moderation-visibility`
 * published with the wrong one.
 *
 * The problem it solves. Activation stamps ONE lifetime, `Ad::freshExpiry()` = now +
 * `marketplace.ad_lifetime_days`, resolved from env `AD_LIFETIME_DAYS` (code default 7). The
 * action is one-shot: its predicate requires `status = 'archived'` and it writes
 * `status = 'active'`, so a second `--apply` selects none of the rows it just published. An
 * operator who activates before setting the intended lifetime therefore buys exactly one
 * (short) window of visibility; when it lapses the daily `ads:expire` / `ads:process-expiry`
 * tasks move the rows to `expired` and the inventory is dark again, with no way back.
 *
 * What it writes. For each ad this command republishes, `expires_at` becomes the moment the
 * bulk activation that granted the row's CURRENT lifetime published it (that activation
 * decision's `created_at`) plus the lifetime resolved NOW, and `status` becomes `active`. That
 * is a correction of the original grant, not a fresh grant: the visibility already served
 * inside the wrong window is charged against the intended lifetime. `status` is set because a
 * row that already lapsed is `expired`, and an `expired` row with a future `expires_at` is
 * still invisible; the result satisfies App\Support\ListingIndexability, the shared predicate
 * the sitemap and the SEO shell use, so "corrected" means genuinely indexable and not merely
 * active.
 *
 * What it CANNOT know, and says so. The command cannot tell an intended lifetime from a
 * misconfigured one; it applies whatever the configuration resolves to. A value LARGER than
 * the lifetime the rows already hold is therefore written. "0 changes" is not a safety net for
 * a wrong setting — it happens only when the resolved lifetime does not exceed what the rows
 * already hold (typically: the env was never changed at all). The preflight prints the resolved
 * value and its provenance, and that line is what the operator must confirm before `--apply`.
 *
 * Why the anchor makes it idempotent. The target is a pure function of two immutable inputs
 * (the granting activation instant and the resolved lifetime), never of `now()`. A second
 * `--apply` computes the same instants, and the write is conditional on the row still differing,
 * so it reports 0 changes. Anchoring on `now()` instead would make every re-run silently extend
 * the window, which is the one failure mode an operator tool must not have. Anchoring on a
 * SUPERSEDED activation would be the mirror error: an ad can be activated more than once (the
 * seller archives it, an operator republishes it with `--include-owner-archived`), and measuring
 * from the older activation under-extends the row or skips it outright.
 *
 * --limit is a budget for WRITES, not for rows inspected. A corrected row remains in the
 * candidate set for ever — its `expires_at` no longer matches its recorded grant, which is
 * precisely what makes it ineligible — and permanent safety exclusions stay there too. If either
 * consumed the budget, a later limited run would start at the same ids, correct nothing and never
 * reach the remaining ads, so batching a large correction could never finish.
 *
 * THE SAFETY CORE — which lifetimes are eligible.
 * Only rows whose `expires_at` is still EXACTLY the instant an operator command recorded are
 * touched. Every other lifetime belongs to someone else and is left alone:
 *   - ANY `payments` row for the ad that is not provably unsettled (i.e. anything outside
 *     `pending` / `failed` / `expired`) — never touched. That is a whitelist rather than a list of
 *     paid statuses because a blacklist fails open: `paid_review` (money received, promotion
 *     fulfilment parked for manual remediation) was not on it, and `payments.status` has no
 *     database constraint, so a status added later would reopen the hole silently;
 *   - `republished_at` later than the operator's grant (paid renewal, `republish`, seller
 *     confirmation reactivation) — never touched;
 *   - any status other than `active` / `expired` (archived, paused, inactive, rejected: the
 *     seller's or a moderator's decision) — never touched;
 *   - no operator grant on record, or a grant recorded by a build that did not yet store the
 *     instant (legacy activation) — reported as unverifiable and never touched, because
 *     without the recorded instant there is no way to tell an operator lifetime from a
 *     seller's;
 *   - an `expires_at` that no longer matches the recorded instant — some other path wrote the
 *     lifetime after the operator did, so it is that path's lifetime now.
 * The exact-instant comparison is what makes this provable rather than heuristic, and it is
 * necessary: `AdController::renew` (referral-credit renewal) writes `status = 'active'` and
 * `expires_at = Ad::freshExpiry()` with NO `payments` row, NO `republished_at` and NO
 * `republish_count`, so a guard built on those signals alone would overwrite a seller's own
 * renewal. It also survives the natural end of the granted lifetime, because every expiry path
 * flips `status` and leaves `expires_at` untouched — which is exactly the case being repaired.
 * The instant compared against is the one the grant recorded, and the anchor is derived from that
 * same record rather than from the audit row's timestamp, so the guard and the target always read
 * one second: see ActivationLifetimeProvenance::grantedAnchor().
 *
 * Two further one-way guards:
 *   - it only ever EXTENDS. If the intended lifetime resolves to an instant at or before the
 *     row's current `expires_at`, the row is left alone and reported. Shortening a live ad is a
 *     different decision and is not this command's to make;
 *   - it never revives into a non-indexable past. If the intended lifetime has already fully
 *     elapsed since activation, the row is left as it is and reported, rather than activated
 *     with an `expires_at` in the past.
 *
 * Contract, matching the other operator commands: dry-run by default, `--apply` to write, no
 * required flags, no prompts, and the shared lifetime preflight printed before the first write
 * and in dry-run too. Deliberately NOT scheduled in routes/console.php: an automatic restore
 * would silently undo an expiry the seller may have intended.
 */
class CorrectActivationLifetime extends Command
{
    use ReportsAdLifetimePreflight;

    protected $signature = 'ads:correct-activation-lifetime
        {--dry-run : Report the correction plan without writing anything (default)}
        {--apply : Persist the corrected lifetimes}
        {--limit=0 : Maximum number of ads to process (0 = no limit)}';

    protected $description = 'Correct the lifetime of ads published by ads:reconcile-moderation-visibility (dry-run by default, use --apply to persist)';

    /** The statuses a bulk activation can leave behind, and the only ones this command may write. */
    private const ELIGIBLE_STATUSES = ['active', 'expired'];

    private const REASON_UNVERIFIABLE = 'activated by a build that did not record the granted instant';

    /**
     * Recorded as the decision value on the audit row this command writes. Deliberately not
     * 'approved': no moderation decision is being made here, and a distinct value keeps this
     * row out of every query that filters the audit trail by a moderation outcome.
     */
    private const DECISION = 'lifetime_corrected';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $explicitDryRun = (bool) $this->option('dry-run');

        if ($apply && $explicitDryRun) {
            $this->error('--apply and --dry-run are mutually exclusive.');

            return self::FAILURE;
        }

        // A malformed --limit must fail loudly rather than be cast: PHP turns '1O0' into 1 (a tiny
        // budget) and a wholly non-numeric or negative value into 0, which this command reads as NO
        // limit. An operator typo would then correct far more rows than intended. Validating a
        // supplied value adds no gate: --limit stays optional, its default is unchanged, and
        // nothing here prompts.
        $limitOption = $this->option('limit');
        $limitRaw = trim((string) (is_scalar($limitOption) ? $limitOption : ''));

        if (preg_match('/^\d+$/', $limitRaw) !== 1) {
            $this->error(sprintf(
                "--limit must be a non-negative integer (got '%s'). Nothing was read or written.",
                $limitRaw
            ));

            return self::FAILURE;
        }

        $limit = (int) $limitRaw;

        // Printed in both modes, before the first write, from the same trait the activation
        // runbook uses: the resolved lifetime, where it came from, the env-layer desync warning
        // and the change-lifetime remedy.
        $this->printActivationPreflight([
            'SCOPE' => 'only ads whose expires_at is still exactly the instant a previous run of ads:reconcile-moderation-visibility (or of this command) recorded. Ads with any payment that is not a provably unsettled attempt (pending/failed/expired), a later republished_at, any status other than active/expired, or no recorded operator grant are reported and never touched.',
            'DIRECTION' => 'this command only ever EXTENDS a lifetime, and it writes activation time + the lifetime above - never now + that lifetime. It cannot know whether that value is the one you intend: a resolved lifetime LARGER than the one the rows already hold IS applied, so confirm the ad_lifetime_days line above before --apply. A run reports 0 changes only when the resolved lifetime does not exceed what those rows already hold.',
        ]);

        if (! $apply) {
            $this->info('DRY RUN: no changes will be written. Re-run with --apply to persist.');
        }

        $this->line(sprintf(
            'Anchor: the instant each row\'s recorded grant was measured from (recorded expiry - recorded lifetime), + %d day(s) resolved now (never now + %d day(s)).',
            Ad::lifetimeDays(),
            Ad::lifetimeDays()
        ));

        // --limit is a budget for WRITES, not for rows inspected. A corrected row stays in the
        // candidate set for ever (its expires_at no longer matches its recorded grant, which is
        // exactly what makes it ineligible), and so do permanent safety exclusions; if either
        // consumed the budget, every later limited run would start at the same ids, correct
        // nothing and never reach the remaining ads — batching a large correction would stall.
        $actionable = 0;
        $changed = 0;
        $skipped = 0;
        $rows = [];
        $exclusions = [];
        $unverifiable = 0;

        $this->candidates()
            ->orderBy('id')
            ->chunkById(200, function (Collection $ads) use (
                $apply,
                $limit,
                &$actionable,
                &$changed,
                &$skipped,
                &$rows,
                &$exclusions,
                &$unverifiable
            ): bool {
                $decisions = $this->operatorDecisionsFor($ads->pluck('id')->all());
                $blockingPayments = $this->blockingPaymentStatuses($ads->pluck('id')->all());

                foreach ($ads as $ad) {
                    if ($limit > 0 && $actionable >= $limit) {
                        return false;
                    }

                    $verdict = $this->evaluate(
                        $ad,
                        $decisions->get($ad->id, collect()),
                        $blockingPayments->get($ad->id)
                    );

                    if ($verdict['reason'] !== null) {
                        $exclusions[] = [$ad->id, $verdict['reason']];
                        if ($verdict['reason'] === self::REASON_UNVERIFIABLE) {
                            $unverifiable++;
                        }

                        continue;
                    }

                    $row = [
                        $ad->id,
                        mb_strimwidth((string) $ad->title, 0, 38, '…'),
                        (string) $ad->user_id,
                        (string) $ad->status,
                        $verdict['current']->toDateTimeString(),
                        $verdict['target']->toDateTimeString(),
                    ];

                    // Counts against --limit only now that the row is known to be actionable.
                    $actionable++;

                    if (! $apply) {
                        $rows[] = $row;

                        continue;
                    }

                    $affected = $this->applyCorrection($ad, $verdict);

                    if ($affected === 1) {
                        $changed++;
                        // Only rows actually written are listed, so the table is a record of the
                        // change and not a record of the intent.
                        $rows[] = $row;
                    } else {
                        $skipped++;
                    }
                }

                return true;
            });

        if ($rows !== []) {
            $this->newLine();
            $this->table(
                ['Ad ID', 'Title', 'Seller', 'Status', 'Current expires_at', $apply ? 'New expires_at' : 'Planned expires_at'],
                $rows
            );
        }

        foreach ($exclusions as [$adId, $reason]) {
            $this->warn(sprintf('SKIPPED ad #%d: %s', $adId, $reason));
        }

        // Ads that carry an operator grant but sit in a status this command never writes are
        // excluded in SQL, so they never reach the per-row reporting above. Naming them here is
        // what stops an operator from reading "not listed" as "already correct": a paused or
        // seller-archived ad is a decision, not a correction target.
        $statusExcluded = $this->operatorGrantedAdsByStatus();
        if ($statusExcluded !== []) {
            $this->line(sprintf(
                'Not eligible by status (never touched by this command, by design): %s.',
                implode(', ', array_map(
                    fn (string $status, int $count): string => sprintf('%s=%d', $status, $count),
                    array_keys($statusExcluded),
                    array_values($statusExcluded)
                ))
            ));
        }

        if ($unverifiable > 0) {
            $this->warn(sprintf(
                '%d ad(s) were activated by a build that did not record the granted instant. They cannot be corrected by this command: without the recorded instant there is no way to distinguish the operator lifetime from a lifetime a seller bought or chose. Decide those rows explicitly.',
                $unverifiable
            ));
        }

        if ($skipped > 0) {
            $this->warn(sprintf(
                '%d row(s) were skipped because the row changed or the intended lifetime passed while the command was running. Re-run to re-evaluate.',
                $skipped
            ));
        }

        $this->newLine();

        if ($apply) {
            $this->info(sprintf(
                'Applied: %d ad(s) corrected, %d skipped (no longer matched), %d skipped by a safety rule.',
                $changed,
                $skipped,
                count($exclusions)
            ));

            // Always invalidated on --apply, even when this run corrected nothing. Corrections
            // commit row by row and the invalidation happens after the loop, so an interruption —
            // Ctrl-C, OOM, a deploy — or a throwing cache operation can leave the database ahead of
            // the public caches. A retry then finds no rows to correct; if invalidation were
            // conditional on $changed it would skip again and the corrected inventory would stay
            // dark until each cache's TTL expired, with nothing in the output to show it.
            $cacheFailures = $this->clearPublicCaches();

            if ($cacheFailures === []) {
                $this->line('Public catalog caches cleared.');
            } else {
                $this->warn(sprintf(
                    'Public catalog caches NOT fully cleared: %s failed. The database was corrected, so re-run --apply once the cache store is healthy.',
                    implode(', ', $cacheFailures)
                ));
            }
        } else {
            $this->info(sprintf(
                'Dry run complete. Would correct %d ad(s); %d skipped by a safety rule.',
                count($rows),
                count($exclusions)
            ));
        }

        return self::SUCCESS;
    }

    /**
     * The `expires_at` line for this command's preflight, replacing the trait's "now + lifetime"
     * default: a correction is anchored on the activation instant, so a single current-time
     * date would be a wrong number in an operator warning.
     */
    protected function preflightExpiryLine(): string
    {
        return sprintf(
            '  expires_at       : activation time + %d day(s), per row (NOT now + %d day(s); now + %d day(s) = %s is only the ceiling)',
            Ad::lifetimeDays(),
            Ad::lifetimeDays(),
            Ad::lifetimeDays(),
            $this->activationExpiry()->format('Y-m-d H:i:s T')
        );
    }

    /**
     * The payment statuses that provably mean NO money was received.
     *
     * This is a whitelist, not a list of paid statuses, and that inversion is the point. A
     * blacklist fails OPEN: `paid_review` — money received, promotion fulfilment parked for manual
     * remediation (PaymentController.php:373, and counted as revenue by EconomicsMetrics, the
     * monthly accounting export and PaymentController's own summary) — was not on it, so an ad the
     * seller had paid for stayed eligible. `payments.status` carries no database constraint, so a
     * provider-side status added later would reopen the same hole silently. Anything not provably
     * unsettled therefore disqualifies the ad and is reported for a human decision, which is the
     * fail-closed direction this command already documents: money changed hands ⇒ a human decides.
     *
     *   - `pending`  the checkout row exists and was never paid;
     *   - `failed`   the checkout could not be created or was rejected by the provider;
     *   - `expired`  an abandoned `pending` attempt closed by payments:expire-pending.
     *
     * `refunded` and chargebacks are deliberately NOT here: money was taken, and the case deserves
     * a human rather than a silent correction.
     */
    private const UNSETTLED_PAYMENT_STATUSES = ['pending', 'failed', 'expired'];

    /**
     * Ads that could possibly carry an operator-granted lifetime: real, still approved, and in a
     * status a bulk activation can leave behind, with a recorded activation on the audit trail.
     *
     * Everything else is excluded in SQL so it can never reach the per-row evaluation.
     */
    private function candidates(): Builder
    {
        return Ad::query()
            ->where('is_catalog_filler', false)
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->whereIn('status', self::ELIGIBLE_STATUSES)
            ->whereIn('id', AdModerationDecision::query()
                ->select('ad_id')
                ->where('metadata->reconciliation->command', ActivationLifetimeProvenance::RECONCILE_COMMAND));
    }

    /**
     * Ads that carry a bulk-activation record but are in a status this command never writes,
     * counted by status. Read-only reporting: the query is deliberately separate from
     * candidates() so widening the report can never widen the write set.
     *
     * @return array<string, int>
     */
    private function operatorGrantedAdsByStatus(): array
    {
        return Ad::query()
            ->where('is_catalog_filler', false)
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->whereNotIn('status', self::ELIGIBLE_STATUSES)
            ->whereIn('id', AdModerationDecision::query()
                ->select('ad_id')
                ->where('metadata->reconciliation->command', ActivationLifetimeProvenance::RECONCILE_COMMAND))
            ->groupBy('status')
            ->orderBy('status')
            ->select('status', DB::raw('count(*) as aggregate'))
            ->pluck('aggregate', 'status')
            ->map(fn ($count): int => (int) $count)
            ->all();
    }

    /**
     * Every decision that records an operator-granted lifetime, for a whole chunk of ads.
     *
     * @param  list<int>  $adIds
     * @return Collection<int, Collection<int, AdModerationDecision>>
     */
    private function operatorDecisionsFor(array $adIds): Collection
    {
        return AdModerationDecision::query()
            ->whereIn('ad_id', $adIds)
            ->orderBy('id')
            ->get()
            ->filter(fn (AdModerationDecision $decision): bool => ActivationLifetimeProvenance::isOperatorGrant($decision)
                || ActivationLifetimeProvenance::isBulkActivation($decision))
            ->groupBy('ad_id');
    }

    /**
     * Ads carrying at least one payment that is NOT provably unsettled — i.e. any row that may
     * represent money received — mapped to the status that blocks them.
     *
     * Deliberately any such payment rather than only renewal product codes or only the statuses
     * known to mean "paid": the narrowest safe subset is "money may have changed hands for this ad,
     * so a human decides". A false exclusion is reported with its status and costs a manual
     * decision; a false inclusion would overwrite something a seller paid for.
     *
     * @param  list<int>  $adIds
     * @return Collection<int, string> ad id => the blocking payment status
     */
    private function blockingPaymentStatuses(array $adIds): Collection
    {
        return DB::table('payments')
            ->whereIn('ad_id', $adIds)
            ->whereNotIn('status', self::UNSETTLED_PAYMENT_STATUSES)
            ->orderBy('id')
            ->get(['ad_id', 'status'])
            ->mapWithKeys(fn (object $row): array => [(int) $row->ad_id => (string) $row->status]);
    }

    /**
     * Single-source the per-row predicate so the batched scan above and the locked re-check in
     * applyCorrection() can never drift apart.
     */
    private function blockingPaymentExists(int $adId): bool
    {
        return DB::table('payments')
            ->where('ad_id', $adId)
            ->whereNotIn('status', self::UNSETTLED_PAYMENT_STATUSES)
            ->exists();
    }

    /**
     * Decide what to do with one ad, without writing anything.
     *
     * @param  Collection<int, AdModerationDecision>  $decisions
     * @return array{reason: ?string, current: ?Carbon, target: ?Carbon, anchor: ?Carbon, grant: ?AdModerationDecision}
     */
    private function evaluate(Ad $ad, Collection $decisions, ?string $blockingPaymentStatus): array
    {
        $skip = fn (string $reason): array => [
            'reason' => $reason, 'current' => null, 'target' => null, 'anchor' => null, 'grant' => null,
        ];

        // The most recent operator grant decides what the row's expires_at is expected to hold,
        // what instant that window began, and — for the republished_at comparison — when the
        // operator wrote it.
        $grant = $decisions
            ->filter(fn (AdModerationDecision $decision): bool => ActivationLifetimeProvenance::isOperatorGrant($decision))
            ->last();

        $recorded = $grant ? ActivationLifetimeProvenance::grantedExpiresAt($grant) : null;

        // Derived from the recorded grant, NOT from the decision's created_at: see
        // ActivationLifetimeProvenance::grantedAnchor(). A grant whose lifetime was not recorded
        // cannot yield an anchor, and is refused rather than guessed.
        $anchor = $grant ? ActivationLifetimeProvenance::grantedAnchor($grant) : null;

        if ($grant === null || $recorded === null || $anchor === null) {
            return $skip(self::REASON_UNVERIFIABLE);
        }

        $current = $ad->expires_at;

        if ($current === null) {
            return $skip('approved but holds no lifetime, which is not a state a bulk activation leaves behind');
        }

        // Reported before the instant comparison, and deliberately so: a paid renewal changes
        // BOTH expires_at and republished_at, so the instant check below would also exclude it —
        // but the operator needs the reason that says money changed hands, because that is the
        // fact that makes the row someone else's to decide rather than a bug to investigate.
        if ($blockingPaymentStatus !== null) {
            return $skip(sprintf(
                "a payment for this ad is '%s', which is not a provably unsettled attempt, so a human decides its lifetime",
                $blockingPaymentStatus
            ));
        }

        // Compared against the grant's own instant (the derived anchor), not the audit decision's
        // timestamp, so every guard here reads the same second as the eligibility check above.
        // The anchor is never later than that timestamp, so this is the stricter comparison.
        if ($ad->republished_at !== null && $ad->republished_at->gt($anchor)) {
            return $skip(sprintf(
                'republished_at (%s) is later than the operator grant (%s): a seller action or a paid renewal set this lifetime',
                $ad->republished_at->toDateTimeString(),
                $anchor->toDateTimeString()
            ));
        }

        // THE safety check: the stored lifetime must still be the instant an operator command
        // recorded. Any other writer (credited renewal, admin re-approval, re-moderation)
        // changes it, so this row is no longer ours to correct.
        if (! ActivationLifetimeProvenance::matches($current, $recorded)) {
            return $skip(sprintf(
                'expires_at (%s) is no longer the instant the operator grant recorded (%s): another path wrote this lifetime',
                $current->toDateTimeString(),
                $recorded->toDateTimeString()
            ));
        }

        // The intended lifetime is measured from the recorded grant's instant, so repeated runs
        // cannot creep the expiry forward and an unchanged lifetime reports 0 changes exactly.
        $target = $anchor->copy()->addDays(Ad::lifetimeDays());

        if ($target->lessThanOrEqualTo($current)) {
            return $skip(sprintf(
                'already holds at least the intended lifetime (%s): this command only ever extends',
                $current->toDateTimeString()
            ));
        }

        if ($target->lessThanOrEqualTo(now())) {
            return $skip(sprintf(
                'the intended lifetime already elapsed at %s, so correcting it would activate a non-indexable listing; decide this row explicitly',
                $target->toDateTimeString()
            ));
        }

        return ['reason' => null, 'current' => $current, 'target' => $target, 'anchor' => $anchor, 'grant' => $grant];
    }

    /**
     * @param  array{reason: ?string, current: Carbon, target: Carbon, anchor: Carbon, grant: AdModerationDecision}  $verdict
     */
    private function applyCorrection(Ad $ad, array $verdict): int
    {
        $current = $verdict['current'];
        $target = $verdict['target'];
        $anchor = $verdict['anchor'];

        return DB::transaction(function () use ($ad, $current, $target, $anchor): int {
            $fresh = Ad::query()->lockForUpdate()->find($ad->id);

            if (! $fresh || $fresh->expires_at === null || ! $fresh->expires_at->equalTo($current)) {
                return 0;
            }

            if ($fresh->is_catalog_filler || $fresh->ai_moderation_status !== Ad::MODERATION_APPROVED) {
                return 0;
            }

            if (! in_array($fresh->status, self::ELIGIBLE_STATUSES, true)) {
                return 0;
            }

            $grant = AdModerationDecision::query()
                ->where('ad_id', $fresh->id)
                ->orderByDesc('id')
                ->get()
                ->first(fn (AdModerationDecision $decision): bool => ActivationLifetimeProvenance::isOperatorGrant($decision));

            // Re-derived from the locked row's own grant, and re-checked against the SAME instant
            // the target was built from, so a grant recorded between evaluation and this write can
            // only make the guard stricter.
            $grantAnchor = $grant ? ActivationLifetimeProvenance::grantedAnchor($grant) : null;

            if ($grant === null
                || $grantAnchor === null
                || ! ActivationLifetimeProvenance::matches($fresh->expires_at, ActivationLifetimeProvenance::grantedExpiresAt($grant))) {
                return 0;
            }

            if ($fresh->republished_at !== null && $fresh->republished_at->gt($grantAnchor)) {
                return 0;
            }

            // Any payment that is not provably unsettled blocks, re-read inside the lock so a
            // payment that lands between evaluation and this write still stops the correction.
            // Paid-family must match the family the row was excluded by above.
            if ($this->blockingPaymentExists($fresh->id)) {
                return 0;
            }

            // The target comes from the activation anchor, not from now(), so `target > now()` is a
            // guard about the passage of time rather than about this row's state — and the
            // evaluation happened OUTSIDE this lock. If the transaction had to wait on a contended
            // row lock, the intended window can elapse while waiting, and writing then would set
            // `status = 'active'` with a past `expires_at`: an active but non-indexable listing,
            // dark again rather than corrected, and reported as corrected. Re-asserted here,
            // immediately before the write, exactly like every other guard above.
            if ($target->lessThanOrEqualTo(now())) {
                return 0;
            }

            // Captured before the write: this is what the audit row records as having changed.
            $previousStatus = (string) $fresh->status;

            // Conditional update re-asserting the exact predicate, so a concurrent re-stamp
            // between the read above and this write can only make it affect 0 rows.
            // expires_at is written through the query builder on purpose: the Ad model clamps
            // any expires_at to now + lifetimeDays(), which is a different number from this
            // command's activation-anchored target.
            $affected = DB::table('ads')
                ->where('id', $fresh->id)
                ->where('is_catalog_filler', false)
                ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
                ->whereIn('status', self::ELIGIBLE_STATUSES)
                ->where('expires_at', $current->toDateTimeString())
                ->update([
                    'status' => 'active',
                    'expires_at' => $target->toDateTimeString(),
                    'reminder_sent_at' => null,
                    'updated_at' => now(),
                ]);

            if ($affected !== 1) {
                return 0;
            }

            AdModerationDecision::create([
                'ad_id' => $fresh->id,
                'source' => 'system',
                'decision' => self::DECISION,
                'reason' => 'Corrección de vigencia: el anuncio se publicó con una vigencia distinta de la prevista.',
                'metadata' => [
                    'lifetime_correction' => ActivationLifetimeProvenance::correctionGrant($target, $current, $anchor) + [
                        'previous_status' => $previousStatus,
                        'status' => 'active',
                    ],
                ],
            ]);

            return 1;
        }, 3);
    }

    /**
     * Mirrors ReconcileModerationVisibility::clearPublicCaches(): the correction goes through a
     * conditional query-builder update, so AdObserver never fires and the cached catalog would
     * keep serving the old inventory.
     *
     * Best-effort per target rather than all-or-nothing: one throwing cache operation must not
     * leave the remaining keys stale, and a partial invalidation must be reported instead of
     * silently skipped. Returns the labels that could not be forgotten.
     *
     * @return list<string>
     */
    private function clearPublicCaches(): array
    {
        $failures = [];
        $forget = function (string $key, string $label) use (&$failures): void {
            try {
                Cache::forget($key);
            } catch (\Throwable) {
                $failures[] = $label;
            }
        };

        $forget('sitemap_xml', 'sitemap_xml');
        $forget('google_merchant_xml', 'google_merchant_xml');
        $forget('ads_featured_block', 'ads_featured_block');

        for ($page = 1; $page <= 10; $page++) {
            $forget("ads_index_page_{$page}", "ads_index_page_{$page}");
        }

        try {
            SitemapController::forgetAdsCache();
        } catch (\Throwable) {
            $failures[] = 'sitemap-ads generation';
        }

        return $failures;
    }
}

<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\SitemapController;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Repairs ads that are approved but still hidden.
 *
 * Background: the moderation pipeline parks an ad as `archived` while it is in
 * review. Some historical runs granted approval without ever publishing the ad,
 * leaving `status = 'archived'` together with `ai_moderation_status = 'approved'`
 * — a state in which the ad is approved yet invisible in the public catalog.
 *
 * This command is the safety net for the invariant "approved implies visible".
 * It is:
 *   - dry-run by default (nothing is written unless --apply is passed),
 *   - strictly scoped to is_catalog_filler = false, status = 'archived',
 *     ai_moderation_status = 'approved',
 *   - idempotent: a second --apply run reports 0 changes,
 *   - incapable of touching manual_review, failed or rejected ads.
 *
 * Safety filter: a seller may archive their own ad (PATCH /api/ads/{id}/status),
 * which writes only `status` and therefore also yields archived + approved. Those
 * ads must NOT be resurrected. Pipeline-archived ads have `expires_at = null`
 * because the moderation pipeline clears it when it hides an ad, while a
 * seller-archived ad keeps the remaining time on its listing. The default run
 * therefore skips rows with a non-null `expires_at`; --include-owner-archived
 * widens the run to the literal predicate above.
 */
class ReconcileModerationVisibility extends Command
{
    protected $signature = 'ads:reconcile-moderation-visibility
        {--dry-run : Report the activation plan without writing anything (default)}
        {--apply : Persist the activations}
        {--include-owner-archived : Also activate hidden approved ads that still have listing time left (seller-archived)}
        {--limit=0 : Maximum number of ads to process (0 = no limit)}';

    protected $description = 'Activate approved ads that are still hidden (dry-run by default, use --apply to persist)';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $explicitDryRun = (bool) $this->option('dry-run');
        $includeOwnerArchived = (bool) $this->option('include-owner-archived');

        if ($apply && $explicitDryRun) {
            $this->error('--apply and --dry-run are mutually exclusive.');

            return self::FAILURE;
        }

        $limit = max(0, (int) $this->option('limit'));

        if (! $apply) {
            $this->info('DRY RUN: no changes will be written. Re-run with --apply to persist.');
        }

        $this->line('Predicate: is_catalog_filler=false AND status=archived AND ai_moderation_status=approved');

        // Base predicate, exactly as specified, with the optional seller-archive
        // safety filter applied on top. The filter can only ever narrow the set,
        // so it can never activate an ad outside the predicate.
        $base = fn () => Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->when(! $includeOwnerArchived, fn ($query) => $query->whereNull('expires_at'));

        $skippedSellerArchived = $includeOwnerArchived
            ? 0
            : Ad::query()
                ->where('is_catalog_filler', false)
                ->where('status', 'archived')
                ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
                ->whereNotNull('expires_at')
                ->count();

        if ($skippedSellerArchived > 0) {
            $this->warn(sprintf(
                'Skipping %d ad(s) that still hold listing time (expires_at not null). These were archived by their seller and must not be republished. Use --include-owner-archived to include them.',
                $skippedSellerArchived
            ));
        }

        $total = $base()->count();

        $this->line(sprintf('Matched %d ad(s) to reconcile.', $total));

        if ($total === 0) {
            $this->info($apply
                ? 'Nothing to reconcile. The visibility invariant already holds.'
                : 'Nothing to reconcile. Dry run would change 0 ad(s).');

            return self::SUCCESS;
        }

        $processed = 0;
        $changed = 0;
        $skipped = 0;
        $rows = [];

        $base()->orderBy('id')->chunkById(200, function ($ads) use ($apply, $limit, &$processed, &$changed, &$skipped, &$rows): bool {
            foreach ($ads as $ad) {
                if ($limit > 0 && $processed >= $limit) {
                    return false;
                }
                $processed++;

                if ($apply) {
                    // Activation must mean publishing: the published attribute set
                    // (including a real, future expires_at) comes from the same
                    // single source of truth the other publish paths use, so a
                    // reconciled ad is genuinely indexable and not merely "active".
                    $publishAttributes = Ad::approvalOutcome(true);

                    // Conditional update: only a row still matching the exact
                    // predicate can change, which makes repeated runs a no-op and
                    // makes it impossible to activate any other moderation state.
                    $affected = DB::transaction(function () use ($ad, $publishAttributes): int {
                        $affected = Ad::query()
                            ->whereKey($ad->id)
                            ->where('is_catalog_filler', false)
                            ->where('status', 'archived')
                            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
                            ->update([
                                'status' => $publishAttributes['status'],
                                'ai_moderation_status' => $publishAttributes['ai_moderation_status'],
                                'expires_at' => $publishAttributes['expires_at'],
                                'reminder_sent_at' => $publishAttributes['reminder_sent_at'],
                                'updated_at' => now(),
                            ]);

                        if ($affected === 1) {
                            AdModerationDecision::create([
                                'ad_id' => $ad->id,
                                'source' => 'system',
                                'decision' => 'approved',
                                'reason' => 'Reconciliación de visibilidad: el anuncio estaba aprobado pero oculto.',
                                'metadata' => [
                                    'reconciliation' => [
                                        'command' => 'ads:reconcile-moderation-visibility',
                                        'activation_mode' => 'automatic_reconciliation',
                                        'previous_status' => 'archived',
                                        'previous_ai_moderation_status' => Ad::MODERATION_APPROVED,
                                    ],
                                ],
                            ]);
                        }

                        return $affected;
                    }, 3);

                    if ($affected === 1) {
                        $changed++;
                    } else {
                        $skipped++;
                    }

                    continue;
                }

                $rows[] = [
                    $ad->id,
                    mb_strimwidth((string) $ad->title, 0, 42, '…'),
                    (string) $ad->user_id,
                    (string) $ad->ai_moderation_status,
                    (string) $ad->status.' → active',
                ];
            }

            return true;
        });

        if (! $apply) {
            $this->newLine();
            $this->table(
                ['Ad ID', 'Title', 'Seller', 'AI status', 'Planned status'],
                $rows
            );
        }

        $this->newLine();

        if ($apply) {
            $this->info(sprintf(
                'Applied: %d ad(s) activated, %d skipped (no longer matched).',
                $changed,
                $skipped
            ));

            if ($changed > 0) {
                $this->clearPublicCaches();
                $this->line('Public catalog caches cleared.');
            }
        } else {
            $this->info(sprintf('Dry run complete. Would activate %d ad(s).', $processed));
        }

        return self::SUCCESS;
    }

    private function clearPublicCaches(): void
    {
        Cache::forget('sitemap_xml');
        // Activation goes through a conditional query-builder update, so AdObserver never fires
        // and the canonical ads sitemap would keep its cached inventory for up to 30 minutes.
        SitemapController::forgetAdsCache();
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }
    }
}

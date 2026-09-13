<?php

namespace Tests\Feature;

use App\Http\Middleware\EnforcePaidAdRenewal;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use App\Services\AdRenewalService;
use App\Support\ActivationLifetimeProvenance;
use App\Support\ListingIndexability;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Behaviour of ads:correct-activation-lifetime — the supported way to fix the lifetime of ads
 * that ads:reconcile-moderation-visibility published with the wrong one.
 *
 * The load-bearing tests here are the NEGATIVE controls: a lifetime that came from the seller
 * (paid renewal, credited renewal, republish) or from the seller's own decision (archive, pause)
 * must come out of a run byte-identical. Those are asserted against every column of the row, not
 * against one field, so an accidental extra write cannot pass.
 */
class CorrectActivationLifetimeTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Anuncio de prueba',
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'is_catalog_filler' => false,
            'attributes' => ['subcategory' => 'general'],
        ], $overrides)));
    }

    /**
     * The state the operator's runbook produces: an approved ad hidden by the moderation
     * pipeline, which the activation command then publishes.
     */
    private function hiddenApprovedAd(User $seller, array $overrides = []): Ad
    {
        return $this->createAd($seller, array_merge([
            'status' => 'archived',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => null,
        ], $overrides));
    }

    /**
     * Run the documented activation with a given lifetime and return the anchor it recorded.
     */
    private function activate(array $ads, int $days): Carbon
    {
        config(['marketplace.ad_lifetime_days' => $days]);
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));

        foreach ($ads as $ad) {
            $ad->refresh();
        }

        return Carbon::parse(now()->toDateTimeString());
    }

    /**
     * Every column of every row the command can write, so "nothing else changed" is asserted
     * against the whole surface rather than one field.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function writeSurface(): array
    {
        $dump = fn (string $table): array => DB::table($table)->orderBy('id')->get()
            ->map(fn (object $row): array => (array) $row)->all();

        return [
            'ads' => $dump('ads'),
            'ad_moderation_decisions' => $dump('ad_moderation_decisions'),
        ];
    }

    private function adRow(int $id): array
    {
        return (array) DB::table('ads')->where('id', $id)->first();
    }

    // ---------------------------------------------------------------------
    // The provenance the correction depends on
    // ---------------------------------------------------------------------

    public function test_activation_records_the_instant_it_granted(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);

        $this->activate([$ad], 7);

        $decision = AdModerationDecision::query()
            ->where('ad_id', $ad->id)
            ->where('metadata->reconciliation->command', ActivationLifetimeProvenance::RECONCILE_COMMAND)
            ->firstOrFail();

        $this->assertSame(7, $decision->metadata['reconciliation']['granted_lifetime_days']);
        $this->assertTrue(
            ActivationLifetimeProvenance::grantedExpiresAt($decision)->equalTo($ad->fresh()->expires_at),
            'The recorded instant must be exactly the expires_at the activation stamped.'
        );
        $this->assertTrue(
            ActivationLifetimeProvenance::matches($ad->fresh()->expires_at, ActivationLifetimeProvenance::grantedExpiresAt($decision))
        );
    }

    public function test_recording_the_grant_does_not_change_what_activation_writes(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);

        $this->activate([$ad], 7);

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertSame(
            now()->addDays(7)->toDateTimeString(),
            $ad->expires_at?->toDateTimeString(),
            'The activation outcome must be unchanged: now + the resolved lifetime.'
        );
        $this->assertTrue(ListingIndexability::isIndexable($ad));
    }

    // ---------------------------------------------------------------------
    // The correction itself
    // ---------------------------------------------------------------------

    public function test_it_extends_an_active_ad_that_was_activated_with_the_wrong_lifetime(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $anchor = $this->activate([$ad], 7);

        // Three days later the operator corrects the lifetime to 90 days.
        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);

        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(
            $anchor->copy()->addDays(90)->toDateTimeString(),
            $ad->expires_at?->toDateTimeString(),
            'The corrected lifetime is measured from the activation, not from now().'
        );
        $this->assertTrue(ListingIndexability::isIndexable($ad));
    }

    public function test_it_restores_an_activated_ad_whose_short_window_already_lapsed(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $anchor = $this->activate([$ad], 7);

        // The daily expiry task runs after the wrong window ends: the inventory goes dark.
        Carbon::setTestNow('2026-08-13 12:00:00');
        $this->assertSame(0, Artisan::call('ads:expire'));
        $this->assertSame('expired', $ad->fresh()->status);
        $this->assertFalse(ListingIndexability::isIndexable($ad->fresh()));
        $this->assertTrue(
            $ad->fresh()->expires_at->equalTo($anchor->copy()->addDays(7)),
            'Expiry flips only the status; the granted instant must survive it.'
        );

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $ad->refresh();
        $this->assertSame('active', $ad->status, 'A lapsed but operator-owned listing must be restored.');
        $this->assertSame($anchor->copy()->addDays(90)->toDateTimeString(), $ad->expires_at?->toDateTimeString());
        $this->assertTrue(ListingIndexability::isIndexable($ad));
        $this->assertNull($ad->reminder_sent_at, 'A new lifetime restarts the reminder cycle.');
    }

    public function test_a_second_run_reports_zero_changes_and_writes_nothing(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());

        $before = $this->writeSurface();
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $this->assertStringContainsString('Applied: 0 ad(s) corrected', Artisan::output());
        $this->assertSame($before, $this->writeSurface(), 'A second --apply must write nothing at all.');

        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime'));
        $this->assertStringContainsString('Would correct 0 ad(s)', Artisan::output());
    }

    public function test_dry_run_reports_the_plan_and_writes_nothing(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);

        $before = $this->writeSurface();
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime'));
        $output = Artisan::output();

        $this->assertStringContainsString('DRY RUN', $output);
        $this->assertStringContainsString('Would correct 1 ad(s)', $output);
        $this->assertStringContainsString((string) $ad->id, $output);
        $this->assertSame($before, $this->writeSurface(), 'A dry run must not write.');
        $this->assertSame('active', $ad->fresh()->status);
        $this->assertSame(
            now()->subDays(3)->addDays(7)->toDateTimeString(),
            $ad->fresh()->expires_at?->toDateTimeString()
        );
    }

    public function test_it_prints_the_shared_lifetime_preflight_before_writing_in_both_modes(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);
        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);

        foreach ([false, true] as $apply) {
            $exit = Artisan::call('ads:correct-activation-lifetime', $apply ? ['--apply' => true] : []);
            $output = Artisan::output();

            $this->assertSame(0, $exit);
            $this->assertStringContainsString('PREFLIGHT', $output);
            $this->assertStringContainsString('ad_lifetime_days : 90 day(s)', $output);
            $this->assertStringContainsString('expires_at       : activation time + 90 day(s), per row', $output);
            $this->assertStringContainsString('SCOPE', $output);
            $this->assertStringContainsString('DIRECTION', $output);
        }
    }

    public function test_apply_and_dry_run_together_are_rejected(): void
    {
        $seller = User::factory()->create();
        $this->hiddenApprovedAd($seller);

        $this->assertSame(1, Artisan::call(
            'ads:correct-activation-lifetime',
            ['--apply' => true, '--dry-run' => true]
        ));
    }

    public function test_limit_caps_the_work_and_leaves_the_rest_for_a_later_run(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ads = [$this->hiddenApprovedAd($seller), $this->hiddenApprovedAd($seller), $this->hiddenApprovedAd($seller)];
        $this->activate($ads, 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--limit' => 1, '--apply' => true]));
        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());

        $corrected = Ad::query()->where('expires_at', now()->subDays(3)->addDays(90))->count();
        $this->assertSame(1, $corrected);

        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $this->assertSame(3, Ad::query()->where('expires_at', now()->subDays(3)->addDays(90))->count());
    }

    /**
     * --limit is a budget for WRITES, not for rows inspected. A corrected row stays in the
     * candidate set (its expires_at no longer matches its recorded grant, which is what makes it
     * permanently ineligible), and so do permanent safety exclusions — if either consumes the
     * budget, every later limited run starts at the same ids, corrects nothing and never reaches
     * the remaining ads. Batching a large correction would stall forever.
     */
    public function test_batched_limited_runs_advance_past_already_resolved_rows(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ads = [$this->hiddenApprovedAd($seller), $this->hiddenApprovedAd($seller), $this->hiddenApprovedAd($seller)];
        $this->activate($ads, 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);
        $target = now()->subDays(3)->addDays(90);

        for ($run = 1; $run <= 3; $run++) {
            $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--limit' => 1, '--apply' => true]));
            $this->assertStringContainsString(
                'Applied: 1 ad(s) corrected',
                Artisan::output(),
                "limited run {$run} made no progress"
            );
            $this->assertSame($run, Ad::query()->where('expires_at', $target)->count(), "after run {$run}");
        }

        $this->assertSame(3, Ad::query()->where('expires_at', $target)->count());
    }

    public function test_a_limited_dry_run_plans_the_next_row_and_never_consumes_the_work(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $first = $this->hiddenApprovedAd($seller);
        $second = $this->hiddenApprovedAd($seller);
        $this->activate([$first, $second], 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);

        // Correct the first row, so the next limited run faces a resolved row before it.
        Artisan::call('ads:correct-activation-lifetime', ['--limit' => 1, '--apply' => true]);
        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());

        // The dry run must move PAST the resolved row and plan the remaining one. Reporting
        // "0" here is the stalled state: the resolved row ate the batch budget.
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--limit' => 1]));
        $planned = Artisan::output();
        $this->assertStringContainsString('Would correct 1 ad(s)', $planned);
        $this->assertStringContainsString('| '.$second->id.' ', $planned, 'The remaining row is the one planned.');

        // A dry run never consumes the work: the same single row is still the next one.
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--limit' => 1]));
        $this->assertStringContainsString('Would correct 1 ad(s)', Artisan::output());
        $this->assertSame($second->id, (int) $second->fresh()->id);
        $this->assertNotSame(
            now()->subDays(3)->addDays(90)->toDateTimeString(),
            $second->fresh()->expires_at?->toDateTimeString(),
            'A dry run must not write.'
        );
    }

    // ---------------------------------------------------------------------
    // NEGATIVE CONTROLS: lifetimes that are not the operator's
    // ---------------------------------------------------------------------

    public function test_a_paid_renewal_is_never_touched(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        // The wrong window lapses, then the seller actually pays to renew.
        Carbon::setTestNow('2026-08-13 12:00:00');
        Artisan::call('ads:expire');
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $seller->id,
            'ad_id' => $ad->id,
            'clip_checkout_id' => 'clip_test_'.$ad->id,
            'amount' => 49,
            'description' => 'Renovación de anuncio por 7 días',
            'product_code' => 'ad_renewal_7_days',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $expires = app(AdRenewalService::class)->fulfill(DB::table('payments')->where('id', $paymentId)->first());

        $this->assertNotNull($expires, 'The paid renewal must have been fulfilled for this control to mean anything.');
        $this->assertSame('paid', DB::table('payments')->where('id', $paymentId)->value('status'));
        $paidRow = $this->adRow($ad->id);
        $this->assertSame('active', $paidRow['status']);

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $output = Artisan::output();

        $this->assertSame($paidRow, $this->adRow($ad->id), 'A paid renewal must be byte-identical after the run.');
        $this->assertStringContainsString(
            sprintf('SKIPPED ad #%d: a payment for this ad is marked paid', $ad->id),
            $output
        );
    }

    /**
     * The hardest case, and the one that forces the recorded-instant comparison: this renewal
     * path writes `status` and `expires_at` and NOTHING else — no payments row, no
     * republished_at, no republish_count — so a guard built on those signals would overwrite it.
     */
    public function test_a_credited_renewal_without_any_payment_row_is_never_touched(): void
    {
        $this->withoutMiddleware(EnforcePaidAdRenewal::class);
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create(['referral_credits' => 5]);
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-13 12:00:00');
        Artisan::call('ads:expire');
        $this->assertSame('expired', $ad->fresh()->status);

        $this->actingAs($seller, 'sanctum')
            ->putJson("/api/ads/{$ad->id}/renew")
            ->assertOk();

        $renewed = $this->adRow($ad->id);
        $this->assertSame('active', $renewed['status']);
        $this->assertNull($renewed['republished_at'], 'This path leaves republished_at null by design.');
        $this->assertSame(0, (int) $renewed['republish_count']);
        $this->assertSame(0, DB::table('payments')->where('ad_id', $ad->id)->count());

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($renewed, $this->adRow($ad->id), 'A credited renewal must survive byte-identical.');
        $this->assertStringContainsString(
            sprintf('SKIPPED ad #%d: expires_at', $ad->id),
            Artisan::output()
        );
    }

    public function test_a_seller_republish_is_never_touched(): void
    {
        $this->withoutMiddleware(EnforcePaidAdRenewal::class);
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-13 12:00:00');
        Artisan::call('ads:expire');
        $this->actingAs($seller, 'sanctum')
            ->postJson("/api/ads/{$ad->id}/republish")
            ->assertOk();

        $republished = $this->adRow($ad->id);
        $this->assertSame(1, (int) $republished['republish_count']);

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($republished, $this->adRow($ad->id));
        $this->assertStringContainsString('is later than the operator grant', Artisan::output());
    }

    public function test_a_seller_archived_or_paused_ad_is_never_touched_and_is_reported(): void
    {
        $this->withoutMiddleware(EnforcePaidAdRenewal::class);
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $archived = $this->hiddenApprovedAd($seller);
        $paused = $this->hiddenApprovedAd($seller);
        $this->activate([$archived, $paused], 7);

        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/ads/{$archived->id}/status", ['status' => 'archived'])
            ->assertOk();
        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/ads/{$paused->id}/status", ['status' => 'paused'])
            ->assertOk();

        $archivedRow = $this->adRow($archived->id);
        $pausedRow = $this->adRow($paused->id);

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $output = Artisan::output();

        $this->assertSame($archivedRow, $this->adRow($archived->id), 'A seller decision must not be undone.');
        $this->assertSame($pausedRow, $this->adRow($paused->id), 'A seller decision must not be undone.');
        $this->assertStringContainsString('Not eligible by status', $output);
        $this->assertStringContainsString('archived=1', $output);
        $this->assertStringContainsString('paused=1', $output);
    }

    /**
     * Production already holds three real `expired` + `approved` ads that no operator command
     * ever activated. They are seller inventory that ran its natural course, and a predicate
     * widened to `status = 'expired'` (Option A / Option B in the brief) would resurrect them.
     */
    public function test_an_expired_approved_ad_without_operator_provenance_is_never_touched(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $expires = now()->subDays(2);
        $legacy = $this->createAd($seller, [
            'status' => 'expired',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => $expires,
            'republished_at' => $expires->copy()->subDays(7),
            'reminder_sent_at' => $expires->copy()->subDays(3),
        ]);
        $before = $this->adRow($legacy->id);

        // The observable effect of a widened predicate, asserted so the rejection is evidenced.
        $this->assertSame(1, Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'expired')
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->count());

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($before, $this->adRow($legacy->id), 'Untouched seller inventory must stay untouched.');
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime'));
        $this->assertStringContainsString('Would correct 0 ad(s)', Artisan::output());
    }

    public function test_a_legacy_activation_without_a_recorded_instant_is_reported_and_never_touched(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        // An activation performed by a build older than this change: the audit row exists but
        // records no instant, so the operator lifetime cannot be told from a seller's.
        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->firstOrFail();
        $metadata = $decision->metadata;
        unset($metadata['reconciliation'][ActivationLifetimeProvenance::GRANTED_EXPIRES_AT], $metadata['reconciliation']['granted_lifetime_days']);
        DB::table('ad_moderation_decisions')->where('id', $decision->id)->update(['metadata' => json_encode($metadata)]);

        Carbon::setTestNow('2026-08-13 12:00:00');
        Artisan::call('ads:expire');
        $before = $this->adRow($ad->id);

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $output = Artisan::output();

        $this->assertSame($before, $this->adRow($ad->id));
        $this->assertStringContainsString('did not record the granted instant', $output);
        $this->assertStringContainsString('Decide those rows explicitly', $output);
    }

    // ---------------------------------------------------------------------
    // One-way guards and anchoring
    // ---------------------------------------------------------------------

    public function test_it_only_ever_extends_and_never_shortens_a_live_listing(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 90);
        $longExpiry = $this->adRow($ad->id);

        // The operator resolves a SHORTER lifetime than the one already granted.
        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 7]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($longExpiry, $this->adRow($ad->id), 'Shortening is not this command\'s decision.');
        $this->assertStringContainsString('this command only ever extends', Artisan::output());
    }

    public function test_it_never_activates_a_listing_whose_intended_lifetime_already_elapsed(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-13 12:00:00');
        Artisan::call('ads:expire');
        $before = $this->adRow($ad->id);

        // 14 days of intended lifetime, measured from an activation 20 days ago: the target is
        // still AHEAD of what was granted, but the intended window is already over.
        Carbon::setTestNow('2026-08-25 12:00:00');
        config(['marketplace.ad_lifetime_days' => 14]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($before, $this->adRow($ad->id), 'Never activate into a non-indexable past.');
        $this->assertStringContainsString('already elapsed', Artisan::output());
        $this->assertSame('expired', $ad->fresh()->status);
    }

    public function test_re_correcting_uses_the_activation_anchor_so_runs_cannot_creep_the_expiry(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $anchor = $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);
        Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]);
        $this->assertSame($anchor->copy()->addDays(90)->toDateTimeString(), $ad->fresh()->expires_at?->toDateTimeString());

        // A week later the operator decides 180 days. Still anchored on the activation.
        Carbon::setTestNow('2026-08-15 12:00:00');
        config(['marketplace.ad_lifetime_days' => 180]);
        Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]);

        $this->assertSame(
            $anchor->copy()->addDays(180)->toDateTimeString(),
            $ad->fresh()->expires_at?->toDateTimeString(),
            'The anchor is the activation, never the previous correction or now().'
        );

        Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]);
        $this->assertStringContainsString('Applied: 0 ad(s) corrected', Artisan::output());
    }

    /**
     * An ad can be bulk-activated more than once: the seller archives it, and an operator
     * republishes it with `--include-owner-archived`, which writes a SECOND grant and a second
     * activation decision. The intended lifetime must then be measured from the activation that
     * granted the window the ad is actually holding — anchoring on the superseded one
     * under-extends it, and skips the row entirely once the old anchor plus the intended
     * lifetime is no longer ahead of the current expiry.
     */
    public function test_the_anchor_follows_the_activation_that_granted_the_current_lifetime(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);                                  // first activation

        // The next day the seller archives it, while its window is still running.
        Carbon::setTestNow('2026-08-06 12:00:00');
        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/ads/{$ad->id}/status", ['status' => 'archived'])
            ->assertOk();
        $this->assertSame('archived', $ad->fresh()->status);

        // A month later an operator republishes it with --include-owner-archived: a SECOND
        // bulk activation, with its own grant, and its own (later) anchor.
        Carbon::setTestNow('2026-09-04 12:00:00');
        $secondAnchor = Carbon::parse(now()->toDateTimeString());
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', [
            '--apply' => true,
            '--include-owner-archived' => true,
        ]));
        $ad->refresh();
        $this->assertSame('active', $ad->status, 'The second reconciliation must republish the ad.');
        $this->assertTrue($ad->expires_at->equalTo($secondAnchor->copy()->addDays(7)));
        $this->assertSame(
            2,
            AdModerationDecision::query()
                ->where('ad_id', $ad->id)
                ->where('metadata->reconciliation->command', ActivationLifetimeProvenance::RECONCILE_COMMAND)
                ->count(),
            'The ad must carry two recorded activations for this control to mean anything.'
        );

        Carbon::setTestNow('2026-09-06 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());
        $this->assertSame(
            $secondAnchor->copy()->addDays(90)->toDateTimeString(),
            $ad->fresh()->expires_at?->toDateTimeString(),
            'The anchor must be the most recent activation that granted the current lifetime.'
        );
    }

    public function test_the_resolved_lifetime_governs_and_a_wrong_one_writes_nothing_rather_than_a_clamped_date(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);

        Carbon::setTestNow('2026-08-08 12:00:00');
        // The operator never fixed the env, so the intended lifetime is still the granted one.
        config(['marketplace.ad_lifetime_days' => 7]);
        $before = $this->adRow($ad->id);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($before, $this->adRow($ad->id));
        $this->assertStringContainsString('Applied: 0 ad(s) corrected', Artisan::output());
    }

    /**
     * The "0 changes" outcome is NOT a guarantee that a wrong resolved value is harmless. A
     * resolved lifetime LARGER than the one the rows already hold is written: the command cannot
     * know it was unintended. The apply-time guidance must say that, because an operator who
     * believes the opposite will persist a second wrong lifetime instead of fixing the env.
     */
    public function test_a_larger_resolved_lifetime_is_applied_and_the_preflight_says_so(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $anchor = $this->activate([$ad], 7);

        // A stale/incorrect configuration resolves 180 days when 90 was intended.
        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 180]);

        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime'));
        $preflight = Artisan::output();
        $text = (string) preg_replace('/\s+/', ' ', $preflight);

        $this->assertStringContainsString(
            'It cannot know whether that value is the one you intend',
            $text,
            'The preflight must not promise a no-op it cannot deliver.'
        );
        $this->assertStringContainsString('IS applied', $text);
        $this->assertStringNotContainsString('reports 0 changes rather than writing a wrong date', $text);

        // And the behaviour the corrected text describes: the larger value really is written.
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));
        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());
        $this->assertSame(
            $anchor->copy()->addDays(180)->toDateTimeString(),
            $ad->fresh()->expires_at?->toDateTimeString()
        );
    }

    public function test_it_writes_an_audit_row_and_clears_the_public_caches_on_apply(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $this->activate([$ad], 7);
        Carbon::setTestNow('2026-08-08 12:00:00');
        config(['marketplace.ad_lifetime_days' => 90]);

        Cache::spy();
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $decision = AdModerationDecision::query()
            ->where('ad_id', $ad->id)
            ->where('decision', 'lifetime_corrected')
            ->firstOrFail();

        $this->assertSame('system', $decision->source);
        $this->assertSame('active', $decision->metadata['lifetime_correction']['status']);
        $this->assertSame(
            now()->subDays(3)->addDays(7)->toDateTimeString(),
            Carbon::parse($decision->metadata['lifetime_correction']['previous_expires_at'])->toDateTimeString(),
            'The audit row records the wrong lifetime that was replaced.'
        );
        $this->assertSame(90, $decision->metadata['lifetime_correction']['lifetime_days']);

        // A query-builder update never fires AdObserver, so the cached catalog must be dropped.
        Cache::shouldHaveReceived('forget')->with('sitemap_xml')->atLeast()->once();
        Cache::shouldHaveReceived('forget')->with('google_merchant_xml')->atLeast()->once();
    }

    public function test_catalog_fillers_and_unapproved_ads_are_never_touched(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $seller = User::factory()->create();
        $filler = $this->hiddenApprovedAd($seller, ['is_catalog_filler' => true]);
        $manual = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'manual_review', 'expires_at' => null,
        ]);
        $approved = $this->hiddenApprovedAd($seller);
        $this->activate([$approved], 7);

        $fillerRow = $this->adRow($filler->id);
        $manualRow = $this->adRow($manual->id);

        config(['marketplace.ad_lifetime_days' => 90]);
        $this->assertSame(0, Artisan::call('ads:correct-activation-lifetime', ['--apply' => true]));

        $this->assertSame($fillerRow, $this->adRow($filler->id));
        $this->assertSame($manualRow, $this->adRow($manual->id));
        $this->assertStringContainsString('Applied: 1 ad(s) corrected', Artisan::output());
    }
}

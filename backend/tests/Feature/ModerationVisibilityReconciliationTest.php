<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Guards the moderation visibility invariant:
 * an ad whose ai_moderation_status is 'approved' must be publicly visible.
 */
class ModerationVisibilityReconciliationTest extends TestCase
{
    use RefreshDatabase;

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

    private function hiddenApprovedAd(User $seller, array $overrides = []): Ad
    {
        return $this->createAd($seller, array_merge([
            'status' => 'archived',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => null,
        ], $overrides));
    }

    // ---------------------------------------------------------------------
    // Approval mapping: the structural guarantee
    // ---------------------------------------------------------------------

    /**
     * Assert the shared "indexable listing" contract.
     *
     * The authoritative predicate is App\Support\ListingIndexability, which the ads
     * sitemap generator and the SEO shell both use. It is not on this branch yet
     * (it arrives with the sitemap fix), so while it is absent we assert the
     * identical contract conditions here rather than defining a second predicate
     * in application code. Once the shared class lands, this helper delegates to it
     * automatically, so activation can never drift away from indexability.
     */
    private function assertIndexable(Ad $ad): void
    {
        $ad = $ad->fresh();

        if (class_exists(\App\Support\ListingIndexability::class)) {
            $this->assertTrue(
                \App\Support\ListingIndexability::isIndexable($ad),
                'Activated ad must satisfy the shared ListingIndexability predicate.'
            );

            return;
        }

        $this->assertFalse((bool) $ad->is_catalog_filler, 'Indexable listings must not be catalog fillers.');
        $this->assertSame('active', $ad->status, 'Indexable listings must be publicly visible.');
        $this->assertNotNull($ad->expires_at, 'Indexable listings must have a real expires_at.');
        $this->assertTrue($ad->expires_at->isFuture(), 'Indexable listings must have a future expires_at.');
    }

    public function test_approval_outcome_publishes_with_a_future_lifetime(): void
    {
        $published = Ad::approvalOutcome(true);

        $this->assertSame('active', $published['status']);
        $this->assertSame(Ad::MODERATION_APPROVED, $published['ai_moderation_status']);
        $this->assertNotNull($published['expires_at'], 'Publishing must set a real lifetime.');
        $this->assertTrue($published['expires_at']->isFuture(), 'Publishing must set a future lifetime.');
        $this->assertTrue(
            $published['expires_at']->lessThanOrEqualTo(now()->addDays(Ad::lifetimeDays())),
            'Publishing must use the canonical Ad::freshExpiry() lifetime.'
        );

        $deferred = Ad::approvalOutcome(false);
        $this->assertNull($deferred['expires_at'], 'A deferred approval must not hold a lifetime.');
    }

    public function test_every_publish_path_produces_an_indexable_listing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        // 1. Admin approval of a fresh submission.
        $pending = $this->createAd($seller, ['status' => 'pending']);
        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$pending->id}/decision", ['decision' => 'approved'])
            ->assertOk();
        $this->assertIndexable($pending);

        // 2. Reconciliation of an approved-but-hidden ad.
        $hidden = $this->hiddenApprovedAd($seller);
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $this->assertIndexable($hidden);

        // 3. The published attribute set the AI job writes on approval.
        $aiPublished = $this->createAd($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'expires_at' => null,
        ]);
        $aiPublished->forceFill(Ad::approvalOutcome(true))->saveQuietly();
        $this->assertIndexable($aiPublished);
    }

    public function test_deferred_approval_is_not_indexable(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'expires_at' => null,
            'moderation_submitted_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", ['decision' => 'approved'])
            ->assertOk();

        $ad->refresh();
        $this->assertSame('archived', $ad->status, 'A deferred approval must stay hidden.');
        $this->assertNull($ad->expires_at, 'A deferred approval must not hold a lifetime.');
        $this->assertNotSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
    }

    public function test_approval_outcome_never_pairs_approved_with_a_hidden_status(): void
    {
        $published = Ad::approvalOutcome(true);
        $this->assertSame('active', $published['status']);
        $this->assertSame(Ad::MODERATION_APPROVED, $published['ai_moderation_status']);

        $deferred = Ad::approvalOutcome(false);
        $this->assertSame('archived', $deferred['status']);
        $this->assertNotSame(
            Ad::MODERATION_APPROVED,
            $deferred['ai_moderation_status'],
            'An approval that is not published must not be labelled approved.'
        );
        $this->assertSame(Ad::MODERATION_REACTIVATION_PENDING, $deferred['ai_moderation_status']);
    }

    public function test_admin_approval_of_re_reviewed_archived_ad_never_leaves_approved_but_hidden(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'expires_at' => null,
            'moderation_submitted_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", ['decision' => 'approved'])
            ->assertOk();

        $ad->refresh();

        // The invariant: no ad may claim approval while staying hidden.
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
        $this->assertNotSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);

        // The approval is still recorded, and the seller confirmation flow works.
        $this->assertSame(Ad::MODERATION_REACTIVATION_PENDING, $ad->ai_moderation_status);
        $this->assertSame('archived', $ad->status);
        $this->assertTrue($ad->isSellerConfirmationReactivationEligible());

        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest('id')->firstOrFail();
        $this->assertSame('approved', $decision->decision);
        $this->assertSame('seller_confirmation_required', $decision->metadata['activation_mode']);
    }

    public function test_admin_approval_of_fresh_pending_ad_publishes_and_satisfies_the_invariant(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, ['status' => 'pending']);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", ['decision' => 'approved'])
            ->assertOk();

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertTrue($ad->isApprovedAndVisible());
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
    }

    // ---------------------------------------------------------------------
    // Re-queue must not downgrade a fresh submission's activation intent
    // ---------------------------------------------------------------------

    public function test_requeue_preserves_fresh_submission_activation_intent(): void
    {
        config(['services.ollama.chat_model' => 'test-model']);
        Queue::fake();

        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'expires_at' => null,
            'moderation_submitted_at' => now()->subHours(3),
        ]);
        // updated_at is not mass assignable; the stuck-queue branch requires it
        // to be older than 15 minutes.
        DB::table('ads')->where('id', $ad->id)->update(['updated_at' => now()->subMinutes(30)]);

        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => ['rollout' => ['activate_on_human_approval' => true]],
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ]);
        // A later re-queue recorded the degraded intent. Sticky intent must win.
        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => ['rollout' => ['activate_on_human_approval' => false]],
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $this->assertSame(0, Artisan::call('ads:moderate-pending'));

        Queue::assertPushed(
            ModerateAdWithAI::class,
            fn (ModerateAdWithAI $job): bool => $job->adId === $ad->id && $job->activateOnApproval === true
        );
    }

    // ---------------------------------------------------------------------
    // AI outcomes must never publish by themselves (assist-only rollout)
    // ---------------------------------------------------------------------

    public function test_ai_rejection_never_publishes_the_ad(): void
    {
        $ad = $this->queuedAdForAi();

        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'rejected', 'reason' => 'Contenido prohibido.',
                'confidence' => 0.95, 'flags' => ['prohibited_item'],
                'provider' => 'ollama', 'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local', 'gateway_version' => '0.2.0', 'latency_ms' => 10,
            ]),
        ]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $ad->refresh();
        $this->assertNotSame('active', $ad->status);
        $this->assertNotSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
    }

    public function test_ai_gateway_failure_keeps_the_ad_hidden_and_never_approved(): void
    {
        $ad = $this->queuedAdForAi();

        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response([], 503)]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('failed', $ad->ai_moderation_status);
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
    }

    public function test_ai_approval_without_publish_intent_becomes_reactivation_pending(): void
    {
        // The gateway proposes approval; assist-only still routes it to a human,
        // so the ad must remain hidden and must never be labelled approved.
        $ad = $this->queuedAdForAi();

        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'approved', 'reason' => 'Contenido permitido.',
                'confidence' => 0.99, 'flags' => [],
                'provider' => 'ollama', 'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local', 'gateway_version' => '0.2.0', 'latency_ms' => 10,
            ]),
        ]);

        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertNotSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
    }

    private function queuedAdForAi(): Ad
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);

        $seller = User::factory()->create();

        return $this->createAd($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'expires_at' => null,
            'moderation_submitted_at' => now(),
        ]);
    }

    // ---------------------------------------------------------------------
    // Reconciliation command
    // ---------------------------------------------------------------------

    public function test_dry_run_reports_the_plan_and_changes_nothing(): void
    {
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility'));
        $output = Artisan::output();

        $this->assertStringContainsString('DRY RUN', $output);
        $this->assertStringContainsString('Would activate 1 ad(s)', $output);
        $this->assertStringContainsString((string) $ad->id, $output);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $this->assertDatabaseCount('ad_moderation_decisions', 0);
    }

    public function test_apply_activates_approved_hidden_ads(): void
    {
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
        $this->assertNotNull($ad->expires_at);
        $this->assertTrue($ad->isApprovedAndVisible());
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'approved',
        ]);
    }

    public function test_re_running_apply_is_a_no_op(): void
    {
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);

        Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]);
        $expiryAfterFirstRun = $ad->fresh()->expires_at;
        $decisionCountAfterFirstRun = AdModerationDecision::query()->where('ad_id', $ad->id)->count();
        $this->assertSame(1, $decisionCountAfterFirstRun);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $this->assertStringContainsString('Nothing to reconcile', Artisan::output());

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertTrue($expiryAfterFirstRun->equalTo($ad->expires_at));
        $this->assertSame(
            $decisionCountAfterFirstRun,
            AdModerationDecision::query()->where('ad_id', $ad->id)->count()
        );
    }

    public function test_manual_review_ads_are_never_activated(): void
    {
        $seller = User::factory()->create();
        $manual = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'manual_review', 'expires_at' => null,
        ]);
        $adminManual = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'admin_manual_review', 'expires_at' => null,
        ]);
        $failed = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'failed', 'expires_at' => null,
        ]);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));

        $this->assertSame('archived', $manual->fresh()->status);
        $this->assertSame('manual_review', $manual->fresh()->ai_moderation_status);
        $this->assertSame('archived', $adminManual->fresh()->status);
        $this->assertSame('admin_manual_review', $adminManual->fresh()->ai_moderation_status);
        $this->assertSame('archived', $failed->fresh()->status);
        $this->assertSame('failed', $failed->fresh()->ai_moderation_status);
        $this->assertNull($manual->fresh()->expires_at);
    }

    public function test_rejected_ads_are_never_activated(): void
    {
        $seller = User::factory()->create();
        $rejected = $this->createAd($seller, [
            'status' => 'rejected', 'ai_moderation_status' => 'rejected', 'expires_at' => null,
        ]);
        $archivedRejected = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'admin_rejected', 'expires_at' => null,
        ]);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));

        $this->assertSame('rejected', $rejected->fresh()->status);
        $this->assertSame('rejected', $rejected->fresh()->ai_moderation_status);
        $this->assertSame('archived', $archivedRejected->fresh()->status);
        $this->assertSame('admin_rejected', $archivedRejected->fresh()->ai_moderation_status);
    }

    public function test_catalog_fillers_are_never_activated(): void
    {
        $seller = User::factory()->create();
        $filler = $this->hiddenApprovedAd($seller, ['is_catalog_filler' => true]);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));

        $this->assertSame('archived', $filler->fresh()->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $filler->fresh()->ai_moderation_status);
    }

    public function test_seller_archived_ads_with_remaining_time_are_skipped_by_default(): void
    {
        $seller = User::factory()->create();
        $sellerArchived = $this->hiddenApprovedAd($seller, ['expires_at' => now()->addDays(3)]);

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $this->assertStringContainsString('Skipping 1 ad(s)', Artisan::output());

        $sellerArchived->refresh();
        $this->assertSame('archived', $sellerArchived->status, 'A seller-archived ad must stay hidden.');

        $this->assertSame(0, Artisan::call(
            'ads:reconcile-moderation-visibility',
            ['--apply' => true, '--include-owner-archived' => true]
        ));
        $this->assertSame('active', $sellerArchived->fresh()->status);

        // Reactivating a seller-archived ad must also republish it properly, i.e.
        // with a fresh future lifetime rather than the stale remaining time.
        $this->assertTrue($sellerArchived->fresh()->expires_at->isFuture());
        $this->assertIndexable($sellerArchived);
    }

    public function test_ads_with_a_past_expiry_are_never_activated_into_an_expired_state(): void
    {
        $seller = User::factory()->create();
        $stale = $this->hiddenApprovedAd($seller, ['expires_at' => now()->subDay()]);

        // A stale expiry is not a pipeline-archived ad, so the default run skips it.
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $this->assertSame('archived', $stale->fresh()->status);

        // Even when explicitly included, activation grants a fresh future lifetime,
        // so an ad can never be activated straight into an expired, non-indexable state.
        $this->assertSame(0, Artisan::call(
            'ads:reconcile-moderation-visibility',
            ['--apply' => true, '--include-owner-archived' => true]
        ));

        $stale->refresh();
        $this->assertSame('active', $stale->status);
        $this->assertNotNull($stale->expires_at);
        $this->assertTrue($stale->expires_at->isFuture());
        $this->assertIndexable($stale);
    }

    public function test_apply_and_dry_run_together_are_rejected(): void
    {
        $seller = User::factory()->create();
        $this->hiddenApprovedAd($seller);

        $this->assertSame(1, Artisan::call(
            'ads:reconcile-moderation-visibility',
            ['--apply' => true, '--dry-run' => true]
        ));
    }

    // ---------------------------------------------------------------------
    // Activation preflight: what the operator is told before committing
    // ---------------------------------------------------------------------

    /**
     * Whole-table snapshot of the surface this command can write, so "the dry run writes
     * nothing" is asserted against every column of every row rather than one field.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function writeSurfaceSnapshot(): array
    {
        $dump = fn (string $table): array => DB::table($table)
            ->orderBy('id')
            ->get()
            ->map(fn (object $row): array => (array) $row)
            ->all();

        return [
            'ads' => $dump('ads'),
            'ad_moderation_decisions' => $dump('ad_moderation_decisions'),
        ];
    }

    /**
     * The preflight block is wrapped at a fixed width, so sentence-level assertions are made
     * with the line breaks collapsed.
     */
    private function preflightText(string $output): string
    {
        return (string) preg_replace('/\s+/', ' ', $output);
    }

    public function test_dry_run_prints_the_activation_preflight_and_writes_nothing(): void
    {
        $this->freezeTime();
        $seller = User::factory()->create();
        $ad = $this->hiddenApprovedAd($seller);
        $before = $this->writeSurfaceSnapshot();
        $this->assertCount(1, $before['ads'], 'The read-only assertion must not be vacuous.');

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility'));
        $output = Artisan::output();
        $text = $this->preflightText($output);

        // The resolved lifetime, where it came from, and the expiry the rows would receive.
        $this->assertStringContainsString(sprintf('ad_lifetime_days : %d day(s)', Ad::lifetimeDays()), $output);
        $this->assertStringContainsString('source           : code default in config/marketplace.php', $output);
        $this->assertStringContainsString('expires_at       : '.Ad::freshExpiry()->format('Y-m-d H:i:s T'), $output);

        // The one-shot statement, in the terms the operator acts on.
        $this->assertStringContainsString('ONE-SHOT', $output);
        $this->assertStringContainsString(
            "activation requires status='archived' and writes status='active', so a later --apply selects none of the activated rows",
            $text
        );
        $this->assertStringContainsString('re-running is not an undo', $text);
        $this->assertStringContainsString('No command restores the archived state or the granted lifetime', $text);

        // A dry run is read-only, on every row of every table this command writes.
        $this->assertSame($before, $this->writeSurfaceSnapshot(), 'A dry run must not write.');
        $this->assertSame('archived', $ad->fresh()->status);
        $this->assertNull($ad->fresh()->expires_at);
    }

    public function test_apply_preflight_names_the_expiry_the_rows_actually_receive(): void
    {
        $this->freezeTime();
        $seller = User::factory()->create();

        $first = $this->hiddenApprovedAd($seller);
        $second = $this->hiddenApprovedAd($seller);
        $alreadyActive = $this->createAd($seller, [
            'status' => 'active',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => now()->addDays(2),
        ]);
        $manual = $this->createAd($seller, [
            'status' => 'archived', 'ai_moderation_status' => 'manual_review', 'expires_at' => null,
        ]);
        $filler = $this->hiddenApprovedAd($seller, ['is_catalog_filler' => true]);
        $sellerArchived = $this->hiddenApprovedAd($seller, ['expires_at' => now()->addDays(3)]);

        $expectedExpiry = Ad::freshExpiry();

        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $output = Artisan::output();

        // The warning is on the --apply path too, before the first write.
        $this->assertStringContainsString('PREFLIGHT', $output);
        $this->assertStringContainsString('ONE-SHOT', $output);
        $this->assertStringContainsString('expires_at       : '.$expectedExpiry->format('Y-m-d H:i:s T'), $output);

        // Exactly the two pipeline-archived ads are published, with the preflighted expiry.
        // Compared at second precision: the column stores whole seconds and the preflight
        // prints the same second-precision value, while the in-memory Carbon keeps the
        // fractional part of the frozen clock.
        foreach ([$first, $second] as $ad) {
            $ad->refresh();
            $this->assertSame('active', $ad->status);
            $this->assertSame(
                $expectedExpiry->toDateTimeString(),
                $ad->expires_at?->toDateTimeString(),
                'An activated row must carry exactly the expiry the preflight printed.'
            );
            $this->assertIndexable($ad);
        }

        $this->assertSame(
            [$first->id, $second->id, $alreadyActive->id],
            Ad::query()->where('status', 'active')->orderBy('id')->pluck('id')->all(),
            'Activation must change exactly the rows the predicate selects.'
        );
        $this->assertSame(
            now()->addDays(2)->toDateTimeString(),
            $alreadyActive->fresh()->expires_at?->toDateTimeString()
        );
        $this->assertSame('archived', $manual->fresh()->status);
        $this->assertSame('manual_review', $manual->fresh()->ai_moderation_status);
        $this->assertSame('archived', $filler->fresh()->status);
        $this->assertSame('archived', $sellerArchived->fresh()->status);
        $this->assertSame(0, Ad::query()->approvedButHidden()->count());
    }
}

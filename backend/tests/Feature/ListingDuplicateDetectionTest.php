<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use App\Services\ListingDuplicateDetector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Duplicate detection must SURFACE suspected duplicates, never judge them.
 *
 * These tests deliberately go through the real moderation pipeline
 * (ModerateAdWithAI::handle) rather than calling the detector directly, so they
 * prove the pipeline actually invokes it.
 */
class ListingDuplicateDetectionTest extends TestCase
{
    use RefreshDatabase;

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Toyota Corolla 2022 Excelente Estado',
            'description' => 'Auto en excelentes condiciones, único dueño, factura original.',
            'price' => 320000,
            'location' => 'Cuauhtémoc, Ciudad de México',
            'state' => 'Ciudad de México',
            'city' => 'Cuauhtémoc',
            'category' => 'autos',
            'subcategory' => 'autos',
            'condition' => 'usado',
            'status' => 'active',
            'is_catalog_filler' => false,
            'attributes' => ['subcategory' => 'autos'],
        ], $overrides)));
    }

    private function queuedSubmission(User $seller, array $overrides = []): Ad
    {
        return $this->createAd($seller, array_merge([
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'expires_at' => null,
            'moderation_submitted_at' => now(),
        ], $overrides));
    }

    private function fakeApprovingGateway(): void
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'approved',
                'reason' => 'Contenido permitido.',
                'confidence' => 0.99,
                'flags' => [],
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local',
                'model_executed' => true,
                'gateway_version' => '0.2.0',
                'latency_ms' => 10,
                'rollout_mode' => 'shadow_assist',
                'authoritative' => false,
            ]),
        ]);
    }

    // ---------------------------------------------------------------------
    // Pipeline behaviour (E1b: the pipeline must actually invoke the detector)
    // ---------------------------------------------------------------------

    public function test_pipeline_control_without_duplicate_still_auto_publishes(): void
    {
        // Control: with assist-only relaxed and an approving gateway, a unique
        // submission still publishes automatically. This proves the duplicate
        // assertion below is caused by duplicate detection and not by assist-only.
        config(['ai_moderation.assist_only' => false]);
        $this->fakeApprovingGateway();
        $seller = User::factory()->create();
        $ad = $this->queuedSubmission($seller);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);

        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest('id')->firstOrFail();
        $this->assertSame('approved', $decision->decision);
        $this->assertFalse($decision->metadata['duplicate']['is_duplicate']);
    }

    public function test_pipeline_routes_an_exact_duplicate_to_human_review_and_surfaces_it(): void
    {
        config(['ai_moderation.assist_only' => false]);
        $this->fakeApprovingGateway();
        $seller = User::factory()->create();

        $original = $this->createAd($seller, ['status' => 'active', 'ai_moderation_status' => 'approved']);
        $duplicate = $this->queuedSubmission($seller);

        app()->call([new ModerateAdWithAI($duplicate->id), 'handle']);

        $duplicate->refresh();

        // Surfaced, not judged: the AI approved it, yet it is routed to a human.
        $this->assertSame('archived', $duplicate->status);
        $this->assertSame('manual_review', $duplicate->ai_moderation_status);
        // Never auto-rejected.
        $this->assertNotSame('rejected', $duplicate->status);
        $this->assertStringContainsString(ListingDuplicateDetector::REASON_MARKER, (string) $duplicate->ai_moderation_reason);
        $this->assertStringContainsString('#'.$original->id, (string) $duplicate->ai_moderation_reason);

        $decision = AdModerationDecision::query()->where('ad_id', $duplicate->id)->latest('id')->firstOrFail();
        $this->assertSame('manual_review', $decision->decision);
        $this->assertTrue($decision->metadata['duplicate']['is_duplicate']);
        $this->assertSame($original->id, $decision->metadata['duplicate']['duplicate_of_ad_id']);
        $this->assertSame(
            ['seller_id', 'title', 'price', 'description'],
            $decision->metadata['duplicate']['matched_on']
        );
    }

    public function test_pipeline_records_duplicate_evidence_even_when_the_gateway_fails(): void
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);
        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response([], 503)]);

        $seller = User::factory()->create();
        $original = $this->createAd($seller);
        $duplicate = $this->queuedSubmission($seller);

        app()->call([new ModerateAdWithAI($duplicate->id), 'handle']);

        $duplicate->refresh();
        $this->assertSame('failed', $duplicate->ai_moderation_status);
        $this->assertStringContainsString(ListingDuplicateDetector::REASON_MARKER, (string) $duplicate->ai_moderation_reason);

        $decision = AdModerationDecision::query()->where('ad_id', $duplicate->id)->latest('id')->firstOrFail();
        $this->assertTrue($decision->metadata['duplicate']['is_duplicate']);
        $this->assertSame($original->id, $decision->metadata['duplicate']['duplicate_of_ad_id']);
    }

    // ---------------------------------------------------------------------
    // Precision: legitimate near-misses must NOT be flagged
    // ---------------------------------------------------------------------

    public function test_detector_does_not_flag_a_different_price(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller, ['price' => 320000]);
        $submission = $this->queuedSubmission($seller, ['price' => 310000]);

        $signal = app(ListingDuplicateDetector::class)->detect($submission);

        $this->assertFalse($signal['is_duplicate']);
        $this->assertNull($signal['duplicate_of_ad_id']);
    }

    public function test_detector_does_not_flag_a_different_description(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller);
        $submission = $this->queuedSubmission($seller, [
            'description' => 'Mismo título y precio, pero unidad distinta con 80,000 km y detalles diferentes.',
        ]);

        $signal = app(ListingDuplicateDetector::class)->detect($submission);

        $this->assertFalse($signal['is_duplicate']);
    }

    public function test_detector_does_not_flag_a_different_seller(): void
    {
        $seller = User::factory()->create();
        $otherSeller = User::factory()->create();
        $this->createAd($seller);
        $submission = $this->queuedSubmission($otherSeller);

        $signal = app(ListingDuplicateDetector::class)->detect($submission);

        $this->assertFalse($signal['is_duplicate']);
        $this->assertSame(0, $signal['candidate_count']);
    }

    public function test_detector_does_not_flag_a_first_submission(): void
    {
        $seller = User::factory()->create();
        $submission = $this->queuedSubmission($seller);

        $signal = app(ListingDuplicateDetector::class)->detect($submission);

        $this->assertFalse($signal['is_duplicate']);
    }

    // ---------------------------------------------------------------------
    // Key definition and determinism
    // ---------------------------------------------------------------------

    public function test_key_ignores_case_and_surrounding_whitespace_but_not_content(): void
    {
        $detector = app(ListingDuplicateDetector::class);

        $base = $detector->fingerprintFor(37, 'Toyota Corolla 2022', 320000, 'Auto impecable');
        $noisy = $detector->fingerprintFor(37, '  TOYOTA   corolla 2022 ', '320000.00', ' Auto   impecable ');
        $otherSeller = $detector->fingerprintFor(38, 'Toyota Corolla 2022', 320000, 'Auto impecable');
        $otherPrice = $detector->fingerprintFor(37, 'Toyota Corolla 2022', 319999, 'Auto impecable');

        $this->assertSame($base, $noisy, 'Normalization must absorb case and whitespace noise.');
        $this->assertNotSame($base, $otherSeller);
        $this->assertNotSame($base, $otherPrice);
    }

    public function test_detector_reports_the_earliest_ad_as_the_original(): void
    {
        $seller = User::factory()->create();
        $first = $this->createAd($seller);
        $second = $this->createAd($seller);
        $third = $this->createAd($seller);

        $signal = app(ListingDuplicateDetector::class)->detect($third);

        $this->assertTrue($signal['is_duplicate']);
        $this->assertSame($first->id, $signal['duplicate_of_ad_id']);
        $this->assertTrue($signal['candidate_count'] >= 2);
        $this->assertFalse($signal['candidates_truncated']);
        $this->assertNotSame($second->id, $signal['duplicate_of_ad_id']);
    }

    public function test_the_original_is_not_accused_by_a_later_copy(): void
    {
        // Regression guard: the earliest ad of a group must never be flagged as a
        // duplicate of a copy submitted after it, or the two accuse each other.
        $seller = User::factory()->create();
        $original = $this->createAd($seller);
        $copy = $this->createAd($seller);

        $this->assertFalse(
            app(ListingDuplicateDetector::class)->detect($original)['is_duplicate'],
            'The original must not be flagged.'
        );

        $signal = app(ListingDuplicateDetector::class)->detect($copy);
        $this->assertTrue($signal['is_duplicate']);
        $this->assertSame($original->id, $signal['duplicate_of_ad_id']);
    }

    public function test_original_is_chosen_by_submission_order_not_ad_id(): void
    {
        // Ad id is an insertion counter, not submission time. Force the two orders to
        // genuinely disagree: the HIGHER id row is the EARLIER submission, and the
        // LOWER id row is the LATER submission.
        $seller = User::factory()->create();
        $lowerIdLaterSubmission = $this->createAd($seller);
        $higherIdEarlierSubmission = $this->createAd($seller);

        DB::table('ads')->where('id', $higherIdEarlierSubmission->id)->update(['created_at' => now()->subDays(3)]);
        DB::table('ads')->where('id', $lowerIdLaterSubmission->id)->update(['created_at' => now()->subDay()]);

        $signal = app(ListingDuplicateDetector::class)->detect($lowerIdLaterSubmission->fresh());

        $this->assertTrue($signal['is_duplicate'], 'The later submission must be detected as a copy.');
        $this->assertSame(
            $higherIdEarlierSubmission->id,
            $signal['duplicate_of_ad_id'],
            'The earlier SUBMISSION is the original, even when it carries the higher id.'
        );

        // And the true original is not accused by the later copy.
        $this->assertFalse(
            app(ListingDuplicateDetector::class)->detect($higherIdEarlierSubmission->fresh())['is_duplicate']
        );
    }

    public function test_stale_duplicate_evidence_from_an_earlier_cycle_is_not_surfaced(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->queuedSubmission($seller);

        // An earlier cycle flagged this ad as a duplicate of #999.
        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Posible duplicado del anuncio #999',
            'metadata' => [
                'technical_status' => 'manual_review',
                'duplicate' => [
                    'is_duplicate' => true,
                    'duplicate_of_ad_id' => 999,
                    'fingerprint' => 'stale-fingerprint',
                    'candidate_count' => 1,
                    'candidates_truncated' => false,
                    'matched_on' => ['seller_id', 'title', 'price', 'description'],
                ],
            ],
        ]);

        // A newer decision supersedes it and found no duplicate.
        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'reason' => 'Nuevo ciclo de revisión',
            'metadata' => ['duplicate' => ['is_duplicate' => false, 'duplicate_of_ad_id' => null]],
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/moderation/ads/{$ad->id}")
            ->assertOk()
            ->assertJsonPath('suspected_duplicate', null);
    }

    public function test_a_truncated_duplicate_scan_fails_closed_into_human_review(): void
    {
        // A truncated window means "no match" proves nothing: a seller could push the
        // real original past the cap and have a copy auto-published.
        config(['ai_moderation.assist_only' => false]);
        $this->fakeApprovingGateway();
        $seller = User::factory()->create();

        for ($i = 0; $i <= ListingDuplicateDetector::MAX_CANDIDATES; $i++) {
            // Same price (so they fill the candidate window) but distinct content.
            $this->createAd($seller, ['title' => "Anuncio distinto {$i}"]);
        }

        $ad = $this->queuedSubmission($seller);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);

        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest('id')->firstOrFail();
        $this->assertTrue($decision->metadata['duplicate']['candidates_truncated']);
        $this->assertFalse($decision->metadata['duplicate']['is_duplicate']);
    }

    public function test_a_complete_scan_without_a_match_still_publishes_normally(): void
    {
        // Control for the fail-closed rule: an untruncated scan that finds nothing must
        // not be diverted.
        config(['ai_moderation.assist_only' => false]);
        $this->fakeApprovingGateway();
        $seller = User::factory()->create();
        $ad = $this->queuedSubmission($seller);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $ad->ai_moderation_status);
    }

    public function test_detection_is_measurable_through_the_admin_payload(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $original = $this->createAd($seller);
        $duplicate = $this->queuedSubmission($seller);

        AdModerationDecision::query()->create([
            'ad_id' => $duplicate->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Posible duplicado del anuncio #'.$original->id,
            'metadata' => [
                'technical_status' => 'manual_review',
                'duplicate' => [
                    'is_duplicate' => true,
                    'duplicate_of_ad_id' => $original->id,
                    'fingerprint' => 'test-fingerprint',
                    'candidate_count' => 1,
                    'candidates_truncated' => false,
                    'matched_on' => ['seller_id', 'title', 'price', 'description'],
                ],
            ],
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/moderation/ads/{$duplicate->id}")
            ->assertOk()
            ->assertJsonPath('suspected_duplicate.is_duplicate', true)
            ->assertJsonPath('suspected_duplicate.duplicate_of_ad_id', $original->id);
    }

    public function test_a_clean_ad_reports_no_suspected_duplicate(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->queuedSubmission($seller);

        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Revisión normal',
            'metadata' => [
                'technical_status' => 'manual_review',
                'duplicate' => ['is_duplicate' => false, 'duplicate_of_ad_id' => null],
            ],
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/moderation/ads/{$ad->id}")
            ->assertOk()
            ->assertJsonPath('suspected_duplicate', null);
    }
}

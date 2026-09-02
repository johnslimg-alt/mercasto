<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\FraudDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PythonFraudRiskBatchHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_cover_counts_as_missing_seller_image_for_high_value_listing(): void
    {
        $this->configurePython();
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ad = $this->ad($seller, 'pending', 15001, true);

        Http::fake(fn (Request $request) => Http::response([
            'subjects' => [[
                'subject_id' => $ad->id,
                'account' => $this->score(),
                'listing' => $this->score(),
            ]],
        ], 200));

        app(FraudDetectionService::class)->analyze($ad);

        Http::assertSent(function (Request $request): bool {
            $listing = $request->data()['subjects'][0]['listing'] ?? [];

            return ($listing['no_images_high_value'] ?? null) === true;
        });
    }

    public function test_batch_scores_pending_and_archived_ads_in_gateway_sized_chunks(): void
    {
        $this->configurePython();
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ads = collect(range(1, 12))->map(
            fn (int $index) => $this->ad($seller, $index % 2 === 0 ? 'archived' : 'pending', 0, false, $index)
        );
        $chunkSizes = [];

        Http::fake(function (Request $request) use (&$chunkSizes) {
            $subjects = $request->data()['subjects'] ?? [];
            $chunkSizes[] = count($subjects);

            return Http::response([
                'subjects' => array_map(fn (array $subject): array => [
                    'subject_id' => $subject['subject_id'],
                    'account' => $this->score(),
                    'listing' => $this->score(),
                ], $subjects),
            ], 200);
        });

        $result = app(FraudDetectionService::class)->batchAnalyze(12);

        $this->assertSame(12, $result['analyzed']);
        $this->assertSame([10, 2], $chunkSizes);
        Http::assertSentCount(2);
        foreach ($ads as $ad) {
            $this->assertContains($ad->fresh()->status, ['pending', 'archived']);
            $this->assertNotNull($ad->fresh()->last_fraud_check_at);
        }
    }

    public function test_batch_gateway_outage_short_circuits_after_first_failed_chunk(): void
    {
        $this->configurePython();
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        foreach (range(1, 21) as $index) {
            $this->ad($seller, 'pending', 0, false, $index);
        }

        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/risk/batch' => Http::response(['error' => 'down'], 503),
        ]);

        $result = app(FraudDetectionService::class)->batchAnalyze(21);

        $this->assertSame(21, $result['analyzed']);
        Http::assertSentCount(1);
        foreach ($result['details'] as $detail) {
            $this->assertTrue($detail['degraded']);
            $this->assertContains($detail['provider'], ['php_fallback', 'neutral_fallback']);
            $this->assertNull($detail['authoritative_action']);
        }
        $this->assertSame(0, Ad::query()->where('status', '!=', 'pending')->count());
    }

    private function configurePython(): void
    {
        config([
            'fraud_risk.python.enabled' => true,
            'fraud_risk.python.url' => 'http://mercasto-ai-gateway:8080',
            'fraud_risk.python.timeout_seconds' => 3,
            'services.ai_moderation_gateway.token' => 'risk-hardening-token',
        ]);
    }

    private function ad(User $seller, string $status, int $price, bool $generatedCover, int $suffix = 1): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Risk batch '.$suffix,
            'description' => 'Descripción normal '.$suffix,
            'price' => $price,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => $generatedCover ? '["ads/placeholders/generated.svg"]' : '["ads/seller/photo-'.$suffix.'.jpg"]',
            'generated_cover' => $generatedCover,
            'status' => $status,
        ]);
    }

    private function score(): array
    {
        return [
            'risk_score' => 0,
            'band' => 'low',
            'reason_codes' => [],
            'rules_version' => 'risk-rules-v1',
            'engine' => 'deterministic_rules',
            'rollout_mode' => 'shadow_assist',
            'authoritative' => false,
            'recommended_action' => 'allow',
        ];
    }
}

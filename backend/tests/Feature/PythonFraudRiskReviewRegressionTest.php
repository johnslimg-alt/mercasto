<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\FraudDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PythonFraudRiskReviewRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_schema_reaches_python_with_integer_age_and_live_duplicate_media_feature(): void
    {
        config([
            'fraud_risk.python.enabled' => true,
            'fraud_risk.python.url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'risk-review-token',
        ]);

        $this->assertTrue(Schema::hasColumn('reports', 'status'));
        $this->assertTrue(Schema::hasColumn('user_reports', 'status'));

        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $otherSeller = User::factory()->create();
        $sharedMedia = '["/uploads/risk-review-shared.jpg"]';

        Ad::query()->create([
            'user_id' => $otherSeller->id,
            'title' => 'Otro anuncio',
            'description' => 'Media compartida',
            'price' => 0,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => $sharedMedia,
            'status' => 'active',
        ]);
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio bajo prueba',
            'description' => 'Sin contenido sensible',
            'price' => 0,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => $sharedMedia,
            'status' => 'active',
        ]);

        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/risk/batch' => Http::response([
                'subjects' => [[
                    'subject_id' => $ad->id,
                    'account' => $this->score(),
                    'listing' => $this->score(),
                ]],
            ], 200),
        ]);

        $result = app(FraudDetectionService::class)->analyze($ad);
        $this->assertSame('python_private', $result['provider']);

        Http::assertSent(function (Request $request): bool {
            $subject = $request->data()['subjects'][0] ?? [];
            $account = $subject['account'] ?? [];
            $listing = $subject['listing'] ?? [];

            return is_int($account['account_age_days'] ?? null)
                && ($listing['duplicate_media_ads'] ?? null) === 1
                && ($account['resolved_user_reports_90d'] ?? null) === 0
                && ($account['resolved_ad_reports_90d'] ?? null) === 0
                && ($listing['resolved_reports_90d'] ?? null) === 0;
        });
    }

    public function test_php_fallback_preserves_canonical_risk_response_contract(): void
    {
        config(['fraud_risk.python.enabled' => false]);

        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Bicicleta urbana',
            'description' => 'Buen estado',
            'price' => 0,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'active',
        ]);

        $result = app(FraudDetectionService::class)->analyze($ad);

        $this->assertSame('php_fallback', $result['provider']);
        $this->assertSame('shadow_assist', $result['mode']);
        $this->assertSame('local_php_rules', $result['engine']);
        $this->assertArrayHasKey('recommended_action', $result);
        $this->assertContains($result['recommended_action'], [
            'allow',
            'observe',
            'manual_review',
            'urgent_review',
        ]);
        $this->assertArrayNotHasKey('recommendation', $result);
        $this->assertNull($result['authoritative_action']);
        $this->assertTrue($result['degraded']);
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

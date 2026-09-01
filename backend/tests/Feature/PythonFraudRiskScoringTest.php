<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\FraudDetectionService;
use App\Services\AI\PythonFraudDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PythonFraudRiskScoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_python_scoring_is_primary_and_sends_only_minimized_features(): void
    {
        config([
            'fraud_risk.python.enabled' => true,
            'fraud_risk.python.url' => 'http://mercasto-ai-gateway:8080',
            'fraud_risk.python.timeout_seconds' => 3,
            'services.ai_moderation_gateway.token' => 'risk-test-token',
        ]);
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/risk/batch' => Http::response([
                'subjects' => [[
                    'subject_id' => 1,
                    'account' => $this->score(32, 'medium', ['publication_velocity_high'], 'observe'),
                    'listing' => $this->score(22, 'medium', ['exact_duplicate_ads_repeated'], 'observe'),
                ]],
            ], 200),
        ]);

        $seller = User::factory()->create([
            'email' => 'sensitive-user@example.test',
            'phone_number' => '+525551234567',
            'created_at' => now()->subDays(30),
        ]);
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Oferta privada 555 123 4567',
            'description' => 'western union seller@example.test https://example.test/secret',
            'price' => 0,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'active',
        ]);

        $this->assertInstanceOf(PythonFraudDetectionService::class, app(FraudDetectionService::class));
        $result = app(FraudDetectionService::class)->analyze($ad);
        $ad->refresh();

        $this->assertSame('python_private', $result['provider']);
        $this->assertSame('private_local', $result['runtime']);
        $this->assertSame('shadow_assist', $result['mode']);
        $this->assertFalse($result['degraded']);
        $this->assertNull($result['authoritative_action']);
        $this->assertSame(54, $result['risk_score']);
        $this->assertSame(32, $result['account_risk_score']);
        $this->assertSame(22, $result['listing_risk_score']);
        $this->assertSame('active', $ad->status);
        $this->assertSame(54, (int) $ad->fraud_score);
        $this->assertSame(
            ['publication_velocity_high', 'exact_duplicate_ads_repeated'],
            $ad->fraud_flags,
        );
        $this->assertNotNull($ad->last_fraud_check_at);

        Http::assertSent(function (Request $request) use ($ad, $seller): bool {
            $payload = $request->data();
            $subject = $payload['subjects'][0] ?? [];
            $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '';

            return $request->url() === 'http://mercasto-ai-gateway:8080/v1/risk/batch'
                && ($subject['subject_id'] ?? null) === $ad->id
                && ! str_contains($encoded, $seller->email)
                && ! str_contains($encoded, (string) $seller->phone_number)
                && ! str_contains($encoded, 'western union')
                && ! str_contains($encoded, 'seller@example.test')
                && ! str_contains($encoded, 'example.test/secret')
                && ! array_key_exists('title', $subject['listing'] ?? [])
                && ! array_key_exists('description', $subject['listing'] ?? [])
                && ! array_key_exists('ip_address', $subject['account'] ?? [])
                && ! array_key_exists('device_fingerprint', $subject['account'] ?? []);
        });
    }

    public function test_gateway_failure_fails_open_without_mutating_listing_status(): void
    {
        config([
            'fraud_risk.python.enabled' => true,
            'fraud_risk.python.url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'risk-test-token',
        ]);
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/risk/batch' => Http::response(['error' => 'down'], 503),
        ]);

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
        $ad->refresh();

        $this->assertTrue($result['degraded']);
        $this->assertContains($result['provider'], ['php_fallback', 'neutral_fallback']);
        $this->assertNull($result['authoritative_action']);
        $this->assertSame('active', $ad->status);
    }

    public function test_admin_risk_feed_is_private_and_exposes_only_aggregated_risk_evidence(): void
    {
        $seller = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio para revisión',
            'description' => 'Descripción',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'active',
            'fraud_score' => 72,
            'fraud_flags' => ['duplicate_media_repeated'],
            'last_fraud_check_at' => now(),
        ]);

        $this->getJson('/api/admin/risk/ads')->assertUnauthorized();

        Sanctum::actingAs($seller);
        $this->getJson('/api/admin/risk/ads')->assertForbidden();

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/risk/ads');
        $response->assertOk()
            ->assertJsonPath('authoritative', false)
            ->assertJsonPath('mode', 'shadow_assist')
            ->assertJsonPath('data.0.id', $ad->id)
            ->assertJsonPath('data.0.fraud_score', 72)
            ->assertJsonPath('data.0.fraud_flags.0', 'duplicate_media_repeated');
        $response->assertJsonMissingPath('data.0.user.email');
        $response->assertJsonMissingPath('data.0.user.phone_number');
    }

    private function score(int $riskScore, string $band, array $reasons, string $action): array
    {
        return [
            'risk_score' => $riskScore,
            'band' => $band,
            'reason_codes' => $reasons,
            'rules_version' => 'risk-rules-v1',
            'engine' => 'deterministic_rules',
            'rollout_mode' => 'shadow_assist',
            'authoritative' => false,
            'recommended_action' => $action,
        ];
    }
}

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\FraudDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PythonFraudRiskAdminHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_recent_pending_listing_is_rescored_without_waiting_for_seven_day_cooldown(): void
    {
        $this->configurePython();
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ad = $this->ad($seller, [
            'status' => 'pending',
            'last_fraud_check_at' => now(),
            'ai_moderation_status' => 'queued',
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

        $result = app(FraudDetectionService::class)->batchAnalyze(1);

        $this->assertSame(1, $result['analyzed']);
        $this->assertFalse($result['degraded']);
        $this->assertSame(1, $result['python_analyzed']);
        Http::assertSent(fn (Request $request): bool =>
            ($request->data()['subjects'][0]['subject_id'] ?? null) === $ad->id
        );
    }

    public function test_admin_risk_feed_is_paginated_and_reports_true_total(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        foreach (range(1, 51) as $index) {
            $this->ad($seller, [
                'title' => "Risk listing {$index}",
                'fraud_score' => 50,
                'fraud_flags' => ['review_signal'],
                'last_fraud_check_at' => now(),
            ]);
        }

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/moderation/ads?mode=risk&per_page=50&page=2');

        $response->assertOk()
            ->assertJsonPath('total', 51)
            ->assertJsonPath('page', 2)
            ->assertJsonPath('per_page', 50)
            ->assertJsonPath('last_page', 2);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_degraded_admin_batch_surfaces_provider_and_keeps_status_unchanged(): void
    {
        $this->configurePython();
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/risk/batch' => Http::response(['error' => 'down'], 503),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ad = $this->ad($seller, ['status' => 'pending']);

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/admin/moderation/process-pending', [
            'mode' => 'risk',
            'limit' => 1,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('degraded', true)
            ->assertJsonPath('python_analyzed', 0);
        $this->assertContains('php_fallback', $response->json('providers'));
        $this->assertSame('pending', $ad->fresh()->status);
        Http::assertSentCount(1);
    }

    private function configurePython(): void
    {
        config([
            'fraud_risk.python.enabled' => true,
            'fraud_risk.python.url' => 'http://mercasto-ai-gateway:8080',
            'fraud_risk.python.timeout_seconds' => 3,
            'services.ai_moderation_gateway.token' => 'risk-admin-hardening-token',
        ]);
    }

    private function ad(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
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
        ], $overrides));
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

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\FraudDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FraudDetectionAssistOnlyTest extends TestCase
{
    use RefreshDatabase;

    public function test_high_risk_fallback_score_is_persisted_without_mutating_listing_status(): void
    {
        config([
            'fraud_risk.thresholds.review' => 40,
            'fraud_risk.python.enabled' => false,
        ]);
        $seller = User::factory()->create(['created_at' => now()->subDays(30)]);
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'URGENTE REPLICA ONLY TODAY',
            'description' => 'western union bitcoin 555 123 4567 seller@example.test',
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

        $this->assertSame('active', $ad->status);
        $this->assertGreaterThanOrEqual(40, $result['risk_score']);
        $this->assertTrue($result['requires_manual_review']);
        $this->assertSame('shadow_assist', $result['mode']);
        $this->assertSame('php_fallback', $result['provider']);
        $this->assertTrue($result['degraded']);
        $this->assertNull($result['authoritative_action']);
        $this->assertSame($result['risk_score'], (int) $ad->fraud_score);
        $this->assertContains('phone_in_description', $ad->fraud_flags);
        $this->assertContains('email_in_description', $ad->fraud_flags);
        $this->assertNotNull($ad->last_fraud_check_at);
    }
}

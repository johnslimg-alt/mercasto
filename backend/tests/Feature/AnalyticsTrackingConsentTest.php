<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnalyticsTrackingConsentTest extends TestCase
{
    use RefreshDatabase;

    public function test_withdrawal_is_persisted_and_invalidates_pending_checkout_contexts(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => [
                'locale' => 'ru',
                'analytics_tracking_consent' => true,
            ],
        ]);
        DB::table('payments')->insert([
            'user_id' => $user->id,
            'ad_id' => null,
            'clip_checkout_id' => 'clip_pending_consent_test',
            'amount' => 19,
            'description' => 'Consent test',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Cache::put('meta_purchase_context:clip_pending_consent_test', [
            'openai_measurement_consent' => true,
        ], now()->addHour());

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/user/privacy/analytics-consent', [
                'analytics_tracking_consent' => false,
            ])
            ->assertOk()
            ->assertJsonPath('analytics_tracking_consent', false);

        $preferences = $user->fresh()->notification_preferences;
        $this->assertFalse($preferences['analytics_tracking_consent']);
        $this->assertSame('ru', $preferences['locale']);
        $this->assertArrayHasKey('analytics_tracking_consent_updated_at', $preferences);
        $this->assertFalse(Cache::has('meta_purchase_context:clip_pending_consent_test'));
    }

    public function test_consent_endpoint_requires_authentication(): void
    {
        $this->postJson('/api/user/privacy/analytics-consent', [
            'analytics_tracking_consent' => true,
        ])->assertUnauthorized();
    }
}

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LegacyModerationReactivationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_confirms_approved_legacy_ad_for_fresh_seven_day_period(): void
    {
        $seller = User::factory()->create();
        $ad = $this->legacyAd($seller);
        Sanctum::actingAs($seller);

        $response = $this->putJson("/api/ads/{$ad->id}/activate", [
            'confirm_available' => true,
            'price' => 2750,
            'condition' => 'usado',
            'location' => 'Boca del Río, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);

        $response->assertOk()->assertJsonPath('status', 'active');
        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame('approved', $ad->ai_moderation_status);
        $this->assertSame(2750.0, (float) $ad->price);
        $this->assertSame('Boca del Río', $ad->city);
        $this->assertTrue($ad->expires_at->between(now()->addDays(6), now()->addDays(8)));
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_confirmation_and_approval_are_required(): void
    {
        $seller = User::factory()->create();
        Sanctum::actingAs($seller);
        $ad = $this->legacyAd($seller);

        $this->putJson("/api/ads/{$ad->id}/activate", [
            'price' => 2500,
            'condition' => 'usado',
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
        ])->assertUnprocessable();

        $ad->forceFill(['ai_moderation_status' => 'manual_review'])->saveQuietly();
        $this->putJson("/api/ads/{$ad->id}/activate", $this->confirmationPayload())
            ->assertUnprocessable();
        $this->assertSame('archived', $ad->fresh()->status);
    }

    public function test_other_user_cannot_confirm_reactivation(): void
    {
        $seller = User::factory()->create();
        $ad = $this->legacyAd($seller);
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/ads/{$ad->id}/activate", $this->confirmationPayload())
            ->assertForbidden();
        $this->assertSame('archived', $ad->fresh()->status);
    }

    private function legacyAd(User $seller): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Bicicleta usada',
            'description' => 'Bicicleta en buen estado.',
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'expires_at' => now()->subDays(5),
            'ai_moderation_status' => 'approved',
            'ai_moderated_at' => now(),
            'is_catalog_filler' => false,
        ]);
    }

    private function confirmationPayload(): array
    {
        return [
            'confirm_available' => true,
            'price' => 2500,
            'condition' => 'usado',
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
        ];
    }
}

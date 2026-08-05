<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ManualReviewSellerCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $seller;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seller = User::factory()->create();
        $this->category = Category::query()->create([
            'slug' => 'motor',
            'name' => ['es' => 'Motor', 'en' => 'Motor'],
            'icon' => 'Car',
        ]);
    }

    public function test_my_ads_exposes_fixable_guidance_without_exposing_decision_metadata(): void
    {
        $ad = $this->manualReviewAd();
        $this->decision($ad, ['missing_original_photos', 'condition_mismatch', 'precio_incoherente']);

        $response = $this->actingAs($this->seller, 'sanctum')
            ->getJson('/api/user/ads')
            ->assertOk();

        $this->assertTrue($response->json('data.0.seller_correction.required'));
        $this->assertSame(
            ['photos', 'details', 'price'],
            $response->json('data.0.seller_correction.issue_codes'),
        );
        $this->assertArrayNotHasKey('latest_moderation_decision', $response->json('data.0'));
    }

    public function test_sensitive_manual_review_remains_admin_only(): void
    {
        $ad = $this->manualReviewAd();
        $this->decision($ad, ['desbloqueo_dispositivo', 'potential_fraud', 'missing_original_photos']);

        $this->actingAs($this->seller, 'sanctum')
            ->getJson('/api/user/ads')
            ->assertOk()
            ->assertJsonPath('data.0.seller_correction', null);
    }

    public function test_material_edit_requeues_manual_review_ad(): void
    {
        $ad = $this->manualReviewAd();
        $this->decision($ad, ['condition_mismatch']);

        $payload = $this->editPayload([
            'condition' => 'usado',
            'attributes' => [
                'subcategory' => 'Autos',
                'kms' => 45000,
                'year' => 2022,
            ],
        ]);

        $this->actingAs($this->seller, 'sanctum')
            ->postJson("/api/ads/{$ad->id}", $payload)
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('ai_moderation_status', 'queued');

        $ad->refresh();
        $this->assertSame('pending', $ad->status);
        $this->assertSame('queued', $ad->ai_moderation_status);
        $this->assertNull($ad->ai_moderation_reason);
        $this->assertNull($ad->ai_moderated_at);
        $this->assertNull($ad->expires_at);
        $this->assertNotNull($ad->moderation_submitted_at);
    }

    public function test_unchanged_manual_review_ad_is_not_requeued(): void
    {
        $ad = $this->manualReviewAd();
        $this->decision($ad, ['missing_original_photos']);

        $this->actingAs($this->seller, 'sanctum')
            ->postJson("/api/ads/{$ad->id}", $this->editPayload())
            ->assertOk()
            ->assertJsonPath('status', 'archived')
            ->assertJsonPath('ai_moderation_status', 'manual_review');

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertSame('Requiere corrección.', $ad->ai_moderation_reason);
    }

    private function manualReviewAd(): Ad
    {
        return Ad::query()->create([
            'user_id' => $this->seller->id,
            'title' => 'Toyota Corolla 2022',
            'description' => 'Único dueño, 45,000 km.',
            'price' => 320000,
            'condition' => 'nuevo',
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'motor',
            'subcategory' => 'Autos',
            'attributes' => [
                'subcategory' => 'Autos',
                'kms' => 45000,
                'year' => 2022,
            ],
            'status' => 'archived',
            'expires_at' => now()->subDay(),
            'ai_moderation_status' => 'manual_review',
            'ai_moderation_reason' => 'Requiere corrección.',
            'ai_moderation_confidence' => 0.6,
            'ai_moderated_at' => now()->subHour(),
            'moderation_submitted_at' => now()->subHours(2),
            'is_catalog_filler' => false,
        ]);
    }

    private function decision(Ad $ad, array $flags): void
    {
        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Requiere corrección.',
            'confidence' => 0.6,
            'metadata' => [
                'result' => [
                    'decision' => 'manual_review',
                    'reason' => 'Requiere corrección.',
                    'confidence' => 0.6,
                    'flags' => $flags,
                ],
            ],
        ]);
    }

    private function editPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'title' => 'Toyota Corolla 2022',
            'description' => 'Único dueño, 45,000 km.',
            'price' => 320000,
            'condition' => 'nuevo',
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'motor',
            'subcategory' => 'Autos',
            'attributes' => [
                'subcategory' => 'Autos',
                'kms' => 45000,
                'year' => 2022,
            ],
            'existing_images' => [],
        ], $overrides);
    }
}

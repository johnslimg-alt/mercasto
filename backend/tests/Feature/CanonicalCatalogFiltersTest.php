<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CanonicalCatalogFiltersTest extends TestCase
{
    use RefreshDatabase;

    public function test_canonical_listing_and_payment_values_match_stored_attributes(): void
    {
        $venta = $this->ad(['attributes' => ['listing_type' => 'Venta', 'payment_method' => 'Efectivo']]);
        $this->ad(['attributes' => ['listing_type' => 'Renta', 'payment_method' => 'PayPal']]);

        $query = http_build_query(['filters' => [
            'listing_type' => ['Venta'],
            'payment_method' => ['Efectivo'],
        ]]);

        $response = $this->getJson("/api/ads?{$query}")->assertOk();
        $this->assertSame([$venta->id], collect($response->json('data'))->pluck('id')->all());
    }

    public function test_semantic_filter_tokens_are_language_independent(): void
    {
        $business = User::factory()->create(['role' => 'business', 'is_verified' => true]);
        $individual = User::factory()->create(['role' => 'individual', 'is_verified' => false]);
        $businessAd = $this->ad(['user_id' => $business->id, 'image_url' => '["/storage/business.jpg"]']);
        $this->ad(['user_id' => $individual->id, 'image_url' => null]);

        $query = http_build_query(['filters' => [
            'seller_type_global' => ['business'],
            'seller_verified' => ['verified'],
            'media' => ['photos'],
        ]]);

        $response = $this->getJson("/api/ads?{$query}")->assertOk();
        $this->assertSame([$businessAd->id], collect($response->json('data'))->pluck('id')->all());
    }

    public function test_canonical_published_and_sort_tokens_apply_expected_query_logic(): void
    {
        $old = $this->ad(['price' => 100]);
        $old->forceFill(['created_at' => now()->subDays(10), 'updated_at' => now()->subDays(10)])->saveQuietly();
        $recentLow = $this->ad(['price' => 200]);
        $recentHigh = $this->ad(['price' => 900]);

        $query = http_build_query(['filters' => [
            'published_at' => ['last_3_days'],
            'sort' => 'price_desc',
        ]]);

        $response = $this->getJson("/api/ads?{$query}")->assertOk();
        $this->assertSame(
            [$recentHigh->id, $recentLow->id],
            collect($response->json('data'))->pluck('id')->all(),
        );
    }

    private function ad(array $overrides = []): Ad
    {
        $userId = $overrides['user_id'] ?? User::factory()->create()->id;
        unset($overrides['user_id']);

        return Ad::create(array_merge([
            'user_id' => $userId,
            'title' => 'Filtro canónico',
            'description' => 'Anuncio para contrato de filtros.',
            'price' => 500,
            'location' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'category' => 'electronica',
            'condition' => 'nuevo',
            'status' => 'active',
            'attributes' => [],
        ], $overrides));
    }
}

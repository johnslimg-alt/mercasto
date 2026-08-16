<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdIndexSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_search_is_case_insensitive_and_prioritizes_title_matches(): void
    {
        Http::preventStrayRequests();

        $descriptionOnly = $this->activeAd('Departamento céntrico', 'Incluye un iPhone usado.');
        $titleMatch = $this->activeAd('iPhone 15 Pro', 'Equipo en buen estado.');

        $response = $this->getJson('/api/ads?search=iphone');

        $response->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.id', $titleMatch->id)
            ->assertJsonPath('data.1.id', $descriptionOnly->id);
    }

    public function test_catalog_search_rejects_queries_over_one_hundred_characters(): void
    {
        Http::preventStrayRequests();

        $this->getJson('/api/ads?search=' . str_repeat('a', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('search');
    }

    public function test_state_filter_falls_back_to_legacy_combined_location(): void
    {
        Http::preventStrayRequests();

        $legacy = $this->activeAd('Bicicleta en Boca del Río', 'Referencia editorial con ubicación heredada.');
        $legacy->forceFill(['location' => 'Boca del Río, Veracruz', 'state' => null, 'city' => null])->saveQuietly();

        $other = $this->activeAd('Bicicleta en Guadalajara', 'Referencia editorial en otro estado.');
        $other->forceFill(['location' => 'Guadalajara, Jalisco', 'state' => null, 'city' => null])->saveQuietly();

        $response = $this->getJson('/api/ads?state=Veracruz');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $legacy->id);
    }

    public function test_similar_ads_falls_back_to_category_without_a_canonical_vector(): void
    {
        $source = $this->activeAd('Mesa de comedor', 'Mesa de madera sólida.');
        $fallback = $this->activeAd('Sillas de comedor', 'Juego de cuatro sillas.');

        $response = $this->getJson('/api/ads/' . $source->id . '/similar');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $fallback->id);
    }

    private function activeAd(string $title, string $description): Ad
    {
        return Ad::query()->create([
            'user_id' => User::factory()->create()->id,
            'title' => $title,
            'description' => $description,
            'price' => 2500,
            'location' => 'Veracruz',
            'category' => 'general',
            'condition' => 'used',
            'status' => 'active',
            'is_catalog_filler' => false,
        ]);
    }
}

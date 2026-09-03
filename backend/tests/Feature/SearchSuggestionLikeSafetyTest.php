<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchSuggestionLikeSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_suggestions_treat_percent_as_literal_character(): void
    {
        $literal = $this->activeAd('Descuento 20% real');
        $this->activeAd('Descuento 200 real');

        $response = $this->getJson('/api/search/suggestions?q='.rawurlencode('20%'));

        $response->assertOk();
        $this->assertContains($literal->title, $response->json());
        $this->assertNotContains('Descuento 200 real', $response->json());
    }

    private function activeAd(string $title): Ad
    {
        return Ad::query()->create([
            'user_id' => User::factory()->create()->id,
            'title' => $title,
            'description' => 'Oferta segura',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
        ]);
    }
}

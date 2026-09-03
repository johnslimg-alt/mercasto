<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SearchReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_semantic_search_accepts_q_alias_and_keeps_exact_match_without_ai_call(): void
    {
        Http::preventStrayRequests();

        $ad = $this->activeAd('Bicicleta urbana', 'Lista para rodar por la ciudad.');
        $this->activeAd('Teléfono Android', 'Equipo en buen estado.');

        $response = $this->getJson('/api/search/semantic?q=bicicleta');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $ad->id)
            ->assertJsonPath('discovery.mode', 'exact')
            ->assertJsonPath('discovery.exact_first', true)
            ->assertJsonPath('discovery.semantic_authoritative', false);

        Http::assertNothingSent();
    }

    public function test_search_alias_keeps_known_item_precision_without_vector_call(): void
    {
        Http::preventStrayRequests();

        $ad = $this->activeAd('iPhone 14 Pro', 'Smartphone de 256 GB.');

        $response = $this->getJson('/api/search/semantic?search=iphone');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $ad->id)
            ->assertJsonPath('discovery.mode', 'exact');

        Http::assertNothingSent();
    }

    public function test_keyword_fallback_prioritizes_title_matches_over_description_only_matches(): void
    {
        Http::preventStrayRequests();

        $descriptionOnly = $this->activeAd('Departamento céntrico', 'Casa amplia con patio.');
        $titleMatch = $this->activeAd('Casa pequeña', 'Propiedad lista para habitar.');

        $response = $this->getJson('/api/search/semantic?q=casa');

        $response->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.id', $titleMatch->id)
            ->assertJsonPath('data.1.id', $descriptionOnly->id)
            ->assertJsonPath('discovery.mode', 'exact');
    }

    public function test_suggestions_return_active_exact_titles_and_are_bounded(): void
    {
        Cache::flush();
        $active = $this->activeAd('Casa luminosa', 'Anuncio activo.');
        $inactive = $this->activeAd('Casa archivada', 'Anuncio inactivo.');
        $inactive->forceFill(['status' => 'inactive'])->save();

        $response = $this->getJson('/api/search/suggestions?q=casa');

        $response->assertOk();
        $suggestions = $response->json();
        $this->assertIsArray($suggestions);
        $this->assertContains($active->title, $suggestions);
        $this->assertNotContains($inactive->title, $suggestions);
        $this->assertLessThanOrEqual(8, count($suggestions));
    }

    public function test_suggestion_query_length_is_bounded(): void
    {
        $this->getJson('/api/search/suggestions?q='.str_repeat('a', 81))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('q');
    }

    public function test_embedding_backfill_dry_run_targets_only_genuine_active_listings_by_default(): void
    {
        Http::preventStrayRequests();

        $this->activeAd('Bicicleta real', 'Anuncio publicado por una persona.');
        $catalog = $this->activeAd('Bicicleta de catálogo', 'Referencia informativa.');
        $catalog->forceFill(['is_catalog_filler' => true, 'attributes' => []])->save();

        $exitCode = Artisan::call('mercasto:generate-embeddings', ['--dry-run' => true]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString('Found 1 active genuine listings.', $output);
        $this->assertStringContainsString('no Ollama requests or database writes', $output);
        $this->assertDatabaseCount('embeddings', 0);
    }

    public function test_short_semantic_query_returns_a_controlled_empty_response(): void
    {
        Http::preventStrayRequests();

        $this->getJson('/api/search/semantic?q=x')
            ->assertOk()
            ->assertExactJson(['data' => [], 'total' => 0]);
    }

    public function test_semantic_query_length_is_bounded(): void
    {
        Http::preventStrayRequests();

        $this->getJson('/api/search/semantic?q='.str_repeat('a', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('q');
    }

    private function activeAd(string $title, string $description): Ad
    {
        return Ad::create([
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

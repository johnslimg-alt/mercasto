<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingQualityPreflightWritePathTest extends TestCase
{
    use RefreshDatabase;

    private function category(): void
    {
        Category::create([
            'slug' => 'autos',
            'name' => ['es' => 'Autos', 'en' => 'Cars'],
            'icon' => 'Car',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'title' => 'Sedán familiar usado',
            'price' => 145000,
            'description' => 'Vehículo cuidado, listo para una revisión presencial.',
            'location' => 'Boca del Río, Veracruz',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'autos',
            'subcategory' => 'Sedanes',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Sedanes'],
        ], $overrides);
    }

    public function test_create_blocks_hard_quality_failure_before_persistence(): void
    {
        $this->category();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', $this->payload([
            'title' => 'x',
        ]));

        $response->assertUnprocessable()
            ->assertJsonPath('quality_preflight.passes_hard_validation', false)
            ->assertJsonFragment(['title_too_short']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_create_returns_non_blocking_quality_warnings(): void
    {
        $this->category();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', $this->payload([
            'price' => 0,
            'description' => 'Vehículo disponible; más detalles en https://example.test/auto.',
        ]));

        $response->assertCreated()
            ->assertJsonPath('quality_preflight.passes_hard_validation', true)
            ->assertJsonFragment(['price_zero'])
            ->assertJsonFragment(['contact_data_in_copy'])
            ->assertJsonFragment(['photo_recommended']);

        $this->assertDatabaseCount('ads', 1);
    }

    public function test_edit_uses_the_same_preflight_and_preserves_existing_content_on_hard_failure(): void
    {
        $this->category();
        $user = User::factory()->create();
        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => 'Sedán familiar usado',
            'price' => 145000,
            'description' => 'Vehículo cuidado, listo para una revisión presencial.',
            'location' => 'Boca del Río, Veracruz',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'autos',
            'subcategory' => 'Sedanes',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Sedanes'],
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/ads/{$ad->id}", $this->payload([
            'description' => 'corta',
        ]));

        $response->assertUnprocessable()
            ->assertJsonPath('quality_preflight.passes_hard_validation', false)
            ->assertJsonFragment(['description_too_short']);

        $this->assertSame(
            'Vehículo cuidado, listo para una revisión presencial.',
            $ad->fresh()->description,
        );
    }
}

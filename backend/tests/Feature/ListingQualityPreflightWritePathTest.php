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

    private const PREVIEW_HEADER = 'X-Mercasto-Quality-Preflight';

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

    private function ad(User $user): Ad
    {
        return Ad::create([
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
    }

    public function test_unauthenticated_create_still_uses_the_authentication_gate(): void
    {
        $this->category();

        $response = $this->postJson('/api/ads', $this->payload([
            'title' => 'x',
        ]));

        $response->assertUnauthorized();
        $this->assertNull($response->json('quality_preflight'));
        $this->assertDatabaseCount('ads', 0);
    }

    public function test_missing_required_field_still_uses_canonical_request_validation(): void
    {
        $this->category();
        $user = User::factory()->create();
        $payload = $this->payload();
        unset($payload['title']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', $payload);

        $response->assertUnprocessable()->assertJsonValidationErrors(['title']);
        $this->assertNull($response->json('quality_preflight'));
        $this->assertDatabaseCount('ads', 0);
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

    public function test_preview_returns_warnings_without_creating_listing(): void
    {
        $this->category();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader(self::PREVIEW_HEADER, 'preview')
            ->postJson('/api/ads', $this->payload([
                'price' => 0,
                'description' => 'Vehículo disponible; más detalles en https://example.test/auto.',
            ]));

        $response->assertOk()
            ->assertJsonPath('quality_preflight.passes_hard_validation', true)
            ->assertJsonFragment(['price_zero'])
            ->assertJsonFragment(['contact_data_in_copy'])
            ->assertJsonFragment(['photo_recommended']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_preview_reports_duplicate_risk_without_creating_listing(): void
    {
        $this->category();
        $user = User::factory()->create();
        $this->ad($user);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader(self::PREVIEW_HEADER, 'preview')
            ->postJson('/api/ads', $this->payload());

        $response->assertOk()
            ->assertJsonPath('quality_preflight.passes_hard_validation', true)
            ->assertJsonFragment(['duplicate_listing_risk']);

        $this->assertDatabaseCount('ads', 1);
    }

    public function test_preview_hard_failure_is_rejected_without_creating_listing(): void
    {
        $this->category();
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader(self::PREVIEW_HEADER, 'preview')
            ->postJson('/api/ads', $this->payload(['title' => 'x']));

        $response->assertUnprocessable()
            ->assertJsonPath('quality_preflight.passes_hard_validation', false)
            ->assertJsonFragment(['title_too_short']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_incomplete_preview_never_falls_through_to_controller_write(): void
    {
        $this->category();
        $user = User::factory()->create();
        $payload = $this->payload();
        unset($payload['title']);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader(self::PREVIEW_HEADER, 'preview')
            ->postJson('/api/ads', $payload);

        $response->assertUnprocessable()
            ->assertJsonPath('quality_preflight.passes_hard_validation', false)
            ->assertJsonFragment(['incomplete_preview_payload']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_edit_uses_the_same_preflight_and_preserves_existing_content_on_hard_failure(): void
    {
        $this->category();
        $user = User::factory()->create();
        $ad = $this->ad($user);

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

    public function test_edit_preview_never_mutates_existing_listing(): void
    {
        $this->category();
        $user = User::factory()->create();
        $ad = $this->ad($user);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader(self::PREVIEW_HEADER, 'preview')
            ->postJson("/api/ads/{$ad->id}", $this->payload([
                'title' => 'Título de vista previa',
                'price' => 0,
            ]));

        $response->assertOk()
            ->assertJsonPath('quality_preflight.passes_hard_validation', true)
            ->assertJsonFragment(['price_zero']);

        $ad->refresh();
        $this->assertSame('Sedán familiar usado', $ad->title);
        $this->assertSame(145000.0, (float) $ad->price);
    }
}

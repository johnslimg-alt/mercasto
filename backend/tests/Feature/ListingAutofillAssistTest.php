<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListingAutofillAssistTest extends TestCase
{
    use RefreshDatabase;

    public function test_autofill_requires_authentication(): void
    {
        $this->postJson('/api/ads/autofill', ['hint_text' => 'SUV usado'])
            ->assertUnauthorized();
    }

    public function test_disabled_autofill_soft_fails_without_creating_listing(): void
    {
        config(['listing_autofill.enabled' => false]);
        Sanctum::actingAs(User::factory()->create());
        $before = DB::table('ads')->count();

        $this->postJson('/api/ads/autofill', ['hint_text' => 'SUV usado'])
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('reason', 'disabled')
            ->assertJsonPath('authoritative', false)
            ->assertJsonPath('seller_confirmation_required', true);

        $this->assertSame($before, DB::table('ads')->count());
    }

    public function test_private_gateway_suggestions_are_canonicalized_and_low_confidence_is_dropped(): void
    {
        $category = DB::table('categories')->where('slug', 'motor')->first();
        $this->assertNotNull($category);
        DB::table('category_attributes')->updateOrInsert(
            ['category_id' => $category->id, 'key' => 'marca'],
            [
                'label' => json_encode(['es' => 'Marca']),
                'type' => 'select',
                'options' => json_encode(['Toyota', 'Nissan']),
                'required' => false,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        config([
            'listing_autofill.enabled' => true,
            'listing_autofill.gateway_url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'autofill-test-token',
        ]);
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/autofill/listing' => Http::response([
                'provider' => 'ollama',
                'runtime' => 'private_local',
                'model' => 'qwen3-vl:test',
                'gateway_version' => 'test-gateway',
                'rollout_mode' => 'suggestion_only',
                'authoritative' => false,
                'warnings' => ['invalid_attribute_key_dropped'],
                'proposal' => [
                    'category' => ['value' => 'motor', 'confidence' => 0.96],
                    'subcategory' => ['value' => 'SUV', 'confidence' => 0.91],
                    'attributes' => [
                        'marca' => ['value' => 'Toyota', 'confidence' => 0.88],
                        'serial_number' => ['value' => 'invented', 'confidence' => 0.99],
                    ],
                    'title' => ['value' => '<b>Toyota SUV</b>', 'confidence' => 0.82],
                    'description' => ['value' => 'Descripción incierta', 'confidence' => 0.20],
                ],
            ], 200),
        ]);

        $before = DB::table('ads')->count();
        $response = $this->postJson('/api/ads/autofill', ['hint_text' => 'Toyota SUV usado']);

        $response->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('suggestions.category.value', 'motor')
            ->assertJsonPath('suggestions.subcategory.value', 'SUV')
            ->assertJsonPath('suggestions.attributes.marca.value', 'Toyota')
            ->assertJsonPath('suggestions.title.value', 'Toyota SUV')
            ->assertJsonPath('suggestions.description', null)
            ->assertJsonPath('authoritative', false)
            ->assertJsonPath('seller_confirmation_required', true);
        $response->assertJsonMissingPath('suggestions.attributes.serial_number');
        $this->assertSame($before, DB::table('ads')->count());
    }

    public function test_uploaded_image_is_reencoded_before_private_gateway(): void
    {
        Storage::fake('local');
        config([
            'listing_autofill.enabled' => true,
            'listing_autofill.gateway_url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'autofill-test-token',
        ]);
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/autofill/listing' => Http::response([
                'provider' => 'ollama',
                'runtime' => 'private_local',
                'model' => 'qwen3-vl:test',
                'gateway_version' => 'test-gateway',
                'rollout_mode' => 'suggestion_only',
                'authoritative' => false,
                'proposal' => [],
                'warnings' => [],
            ], 200),
        ]);

        $image = UploadedFile::fake()->image('seller.png', 1200, 900);
        $this->post('/api/ads/autofill', ['images' => [$image]], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('available', true);

        Http::assertSent(function (Request $request): bool {
            $encoded = $request->data()['images_base64'][0] ?? null;
            if (! is_string($encoded)) {
                return false;
            }
            $bytes = base64_decode($encoded, true);
            $info = is_string($bytes) ? @getimagesizefromstring($bytes) : false;

            return is_array($info)
                && ($info['mime'] ?? null) === 'image/jpeg'
                && max((int) $info[0], (int) $info[1]) <= 768;
        });
    }

    public function test_gateway_failure_keeps_manual_path_available(): void
    {
        config([
            'listing_autofill.enabled' => true,
            'listing_autofill.gateway_url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'autofill-test-token',
        ]);
        Sanctum::actingAs(User::factory()->create());
        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/autofill/listing' => Http::response(['error' => 'down'], 503),
        ]);

        $this->postJson('/api/ads/autofill', ['hint_text' => 'Servicio de plomería'])
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('reason', 'ai_unavailable')
            ->assertJsonPath('seller_confirmation_required', true);
    }
}

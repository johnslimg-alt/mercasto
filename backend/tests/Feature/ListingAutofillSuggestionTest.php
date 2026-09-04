<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AiDescriptionController;
use App\Http\Controllers\Api\AutofillAwareAiDescriptionController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListingAutofillSuggestionTest extends TestCase
{
    use RefreshDatabase;

    public function test_autofill_reuses_protected_description_route_and_never_applies_suggestions(): void
    {
        config([
            'listing_autofill.enabled' => true,
            'listing_autofill.url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'autofill-test-token',
        ]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $categoryId = DB::table('categories')->insertGetId([
            'slug' => 'motor',
            'name' => json_encode(['es' => 'Autos', 'en' => 'Cars']),
            'icon' => 'car',
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('category_attributes')->insert([
            'category_id' => $categoryId,
            'key' => 'marca',
            'label' => json_encode(['es' => 'Marca']),
            'type' => 'select',
            'options' => json_encode([['value' => 'Nissan'], ['value' => 'Toyota']]),
            'required' => false,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/autofill/listing' => Http::response($this->gatewayResponse(), 200),
        ]);

        $this->assertInstanceOf(AutofillAwareAiDescriptionController::class, app(AiDescriptionController::class));
        $response = $this->post('/api/ads/generate-description', [
            'mode' => 'listing_autofill',
            'short_text' => 'Nissan Versa usado',
            'locale' => 'es',
            'images' => [UploadedFile::fake()->image('versa.jpg', 200, 150)->size(100)],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('applied', false)
            ->assertJsonPath('suggestions.authoritative', false)
            ->assertJsonPath('suggestions.requires_seller_confirmation', true)
            ->assertJsonPath('suggestions.category.value', 'motor')
            ->assertJsonPath('suggestions.attributes.marca.value', 'Nissan');

        Http::assertSent(function (Request $request): bool {
            $data = $request->data();
            $taxonomy = collect($data['taxonomy'] ?? [])->keyBy('slug');
            $motor = $taxonomy->get('motor', []);
            $marca = collect($motor['attributes'] ?? [])->firstWhere('key', 'marca');

            return $request->url() === 'http://mercasto-ai-gateway:8080/v1/autofill/listing'
                && ($request->header('X-Mercasto-Internal-Token')[0] ?? null) === 'autofill-test-token'
                && ($data['short_text'] ?? null) === 'Nissan Versa usado'
                && count($data['images_base64'] ?? []) === 1
                && in_array('Nissan', $marca['options'] ?? [], true);
        });
    }

    public function test_autofill_failure_is_optional_and_missing_input_is_rejected_cleanly(): void
    {
        config([
            'listing_autofill.enabled' => true,
            'listing_autofill.url' => 'http://mercasto-ai-gateway:8080',
            'services.ai_moderation_gateway.token' => 'autofill-test-token',
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ads/generate-description', [
            'mode' => 'listing_autofill',
            'short_text' => '',
        ])->assertStatus(422);

        Http::fake([
            'http://mercasto-ai-gateway:8080/v1/autofill/listing' => Http::response(['detail' => 'down'], 503),
        ]);
        $this->postJson('/api/ads/generate-description', [
            'mode' => 'listing_autofill',
            'short_text' => 'Bicicleta urbana',
        ])->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('applied', false);
    }

    private function gatewayResponse(): array
    {
        $field = fn (?string $value, float $confidence): array => [
            'value' => $value,
            'confidence' => $confidence,
        ];

        return [
            'category' => $field('motor', 0.95),
            'subcategory_hint' => $field('Autos usados', 0.72),
            'attributes' => ['marca' => $field('Nissan', 0.92)],
            'title' => $field('Nissan Versa usado', 0.85),
            'description' => $field('Nissan Versa usado. Consulta detalles con el vendedor.', 0.78),
            'runtime' => 'private_local',
            'model' => 'qwen3-vl:test',
            'authoritative' => false,
            'requires_seller_confirmation' => true,
        ];
    }
}

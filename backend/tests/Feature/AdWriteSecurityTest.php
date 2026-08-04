<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdWriteSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_owner_cannot_read_or_mutate_another_users_ad(): void
    {
        $owner = User::factory()->create(['role' => 'individual']);
        $attacker = User::factory()->create(['role' => 'individual']);
        $ad = $this->createAd($owner, ['status' => 'active']);

        $this->actingAs($attacker, 'sanctum');

        $this->getJson("/api/ads/{$ad->id}/edit")->assertForbidden();
        $this->postJson("/api/ads/{$ad->id}", [])->assertForbidden();
        $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/pause")->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/activate")->assertForbidden();
        $this->postJson("/api/ads/{$ad->id}/republish")->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/renew")->assertForbidden();
        $this->deleteJson("/api/ads/{$ad->id}")->assertForbidden();

        $this->assertDatabaseHas('ads', [
            'id' => $ad->id,
            'user_id' => $owner->id,
            'status' => 'active',
        ]);
    }

    public function test_ad_creation_rejects_non_image_and_oversized_image_uploads(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => 'individual']);
        $this->createCategory();

        $basePayload = $this->validAdPayload();

        $script = UploadedFile::fake()->createWithContent('payload.php', '<?php echo "unsafe";');
        $this->actingAs($user, 'sanctum')
            ->post('/api/ads', [...$basePayload, 'images' => [$script]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['images.0']);

        $oversizedImage = UploadedFile::fake()
            ->image('oversized.jpg', 1200, 900)
            ->size(5121);

        $this->actingAs($user, 'sanctum')
            ->post('/api/ads', [...$basePayload, 'images' => [$oversizedImage]])
            ->assertUnprocessable()
             ->assertJsonValidationErrors(['images.0']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_ad_mutation_routes_enforce_burst_rate_limit(): void
    {
        $user = User::factory()->create(['role' => 'individual']);
        $ad = $this->createAd($user, ['status' => 'active']);

        $this->actingAs($user, 'sanctum');

        for ($attempt = 1; $attempt <= 30; $attempt++) {
            $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])
                ->assertOk();
        }

        $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])
            ->assertTooManyRequests()
            ->assertJsonPath('error', 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
    }

    public function test_bulk_upload_route_enforces_upload_rate_limit_before_processing(): void
    {
        $user = User::factory()->create(['role' => 'business']);

        $this->actingAs($user, 'sanctum');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/ads/bulk-upload', [])
                ->assertUnprocessable();
        }

        $this->postJson('/api/ads/bulk-upload', [])
            ->assertTooManyRequests()
            ->assertJsonPath('error', 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
    }

    private function createAd(User $user, array $overrides = []): Ad
    {
        return Ad::create([
            'user_id' => $user->id,
            'title' => 'Anuncio protegido',
            'description' => 'Descripción de seguridad.',
            'price' => 1000,
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'subcategory' => 'Telefonía',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Telefonía'],
            'status' => 'active',
            ...$overrides,
        ]);
    }

    private function createCategory(): Category
    {
        return Category::create([
            'slug' => 'electronica',
            'name' => ['es' => 'Electrónica', 'en' => 'Electronics'],
            'icon' => 'Monitor',
        ]);
    }

    /** @return array<string, mixed> */
    private function validAdPayload(): array
    {
        return [
            'title' => 'Teléfono de prueba',
            'price' => 1000,
            'description' => 'Descripción de prueba.',
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'subcategory' => 'Telefonía',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Telefonía'],
      ];
    }
}

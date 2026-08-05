<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Тестирование создания объявления авторизованным пользователем.
     */
    public function test_authenticated_user_can_create_ad()
    {
        // Фейковое хранилище, чтобы не засорять реальную папку картинками/видео
        Storage::fake('public');

        Category::create(['slug' => 'electronica', 'name' => ['es' => 'Electrónica', 'en' => 'Electronics'], 'icon' => 'Monitor']);

        // Создаем фейкового пользователя в памяти и авторизуемся под ним
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', [
            'title' => 'iPhone 15 Pro',
            'price' => 18000,
            'description' => 'Nuevo en caja sellada.',
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'condition' => 'nuevo',
            'attributes' => ['subcategory' => 'Smartphones'],
        ]);

        $response->assertStatus(201)->assertJsonFragment(['title' => 'iPhone 15 Pro', 'category' => 'electronica']);

        $this->assertDatabaseHas('ads', [
            'title' => 'iPhone 15 Pro',
            'user_id' => $user->id,
            'expires_at' => null,
        ]);
    }

    public function test_authenticated_user_can_create_ad_with_six_images()
    {
        Storage::fake('public');

        Category::firstOrCreate(
            ['slug' => 'hogar'],
            ['name' => ['es' => 'Hogar', 'en' => 'Home'], 'icon' => 'Home'],
        );
        $user = User::factory()->create();
        $images = collect(range(1, 6))
            ->map(fn (int $index) => UploadedFile::fake()->image("mueble-{$index}.jpg", 1200, 900))
            ->all();

        $response = $this->actingAs($user, 'sanctum')->post('/api/ads', [
            'title' => 'Mueble para baño',
            'price' => 650,
            'description' => 'Mueble en madera MDF laqueado.',
            'location' => 'Iztapalapa, Ciudad de México',
            'city' => 'Iztapalapa',
            'state' => 'Ciudad de México',
            'latitude' => 19.3573,
            'longitude' => -99.0280,
            'category' => 'hogar',
            'subcategory' => 'Muebles',
            'condition' => 'nuevo',
            'attributes' => [
                'tipo' => 'Muebles',
                'subcategory' => 'Muebles',
            ],
            'images' => $images,
        ]);

        $response->assertCreated();

        $storedImages = json_decode(Ad::query()->latest('id')->value('image_url'), true);
        $this->assertCount(6, $storedImages);
        $this->assertGreaterThan(255, strlen(json_encode($storedImages)));
    }

    public function test_public_ad_responses_do_not_expose_seller_email()
    {
        $user = User::factory()->create([
            'email' => 'seller@example.com',
            'name' => 'Seller',
        ]);

        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => 'Bicicleta urbana',
            'description' => 'Lista para rodar.',
            'price' => 3500,
            'location' => 'Guadalajara',
            'category' => 'deportes',
            'status' => 'active',
        ]);

        $indexResponse = $this->getJson('/api/ads');
        $indexResponse->assertOk();
        $this->assertArrayNotHasKey('email', $indexResponse->json('data.0.user'));

        $showResponse = $this->getJson("/api/ads/{$ad->id}");
        $showResponse->assertOk();
        $this->assertArrayNotHasKey('email', $showResponse->json('user'));
    }
}

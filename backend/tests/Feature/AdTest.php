<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
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

    public function test_authenticated_user_can_create_ad_without_exact_coordinates()
    {
        Storage::fake('public');
        Http::fake([
            'https://nominatim.openstreetmap.org/*' => Http::response([], 503),
            '*' => Http::response([], 422),
        ]);

        Category::create(['slug' => 'electronica', 'name' => ['es' => 'Electrónica', 'en' => 'Electronics'], 'icon' => 'Monitor']);
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', [
            'title' => 'Laptop para venta',
            'price' => 12500,
            'description' => 'Equipo en buen estado.',
            'location' => 'Boca del Río, Veracruz',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'category' => 'electronica',
            'subcategory' => 'Computadoras',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Computadoras'],
        ]);

        $response->assertCreated();
        $ad = Ad::query()->latest('id')->firstOrFail();
        $this->assertEqualsWithDelta(19.1738, (float) $ad->latitude, 0.0001);
        $this->assertEqualsWithDelta(-96.1342, (float) $ad->longitude, 0.0001);
    }

    public function test_authenticated_user_can_change_location_without_exact_coordinates()
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/*' => Http::response([], 503),
            '*' => Http::response([], 422),
        ]);

        Category::create(['slug' => 'electronica', 'name' => ['es' => 'Electrónica', 'en' => 'Electronics'], 'icon' => 'Monitor']);
        $user = User::factory()->create();
        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => 'Laptop original',
            'price' => 10000,
            'description' => 'Descripción original',
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'subcategory' => 'Computadoras',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Computadoras'],
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/ads/{$ad->id}", [
            'title' => 'Laptop actualizada',
            'price' => 10000,
            'description' => 'Descripción actualizada',
            'location' => 'Guadalajara, Jalisco',
            'city' => 'Guadalajara',
            'state' => 'Jalisco',
            'category' => 'electronica',
            'subcategory' => 'Computadoras',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Computadoras'],
        ]);

        $response->assertOk();
        $ad->refresh();
        $this->assertEqualsWithDelta(20.6597, (float) $ad->latitude, 0.0001);
        $this->assertEqualsWithDelta(-103.3496, (float) $ad->longitude, 0.0001);
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

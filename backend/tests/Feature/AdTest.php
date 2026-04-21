<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        
        // Создаем фейкового пользователя в памяти и авторизуемся под ним
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ads', [
            'title' => 'iPhone 15 Pro',
            'price' => 18000,
            'description' => 'Nuevo en caja sellada.',
            'location' => 'Ciudad de México',
            'category' => 'telefonia',
            'condition' => 'nuevo',
        ]);

        $response->assertStatus(201)->assertJsonFragment(['title' => 'iPhone 15 Pro', 'category' => 'telefonia']);

        $this->assertDatabaseHas('ads', [
            'title' => 'iPhone 15 Pro',
            'user_id' => $user->id,
        ]);
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

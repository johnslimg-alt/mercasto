<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Тестирование: Администратор может создать категорию.
     */
    public function test_admin_can_create_category()
    {
        // Создаем пользователя с ролью admin
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/categories', [
            'slug' => 'test-category',
            'name_es' => 'Categoría de Prueba',
            'name_en' => 'Test Category',
            'icon' => 'Star',
            'sort_order' => 10,
        ]);

        $response->assertStatus(201)->assertJsonFragment(['slug' => 'test-category']);
        $this->assertDatabaseHas('categories', ['slug' => 'test-category']);
    }

    /**
     * Тестирование: Обычный пользователь получает отказ (403).
     */
    public function test_non_admin_cannot_create_category()
    {
        // Создаем обычного пользователя
        $user = User::factory()->create(['role' => 'individual']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/categories', [
            'slug' => 'hacked-category',
            'name_es' => 'Hacked',
            'name_en' => 'Hacked',
            'icon' => 'Skull',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('categories', ['slug' => 'hacked-category']);
    }
}
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    // Эта примесь будет автоматически очищать базу данных после каждого теста
    use RefreshDatabase;

    /**
     * Тестирование успешной регистрации пользователя.
     */
    public function test_user_can_register()
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Usuario Test',
            'email' => 'test@mercasto.com',
            'password' => 'secret_password',
            'role' => 'individual',
        ]);

        // Проверяем, что сервер вернул статус 201 (Created) и правильную структуру
        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'access_token', 'user' => ['id', 'name', 'email', 'role']]);

        // Проверяем, что запись действительно появилась в базе данных
        $this->assertDatabaseHas('users', [
            'email' => 'test@mercasto.com',
        ]);
    }

    /**
     * Тестирование успешной авторизации пользователя.
     */
    public function test_user_can_login()
    {
        $user = \App\Models\User::factory()->create([
            'password' => bcrypt('secret_password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'secret_password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'access_token', 'token_type', 'user']);
    }
}
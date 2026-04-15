<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class LoginFrontendTest extends DuskTestCase
{
    use DatabaseMigrations; // Очищаем БД перед тестом

    /**
     * Тестирование процесса входа через React UI.
     */
    public function test_user_can_login_via_ui()
    {
        // Создаем тестового пользователя
        $user = User::factory()->create([
            'email' => 'juan@example.com',
            'password' => bcrypt('password123'),
        ]);

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('http://localhost:5173') // Укажите порт вашего Vite-сервера
                    ->waitForText('Mercasto') // Ждем загрузки React
                    ->click('header button:has(svg.lucide-user)') // Кликаем по иконке профиля в шапке
                    ->waitForText('Iniciar Sesión') // Ждем появления модалки
                    ->type('email', $user->email)
                    ->type('password', 'password123')
                    ->press('Iniciar Sesión')
                    // Ждем, пока модалка исчезнет и UI обновится, показывая имя
                    ->waitForText($user->name)
                    ->assertSee($user->name);
        });
    }
}
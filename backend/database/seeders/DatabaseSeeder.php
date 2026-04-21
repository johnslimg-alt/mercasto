<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Подключаем наши кастомные генераторы данных!
        $this->call([MercastoCategoriesSeeder::class]);
        
        // Защита продакшена: предотвращаем случайную заливку 1000 тестовых объявлений в реальную БД
        if (!app()->environment('production')) {
            $this->call([
                TestAdsSeeder::class,
            ]);
        }
    }
}

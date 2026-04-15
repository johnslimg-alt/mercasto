<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // например: 'motor'
            $table->json('name'); // {"es": "Motor", "en": "Motors"}
            $table->string('icon'); // Название иконки для фронтенда (Car, Home)
            $table->integer('sort_order')->default(0); // Порядок вывода
            $table->timestamps();
        });

        // Базовое наполнение
        DB::table('categories')->insert([
            ['slug' => 'motor', 'icon' => 'Car', 'name' => json_encode(['es' => 'Motor', 'en' => 'Motors']), 'sort_order' => 1],
            ['slug' => 'inmobiliaria', 'icon' => 'Home', 'name' => json_encode(['es' => 'Inmuebles', 'en' => 'Real Estate']), 'sort_order' => 2],
            ['slug' => 'empleo', 'icon' => 'Briefcase', 'name' => json_encode(['es' => 'Empleo', 'en' => 'Jobs']), 'sort_order' => 3],
            ['slug' => 'servicios', 'icon' => 'Wrench', 'name' => json_encode(['es' => 'Servicios', 'en' => 'Services']), 'sort_order' => 4],
            ['slug' => 'informatica', 'icon' => 'Monitor', 'name' => json_encode(['es' => 'Informática', 'en' => 'Computers']), 'sort_order' => 5],
            ['slug' => 'telefonia', 'icon' => 'Smartphone', 'name' => json_encode(['es' => 'Telefonía', 'en' => 'Phones']), 'sort_order' => 6],
            ['slug' => 'hogar', 'icon' => 'Sofa', 'name' => json_encode(['es' => 'Hogar', 'en' => 'Home']), 'sort_order' => 7],
            ['slug' => 'moda', 'icon' => 'Shirt', 'name' => json_encode(['es' => 'Moda', 'en' => 'Fashion']), 'sort_order' => 8],
            ['slug' => 'bebes', 'icon' => 'Baby', 'name' => json_encode(['es' => 'Bebés', 'en' => 'Babies']), 'sort_order' => 9],
            ['slug' => 'mascotas', 'icon' => 'PawPrint', 'name' => json_encode(['es' => 'Mascotas', 'en' => 'Pets']), 'sort_order' => 10],
            ['slug' => 'ocio', 'icon' => 'Bike', 'name' => json_encode(['es' => 'Ocio', 'en' => 'Hobbies']), 'sort_order' => 11],
            ['slug' => 'boletos', 'icon' => 'Ticket', 'name' => json_encode(['es' => 'Boletos', 'en' => 'Tickets']), 'sort_order' => 12],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
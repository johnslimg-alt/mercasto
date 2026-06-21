<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'description')) {
                $table->json('description')->nullable()->after('name');
            }
        });

        // Seed description values for all existing categories
        $descriptions = [
            'coches' => [
                'es' => 'Autos, camionetas, motocicletas y todo tipo de vehículos motorizados.',
                'en' => 'Cars, trucks, motorcycles, and all types of motor vehicles.',
                'ru' => 'Легковые автомобили, внедорожники, мотоциклы и другие транспортные средства.'
            ],
            'motor' => [
                'es' => 'Motos, cuatrimotos y repuestos para vehículos.',
                'en' => 'Motorcycles, ATVs, and auto parts.',
                'ru' => 'Мотоциклы, квадроциклы и запчасти для автотранспорта.'
            ],
            'inmobiliaria' => [
                'es' => 'Casas, departamentos, terrenos y locales comerciales en venta o renta.',
                'en' => 'Houses, apartments, lands, and commercial spaces for sale or rent.',
                'ru' => 'Дома, квартиры, земельные участки и коммерческая недвижимость.'
            ],
            'empleo' => [
                'es' => 'Ofertas de trabajo y oportunidades profesionales en diversas áreas.',
                'en' => 'Job offers and career opportunities in various fields.',
                'ru' => 'Вакансии и карьерные предложения в различных отраслях.'
            ],
            'servicios' => [
                'es' => 'Servicios profesionales, del hogar, clases y eventos.',
                'en' => 'Professional and home services, classes, and events.',
                'ru' => 'Профессиональные и бытовые услуги, обучение, ремонт и мероприятия.'
            ],
            'moda' => [
                'es' => 'Ropa, calzado, accesorios, relojes y artículos de belleza.',
                'en' => 'Clothing, footwear, accessories, watches, and beauty items.',
                'ru' => 'Одежда, обувь, аксессуары, часы и товары для красоты.'
            ],
            'hogar' => [
                'es' => 'Muebles, electrodomésticos, decoración y artículos para el jardín.',
                'en' => 'Furniture, appliances, decor, and garden items.',
                'ru' => 'Мебель, бытовая техника, элементы декора и товары для сада.'
            ],
            'electronica' => [
                'es' => 'Televisores, consolas de videojuegos, audio y cámaras.',
                'en' => 'TVs, video game consoles, audio, and cameras.',
                'ru' => 'Телевизоры, игровые приставки, аудиосистемы и видеокамеры.'
            ],
            'telefonos' => [
                'es' => 'Smartphones, wearables, fundas y accesorios telefónicos.',
                'en' => 'Smartphones, wearables, cases, and phone accessories.',
                'ru' => 'Смартфоны, носимые гаджеты, чехлы и аксессуары для телефонов.'
            ],
            'deportes' => [
                'es' => 'Artículos deportivos, bicicletas, instrumentos musicales y libros.',
                'en' => 'Sporting goods, bicycles, musical instruments, and books.',
                'ru' => 'Спортивные товары, велосипеды, музыкальные инструменты и книги.'
            ],
            'infantil' => [
                'es' => 'Juguetes, juegos de mesa, ropa infantil y artículos escolares.',
                'en' => 'Toys, board games, kids clothing, and school supplies.',
                'ru' => 'Игрушки, настольные игры, детская одежда и товары для школы.'
            ],
            'bebes' => [
                'es' => 'Carriolas, cunas, ropa para bebés y juguetes interactivos.',
                'en' => 'Strollers, cribs, baby clothing, and interactive toys.',
                'ru' => 'Коляски, кроватки, детское питание, одежда для младенцев и игрушки.'
            ],
            'mascotas' => [
                'es' => 'Alimentos, accesorios, juguetes y productos de higiene para mascotas.',
                'en' => 'Food, accessories, toys, and hygiene products for pets.',
                'ru' => 'Корма, игрушки, аксессуары и средства гигиены для домашних животных.'
            ],
            'negocios' => [
                'es' => 'Traspasos de negocios, maquinaria, mobiliario comercial y lotes de mercancía.',
                'en' => 'Business transfers, machinery, commercial furniture, and merchandise lots.',
                'ru' => 'Готовый бизнес, станки и оборудование, торговая мебель и оптовые партии.'
            ],
            'formacion' => [
                'es' => 'Cursos, talleres, boletos para eventos, conciertos y viajes.',
                'en' => 'Courses, workshops, tickets for events, concerts, and trips.',
                'ru' => 'Образовательные курсы, семинары, билеты на концерты и путевки.'
            ],
            'informatica' => [
                'es' => 'Laptops, computadoras de escritorio, componentes y accesorios de PC.',
                'en' => 'Laptops, desktop computers, components, and PC accessories.',
                'ru' => 'Ноутбуки, системные блоки, комплектующие и периферия для ПК.'
            ],
            'coleccionismo' => [
                'es' => 'Monedas, billetes, estampillas, antigüedades y figuras coleccionables.',
                'en' => 'Coins, banknotes, stamps, antiques, and collectible figures.',
                'ru' => 'Монеты, марки, банкноты, антиквариат и коллекционные фигурки.'
            ]
        ];

        foreach ($descriptions as $slug => $desc) {
            DB::table('categories')
                ->where('slug', $slug)
                ->update(['description' => json_encode($desc)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};

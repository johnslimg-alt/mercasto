<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Str;

class TestAdsSeeder extends Seeder
{
    public function run()
    {
        // Создаем фейкового PRO-продавца для тестовых товаров
        $user = User::firstOrCreate(
            ['email' => 'tienda_demo@mercasto.com'],
            [
                'name' => 'Tienda Oficial (Demo)',
                'password' => bcrypt('password123'),
                'role' => 'business',
                'is_verified' => true,
                'ip_address' => '127.0.0.1'
            ]
        );

        // Реалистичные подкатегории (названия товаров) для генерации
        $categories = [
            'motor' => ['Honda Civic 2020', 'Llantas deportivas rin 17', 'Casco para moto', 'Nissan Versa Advance', 'Filtro de aceite', 'Moto Yamaha 250cc'],
            'inmobiliaria' => ['Departamento 2 recámaras', 'Casa con jardín amplio', 'Oficina céntrica amueblada', 'Terreno campestre', 'Local comercial'],
            'empleo' => ['Desarrollador Web Junior', 'Cajero bilingüe', 'Mesero con experiencia', 'Chofer repartidor', 'Gerente de ventas'],
            'servicios' => ['Plomería 24/7 urgencias', 'Limpieza profunda de hogar', 'Clases de inglés online', 'Reparación de Aire Acondicionado'],
            'informatica' => ['MacBook Pro M2 512GB', 'Monitor Dell 27" 4K', 'Teclado mecánico RGB', 'Mouse inalámbrico Logitech', 'PC Gamer Armada'],
            'telefonia' => ['iPhone 13 Pro Max', 'Samsung Galaxy S23 Ultra', 'Funda protectora uso rudo', 'Cargador carga rápida 20W', 'AirPods Pro'],
            'hogar' => ['Sofá minimalista 3 plazas', 'Comedor de madera 6 sillas', 'Refrigerador Inverter LG', 'Licuadora Ninja', 'Cama matrimonial'],
            'moda' => ['Chamarra de cuero vintage', 'Tenis Nike Air Max', 'Reloj Casio G-Shock', 'Lentes de sol Ray-Ban', 'Bolso de diseñador'],
            'bebes' => ['Carriola de viaje plegable', 'Cuna de madera convertible', 'Ropa para bebé 6 meses', 'Monitor de bebé con cámara'],
            'mascotas' => ['Bulto croquetas Nupec 15kg', 'Cama acolchada para perro/gato', 'Correa retráctil 5m', 'Acuario equipado 50L'],
            'ocio' => ['Bicicleta de montaña R29', 'Guitarra acústica Fender', 'Juego de mesa Catan', 'Raqueta de tenis Wilson', 'Tienda de campaña'],
            'boletos' => ['Boleto Concierto VIP', 'Abono festival 3 días', 'Entrada teatro 2 personas', 'Pase anual museo']
        ];

        // Utilizamos imágenes específicas por categoría que se cachean en el navegador para evitar el bloqueo por límite de peticiones (Rate Limit) de Unsplash
        $categoryImages = [
            'motor' => 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
            'inmobiliaria' => 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
            'empleo' => 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
            'servicios' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
            'informatica' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
            'telefonia' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
            'hogar' => 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
            'moda' => 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
            'bebes' => 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80',
            'mascotas' => 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80',
            'ocio' => 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=800&q=80',
            'boletos' => 'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?w=800&q=80'
        ];

        foreach ($categories as $categorySlug => $items) {
            for ($i = 0; $i < 20; $i++) {
                $itemName = $items[array_rand($items)];
                Ad::create([
                    'user_id' => $user->id,
                    'title' => $itemName . ' - Oferta ' . rand(1, 999),
                    'price' => rand(200, 50000),
                    'description' => "Excelente oportunidad. Este artículo ({$itemName}) se encuentra en perfectas condiciones. Entrega inmediata en punto céntrico o envío disponible.\n\n¡No dejes pasar esta oferta!",
                    'location' => 'Ciudad de México, CDMX',
                    'category' => $categorySlug,
                    'condition' => (rand(0, 1) ? 'nuevo' : 'usado'),
                    'image_url' => json_encode([$categoryImages[$categorySlug] ?? 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800']),
                    'status' => 'active',
                    'views' => rand(15, 2500),
                    'promoted' => rand(0, 10) > 8 ? 'destacado' : (rand(0, 10) > 8 ? 'urgente' : null),
                ]);
            }
        }
    }
}
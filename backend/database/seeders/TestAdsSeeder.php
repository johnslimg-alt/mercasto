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

        $locations = [
            'Aguascalientes, AGS', 'Tijuana, BC', 'Mexicali, BC', 'La Paz, BCS', 'Los Cabos, BCS',
            'Campeche, CAMP', 'Tuxtla Gutiérrez, CHIS', 'San Cristóbal, CHIS', 'Chihuahua, CHIH', 'Ciudad Juárez, CHIH',
            'Ciudad de México, CDMX', 'Polanco, CDMX', 'Coyoacán, CDMX', 'Condesa, CDMX',
            'Saltillo, COAH', 'Torreón, COAH', 'Colima, COL', 'Manzanillo, COL', 'Durango, DGO',
            'Toluca, EDOMEX', 'Ecatepec, EDOMEX', 'Naucalpan, EDOMEX', 'León, GTO', 'Guanajuato, GTO',
            'Acapulco, GRO', 'Chilpancingo, GRO', 'Pachuca, HGO', 'Guadalajara, JAL', 'Zapopan, JAL', 'Puerto Vallarta, JAL',
            'Morelia, MICH', 'Uruapan, MICH', 'Cuernavaca, MOR', 'Tepic, NAY', 'Monterrey, NL', 'San Pedro Garza García, NL',
            'Oaxaca, OAX', 'Puerto Escondido, OAX', 'Puebla, PUE', 'Cholula, PUE', 'Querétaro, QRO',
            'Cancún, ROO', 'Playa del Carmen, ROO', 'Tulum, ROO', 'San Luis Potosí, SLP',
            'Culiacán, SIN', 'Mazatlán, SIN', 'Hermosillo, SON', 'Villahermosa, TAB',
            'Tampico, TAMPS', 'Reynosa, TAMPS', 'Tlaxcala, TLAX', 'Veracruz, VER', 'Xalapa, VER',
            'Mérida, YUC', 'Valladolid, YUC', 'Zacatecas, ZAC'
        ];

        $catalog = [
            'motor' => [
                'Autos Compactos' => ['Nissan Versa 2021', 'VW Jetta 2019', 'Chevrolet Aveo 2022', 'Honda Civic 2020'],
                'Camionetas y SUV' => ['Honda CR-V 2020', 'Toyota RAV4 2019', 'Ford Trax 2021', 'Mazda CX-5'],
                'Motos' => ['Yamaha R6 2020', 'Honda CBR 250', 'Italika DM200', 'Casco para moto'],
                'Autopartes' => ['Llantas Michelin Rin 17', 'Batería LTH', 'Filtro de aceite deportivo']
            ],
            'inmobiliaria' => [
                'Casas en Venta' => ['Hermosa Casa 3 Recámaras', 'Residencia en Privada', 'Casa con Jardín amplio'],
                'Departamentos en Renta' => ['Departamento 2 recámaras', 'Loft Moderno', 'Penthouse con Vista'],
                'Terrenos' => ['Terreno Comercial 500m2', 'Lote Campestre', 'Terreno para Inversión'],
                'Locales Comerciales' => ['Local en Plaza Comercial', 'Bodega Industrial', 'Oficina céntrica amueblada']
            ],
            'empleo' => [
                'Tecnología' => ['Desarrollador Web Junior', 'Ingeniero Backend PHP', 'Soporte Técnico IT'],
                'Ventas' => ['Ejecutivo de Ventas', 'Gerente Comercial', 'Asesor Telefónico'],
                'Atención al Cliente' => ['Cajero bilingüe', 'Mesero con experiencia', 'Agente de Call Center'],
                'Administración' => ['Auxiliar Administrativo', 'Contador Público', 'Asistente de Dirección']
            ],
            'servicios' => [
                'Reparaciones y Hogar' => ['Plomería 24/7 urgencias', 'Electricista Certificado', 'Reparación de Aire Acondicionado'],
                'Clases y Cursos' => ['Clases de inglés online', 'Tutoría de Matemáticas', 'Clases de Guitarra'],
                'Belleza y Salud' => ['Maquillaje a Domicilio', 'Masaje Relajante', 'Nutriólogo Deportivo'],
                'Eventos' => ['Fotografía para Bodas', 'Banquetes y Catering', 'DJ para Fiestas']
            ],
            'informatica' => [
                'Laptops' => ['MacBook Pro M2 512GB', 'Dell XPS 13', 'Lenovo ThinkPad'],
                'Componentes' => ['Tarjeta Gráfica RTX 3060', 'Procesador AMD Ryzen 7', 'Memoria RAM 16GB DDR4'],
                'Accesorios' => ['Teclado mecánico RGB', 'Mouse inalámbrico Logitech', 'Monitor Dell 27" 4K'],
                'Tablets' => ['iPad Pro 11"', 'Samsung Galaxy Tab S8', 'iPad Mini']
            ],
            'telefonia' => [
                'Smartphones' => ['iPhone 13 Pro Max', 'Samsung Galaxy S23 Ultra', 'Xiaomi Redmi Note 12'],
                'Fundas y Micas' => ['Funda protectora uso rudo', 'Mica de Cristal Templado', 'Funda de Silicón'],
                'Wearables' => ['Apple Watch Series 8', 'Galaxy Watch 5', 'Smartband Fitness'],
                'Cargadores' => ['Cargador carga rápida 20W', 'Cable USB-C a Lightning', 'Powerbank 10000mAh']
            ],
            'hogar' => [
                'Muebles' => ['Sofá minimalista 3 plazas', 'Comedor de madera 6 sillas', 'Cama matrimonial'],
                'Electrodomésticos' => ['Refrigerador Inverter LG', 'Horno de Microondas', 'Licuadora Ninja'],
                'Decoración' => ['Cuadro Decorativo Abstracto', 'Espejo de Cuerpo Entero', 'Lámpara de Pie'],
                'Jardín' => ['Set de Muebles para Exterior', 'Asador de Carbón', 'Podadora Eléctrica']
            ],
            'moda' => [
                'Hombre' => ['Chamarra de cuero vintage', 'Tenis Nike Air Max', 'Camisa de Vestir Slim Fit'],
                'Mujer' => ['Vestido de Noche', 'Bolso de diseñador', 'Zapatillas de Tacón'],
                'Relojes' => ['Reloj Casio G-Shock', 'Reloj Elegante Citizen', 'Smartwatch Híbrido'],
                'Accesorios' => ['Lentes de sol Ray-Ban', 'Cartera de Piel', 'Cinturón de Cuero']
            ],
            'bebes' => [
                'Paseo' => ['Carriola de viaje plegable', 'Autoasiento de Seguridad', 'Cangurera Ergonómica'],
                'Habitación' => ['Cuna de madera convertible', 'Monitor de bebé con cámara', 'Móvil Musical'],
                'Ropa' => ['Ropa para bebé 6 meses', 'Pañaleros Algodón (Pack 5)', 'Zapatitos Primeros Pasos'],
                'Juguetes' => ['Gimnasio de Actividades', 'Bloques de Construcción', 'Peluche Interactivo']
            ],
            'mascotas' => [
                'Perros' => ['Bulto croquetas Nupec 15kg', 'Cama acolchada para perro/gato', 'Correa retráctil 5m'],
                'Gatos' => ['Arena Aglutinante 10kg', 'Rascador de 3 Niveles', 'Fuente de Agua para Gatos'],
                'Aves y Peces' => ['Acuario equipado 50L', 'Jaula Grande para Aves', 'Alimento para Peces'],
                'Higiene' => ['Shampoo Antipulgas', 'Cepillo Deslanador', 'Tapetes Entrenadores']
            ],
            'ocio' => [
                'Deportes' => ['Bicicleta de montaña R29', 'Pesas Mancuernas 10kg', 'Raqueta de tenis Wilson'],
                'Música' => ['Guitarra acústica Fender', 'Teclado Yamaha 61 Teclas', 'Batería Electrónica'],
                'Libros' => ['Colección Harry Potter', 'Libro de Finanzas Personales', 'Novela Best Seller'],
                'Juegos' => ['Tienda de campaña', 'Juego de mesa Catan', 'Consola PlayStation 5']
            ],
            'boletos' => [
                'Conciertos' => ['Boleto Concierto VIP', 'Entrada General Festival', 'Abono festival 3 días'],
                'Deportes' => ['Boleto Partido Final Liguilla', 'Pase Fórmula 1', 'Entrada Lucha Libre'],
                'Teatro y Cultura' => ['Entrada teatro 2 personas', 'Pase anual museo', 'Entrada Show Standup'],
                'Viajes' => ['Pase a Parque de Diversiones', 'Tour Guiado', 'Vuelo Redondo Nacional']
            ]
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

        foreach ($catalog as $categorySlug => $subcategories) {
            foreach ($subcategories as $subcatName => $items) {
                // Generate 20 ads per subcategory (Total: ~960 ads across all states)
                for ($i = 0; $i < 20; $i++) {
                    $itemName = $items[array_rand($items)];
                    $location = $locations[array_rand($locations)];
                    
                    Ad::create([
                        'user_id' => $user->id,
                        'title' => $itemName . ' (' . $subcatName . ') - ' . rand(100, 999),
                        'price' => rand(150, 50000),
                        'description' => "Excelente oportunidad en la categoría de {$subcatName}.\n\nEste artículo ({$itemName}) se encuentra disponible y en perfectas condiciones. Aprovecha nuestro precio especial. Entrega inmediata en {$location} o envío disponible a todo el país.\n\nContáctanos para más información.",
                        'location' => $location,
                        'category' => $categorySlug,
                        'condition' => (rand(0, 1) ? 'nuevo' : 'usado'),
                        'image_url' => json_encode([$categoryImages[$categorySlug] ?? 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800']),
                        'status' => 'active',
                        'views' => rand(15, 3500),
                        'promoted' => rand(0, 100) > 90 ? 'destacado' : (rand(0, 100) > 90 ? 'urgente' : null),
                    ]);
                }
            }
        }
    }
}
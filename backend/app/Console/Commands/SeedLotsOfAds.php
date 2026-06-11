<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Str;

class SeedLotsOfAds extends Command
{
    protected $signature = 'ads:seed-lots';
    protected $description = 'Seed empty categories and subcategories with 50 + 50 high-quality ads with different images';

    public function handle()
    {
        $user = User::where('role', 'business')->first() ?? User::where('role', 'admin')->first() ?? User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Tienda Demo',
                'email' => 'tienda_demo@mercasto.com',
                'password' => bcrypt('secret123'),
                'role' => 'business',
                'is_verified' => true,
                'ip_address' => '127.0.0.' . '1'
            ]);
        }

        $locations = [
            'Ciudad de México, CDMX', 'Guadalajara, JAL', 'Monterrey, NL', 'Puebla, PUE', 'Querétaro, QRO',
            'Cancún, ROO', 'Mérida, YUC', 'Tijuana, BC', 'León, GTO', 'Veracruz, VER'
        ];

        // We will generate different random high-quality images from Unsplash source for each category
        $imagesPool = [
            'motor' => [
                'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
                'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
                'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600',
                'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=600',
                'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600',
                'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600',
                'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600'
            ],
            'inmobiliaria' => [
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600',
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
                'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600',
                'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600',
                'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600',
                'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=600'
            ],
            'empleo' => [
                'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
                'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600',
                'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
                'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600'
            ],
            'servicios' => [
                'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600',
                'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
                'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600',
                'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600'
            ],
            'electronica' => [
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
                'https://images.unsplash.com/photo-1496181130204-755241544e35?w=600',
                'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600',
                'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600',
                'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'
            ],
            'telefonos' => [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
                'https://images.unsplash.com/photo-1565849906660-af34a742a8b2?w=600',
                'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600'
            ],
            'hogar' => [
                'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600',
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600',
                'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600',
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600'
            ],
            'moda' => [
                'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
                'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600',
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
                'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600'
            ],
            'bebes' => [
                'https://images.unsplash.com/photo-1519689680058-324335c77ebe?w=600',
                'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600',
                'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=600'
            ],
            'mascotas' => [
                'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
                'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600'
            ],
            'deportes' => [
                'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
                'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600',
                'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600'
            ],
            'formacion' => [
                'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600',
                'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
                'https://images.unsplash.com/photo-1495446815901-a7297e63b58d?w=600'
            ],
            'informatica' => [
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600',
                'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600',
                'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600'
            ],
            'coleccionismo' => [
                'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
                'https://images.unsplash.com/photo-1531594896955-f018e3ff341d?w=600',
                'https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=600'
            ],
            'coches' => [
                'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
                'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
                'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600'
            ],
            'negocios' => [
                'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
                'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
                'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600'
            ],
            'infantil' => [
                'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600',
                'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=600',
                'https://images.unsplash.com/photo-1537655780520-1e392edd816a?w=600'
            ]
        ];

        $subcatData = [
            'coches' => [
                'Compactos' => ['Toyota Yaris', 'Nissan March', 'Chevrolet Spark', 'VW Polo', 'Ford Figo'],
                'SUV' => ['Honda CR-V', 'Toyota RAV4', 'Nissan X-Trail', 'Kia Sportage', 'Mazda CX-5'],
                'Pickup' => ['Toyota Hilux', 'Nissan Frontier', 'Ford Ranger', 'Chevrolet S10', 'Ram 700'],
                'Sedán' => ['Nissan Versa', 'VW Vento', 'Chevrolet Aveo', 'Honda Civic', 'Toyota Corolla'],
                'Hatchback' => ['Seat Ibiza', 'Suzuki Swift', 'Mazda 2', 'Peugeot 208', 'Mini Cooper'],
                'Eléctricos' => ['Tesla Model 3', 'BYD Dolphin', 'Nissan Leaf', 'MG4 Electric', 'JAC E10X']
            ],
            'motor' => [
                'Motos' => ['Yamaha R6', 'Honda CBR 250', 'Italika DM200', 'Suzuki Gixxer', 'Kawasaki Ninja'],
                'Scooters' => ['Vespa Primavera', 'Honda Elite', 'Yamaha Cygnus', 'Italika WS150', 'BMW C400'],
                'Cuatrimotos' => ['Can-Am Outlander', 'Honda TRX', 'Yamaha Grizzly', 'Polaris Sportsman'],
                'Refacciones' => ['Bujías Iridium', 'Balatas de cerámica', 'Cadena dorada D.I.D', 'Filtro de aire K&N'],
                'Equipamiento' => ['Chamarra Alpinestars', 'Casco LS2', 'Guantes con protección de carbono', 'Botas urbanas']
            ],
            'inmobiliaria' => [
                'Casas en venta' => ['Residencia de Lujo en Zona Norte', 'Casa de 3 recámaras en privada', 'Hermosa propiedad remodelada', 'Casa frente a parque'],
                'Casas en renta' => ['Casa amueblada lista para habitar', 'Casa residencial equipada', 'Casa acogedora de dos niveles'],
                'Departamentos' => ['Loft de diseño minimalista', 'Departamento contemporáneo de lujo', 'Penthouse con roof garden'],
                'Terrenos' => ['Lote ejidal campestre', 'Terreno para desarrollo comercial', 'Terreno plano de 200m2'],
                'Locales comerciales' => ['Local céntrico de doble altura', 'Bodega logística amplia', 'Oficina equipada y lista para trabajar']
            ],
            'empleo' => [
                'Ventas' => ['Ejecutivo de Cuenta Sr', 'Asesor de Ventas Inmobiliarias', 'Vendedor de Piso', 'Gerente Comercial Regional'],
                'Chofer' => ['Chofer de Reparto Local', 'Chofer Ejecutivo Privado', 'Operador de Quinta Rueda'],
                'Construcción' => ['Residente de Obra Civil', 'Maestro Albañil calificado', 'Electricista industrial especialista'],
                'Administración' => ['Auxiliar de Contabilidad Jr', 'Recepcionista bilingüe de corporativo', 'Asistente de Recursos Humanos'],
                'Tecnología' => ['Fullstack React/Node Developer', 'DevOps AWS Engineer', 'Especialista en Ciberseguridad Jr']
            ],
            'servicios' => [
                'Mudanzas' => ['Fletes y mudanzas express seguras', 'Servicio de embalaje y traslado nacional', 'Fletes económicos de mudanza'],
                'Limpieza' => ['Limpieza profunda de salas a domicilio', 'Lavado certificado de colchones y alfombras', 'Personal de limpieza residencial'],
                'Plomería' => ['Plomero certificado urgencias 24h', 'Instalación profesional de hidroneumático', 'Detección y reparación de fugas'],
                'Electricidad' => ['Electricista certificado residencial', 'Instalaciones eléctricas industriales', 'Balanceo de cargas y paneles'],
                'Clases' => ['Regularización de Matemáticas y Física', 'Clases intensivas de inglés conversacional', 'Curso de preparación para exámenes']
            ],
            'electronica' => [
                'Laptops' => ['MacBook Pro M2 512GB', 'Dell XPS 13 Ultra', 'Lenovo ThinkPad X1 Carbon', 'Asus ROG Zephyrus G14'],
                'Tablets' => ['iPad Pro M1 11 pulgadas', 'Samsung Galaxy Tab S9', 'iPad Air 256GB', 'Lenovo Tab P11'],
                'TV y video' => ['Pantalla LG OLED 65 pulgadas 4K', 'Smart TV Samsung Neo QLED 55', 'Proyector portátil Full HD Xiaomi'],
                'Audio' => ['Audífonos Sony WH-1000XM5', 'Bocina inalámbrica JBL Boombox 3', 'Soundbar Bose Smart 600'],
                'Drones' => ['DJI Mini 3 Pro Fly More', 'Drone DJI Avata FPV', 'Drone para fotografía aérea Autel']
            ],
            'telefonos' => [
                'Smartphones' => ['iPhone 14 Pro Max 256GB', 'Samsung Galaxy S23 Ultra 512GB', 'Google Pixel 8 Pro', 'Xiaomi 13 Ultra'],
                'Fundas y Carcasas' => ['Funda OtterBox de uso rudo', 'Funda de piel MagSafe para iPhone', 'Carcasa transparente Spigen'],
                'Smartwatches' => ['Apple Watch Series 8 GPS', 'Samsung Galaxy Watch 6 Classic', 'Garmin Fenix 7 Pro'],
                'Cargadores y Cables' => ['Cargador rápido Anker 65W GaN', 'Cable de nylon tipo C a C', 'Batería portátil MagSafe']
            ],
            'hogar' => [
                'Muebles' => ['Sofá cama moderno de 3 plazas', 'Comedor de parota de 6 sillas', 'Credenza rústica de madera maciza'],
                'Decoración' => ['Set de plantas artificiales premium', 'Espejo circular de marco dorado', 'Cuadro de lienzo abstracto grande'],
                'Electrodomésticos' => ['Licuadora Ninja de alta potencia', 'Freidora de aire digital Gourmia 6L', 'Cafetera Espresso DeLonghi'],
                'Jardín' => ['Set de muebles de exterior para terraza', 'Asador Weber de carbón clásico', 'Sombrilla gigante para jardín']
            ],
            'moda' => [
                'Ropa mujer' => ['Vestido midi casual floral', 'Chaqueta de mezclilla oversize', 'Suéter de punto cuello alto'],
                'Ropa hombre' => ['Chamarra de cuero estilo motociclista', 'Pantalón de mezclilla Levi\'s 501', 'Camisa Oxford slim fit'],
                'Calzado' => ['Tenis casuales de piel blancos', 'Botas de vestir de cuero artesanal', 'Sandalias cómodas ergonómicas'],
                'Accesorios' => ['Lentes de sol Ray-Ban Wayfarer', 'Cartera de piel genuina con RFID', 'Cinturón clásico de piel negra']
            ],
            'mascotas' => [
                'Perros' => ['Cama acolchada gigante ortopédica', 'Alimento Pro Plan Adulto Raza Mediana', 'Arnés antitirones acolchado'],
                'Gatos' => ['Rascador de gatos de 3 niveles con túnel', 'Arena aglutinante premium sin olor', 'Juguete interactivo de túnel y láser'],
                'Accesorios' => ['Alimentador automático inteligente Wifi', 'Bebedero de fuente con filtro', 'Bolsa transportadora aprobada por aerolíneas']
            ],
            'deportes' => [
                'Bicicletas' => ['Bicicleta de montaña R29 de aluminio', 'Bicicleta de ruta Trek ligera', 'Bicicleta urbana vintage con canasta'],
                'Gym' => ['Par de mancuernas hexagonales de 20lb', 'Set de bandas de resistencia premium', 'Tapete de yoga antiderrapante'],
                'Camping' => ['Tienda de campaña Coleman para 4 personas', 'Saco de dormir para temperaturas bajas', 'Hielera portátil termoaislante']
            ]
        ];

        // 1. ADD 50 ITEMS per empty category/subcategory
        // 2. ADD ANOTHER 50 ITEMS per category/subcategory
        // So 100 items total for all listed categories to guarantee they are fully populated!
        
        $this->info("Starting massive high-contrast database seeder...");

        foreach ($subcatData as $categorySlug => $subcategories) {
            foreach ($subcategories as $subcatName => $items) {
                $this->info("Seeding category: {$categorySlug} -> subcategory: {$subcatName}...");
                
                // Let's seed 100 items (50 + 50) for this subcategory
                for ($i = 0; $i < 100; $i++) {
                    $baseItem = $items[array_rand($items)];
                    $location = $locations[array_rand($locations)];
                    
                    // Generate a distinct image URL by appending query parameter for uniqueness and bypassing cache
                    $imgArray = $imagesPool[$categorySlug] ?? ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600'];
                    $selectedImage = $imgArray[array_rand($imgArray)] . "&sig=" . uniqid() . "_" . rand(1, 1000000);
                    
                    $title = $baseItem . " - " . Str::random(5) . " (" . $subcatName . ")";
                    $price = rand(99, 150000);
                    
                    // Construct attributes depending on category
                    $attrs = [];
                    if ($categorySlug === 'coches') {
                        $attrs = [
                            'brand' => strtolower($baseItem),
                            'model' => 'Modelo ' . rand(2018, 2024),
                            'year' => rand(2015, 2025),
                            'kms' => rand(5000, 180000),
                            'fuel' => ['gasolina', 'hibrido', 'electrico'][rand(0, 2)]
                        ];
                    } elseif ($categorySlug === 'inmobiliaria') {
                        $attrs = [
                            'property_type' => ['casa', 'departamento', 'terreno'][rand(0, 2)],
                            'rooms' => rand(1, 5),
                            'bathrooms' => rand(1, 4),
                            'area' => rand(40, 600)
                        ];
                    } elseif ($categorySlug === 'empleo') {
                        $attrs = [
                            'contract_type' => ['indefinido', 'temporal', 'autonomo'][rand(0, 2)],
                            'working_hours' => ['completa', 'parcial'][rand(0, 1)],
                            'salary' => rand(12000, 85000)
                        ];
                    }
                    
                    Ad::create([
                        'user_id' => $user->id,
                        'title' => $title,
                        'price' => $price,
                        'description' => "Excelente artículo en venta en {$location}. Completamente garantizado con entrega express. Para mayor información, contáctanos.",
                        'location' => $location,
                        'category' => $categorySlug,
                        'condition' => (rand(0, 1) ? 'nuevo' : 'usado'),
                        'image_url' => json_encode([$selectedImage]),
                        'status' => 'active',
                        'views' => rand(10, 4500),
                        'promoted' => rand(0, 100) > 90 ? 'destacado' : (rand(0, 100) > 95 ? 'urgente' : null),
                        'attributes' => $attrs
                    ]);
                }
            }
        }

        $this->info("Massive seeding successfully completed! 50 + 50 items added into all subcategories!");
    }
}

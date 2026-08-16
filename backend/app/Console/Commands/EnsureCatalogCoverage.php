<?php

namespace App\Console\Commands;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EnsureCatalogCoverage extends Command
{
    protected $signature = 'ads:ensure-catalog-coverage {--minimum=4} {--dry-run}';
    protected $description = 'Fill sparse categories with transparent Mercasto catalog references.';

    public function handle(): int
    {
        $minimum = max(1, min(12, (int) $this->option('minimum')));
        $dryRun = (bool) $this->option('dry-run');
        $templates = $this->templates();
        $missingTemplates = [];
        $plan = [];

        foreach (Category::query()->orderBy('sort_order')->get(['slug', 'name']) as $category) {
            $active = Ad::query()->where('category', $category->slug)->where('status', 'active')->count();
            $needed = max(0, $minimum - $active);
            if ($needed > 0 && empty($templates[$category->slug])) $missingTemplates[] = $category->slug;
            $plan[] = [$category->slug, $active, $needed];
        }

        $this->table(['category', 'active now', 'references needed'], $plan);
        if ($missingTemplates !== []) {
            $this->error('Missing editorial templates: ' . implode(', ', $missingTemplates));
            return self::FAILURE;
        }
        if ($dryRun) return self::SUCCESS;

        $owner = $this->catalogOwner();
        $created = 0;
        $reactivated = 0;

        foreach ($plan as [$slug, $active, $needed]) {
            if ($needed === 0) continue;
            foreach (array_slice($templates[$slug], 0, $needed) as $index => $template) {
                $existing = Ad::query()->where('is_catalog_filler', true)->where('title', $template['title'])->first();
                if ($existing) {
                    $existing->forceFill([
                        'status' => 'active', 'expires_at' => null, 'reminder_sent_at' => null,
                        'ai_moderation_status' => 'approved',
                        'ai_moderation_reason' => 'Referencia editorial de catálogo aprobada por Mercasto.',
                        'ai_moderation_confidence' => 1, 'ai_moderated_at' => now(),
                    ])->saveQuietly();
                    $reactivated++;
                    continue;
                }

                $key = $slug . '-' . Str::slug($template['title']);
                $imagePath = 'ads/catalog/' . $key . '.svg';
                Storage::disk('public')->put($imagePath, $this->coverSvg($slug, $template, $index));
                Ad::query()->create([
                    'user_id' => $owner->id,
                    'title' => $template['title'],
                    'description' => $template['description'],
                    'price' => $template['price'],
                    'location' => $template['city'] . ', ' . $template['state'],
                    'state' => $template['state'], 'city' => $template['city'],
                    'category' => $slug, 'subcategory' => $template['subcategory'] ?? null,
                    'condition' => $template['condition'] ?? 'usado',
                    'attributes' => ['catalog_template_key' => $key, 'editorial_reference' => true],
                    'image_url' => json_encode([$imagePath], JSON_UNESCAPED_SLASHES),
                    'status' => 'active', 'is_catalog_filler' => true, 'generated_cover' => true,
                    'expires_at' => null, 'moderation_submitted_at' => now(),
                    'ai_moderation_status' => 'approved',
                    'ai_moderation_reason' => 'Referencia editorial de catálogo aprobada por Mercasto.',
                    'ai_moderation_confidence' => 1, 'ai_moderated_at' => now(),
                ]);
                $created++;
            }
        }

        $this->info("Catalog coverage applied: {$created} created, {$reactivated} reactivated.");
        return self::SUCCESS;
    }

    private function catalogOwner(): User
    {
        $owner = User::query()->firstOrCreate(
            ['email' => 'catalogo@mercasto.local'],
            [
                'name' => 'Mercasto Catálogo', 'role' => 'business',
                'password' => Hash::make(Str::random(64)), 'is_verified' => true,
                'business_name' => 'Mercasto Catálogo', 'business_profile_enabled' => false,
            ]
        );
        if (! $owner->email_verified_at || ! $owner->is_verified) {
            $owner->forceFill(['email_verified_at' => now(), 'is_verified' => true])->saveQuietly();
        }
        return $owner;
    }

    private function coverSvg(string $category, array $item, int $index): string
    {
        $palette = ['#0F172A','#1E3A8A','#155E75','#365314','#7C2D12','#581C87','#9F1239','#134E4A'];
        $accent = $palette[abs(crc32($category . ':' . $index)) % count($palette)];
        $title = htmlspecialchars($item['title'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $categoryLabel = htmlspecialchars(mb_strtoupper(str_replace('_', ' ', $category)), ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $price = number_format((float) $item['price'], 0, '.', ',') . ' MXN';
        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="{$title}">
  <rect width="1200" height="900" fill="#F8FAFC"/>
  <rect x="48" y="48" width="1104" height="804" rx="52" fill="{$accent}"/>
  <circle cx="1030" cy="170" r="180" fill="#84CC16" opacity=".18"/>
  <circle cx="170" cy="760" r="230" fill="#FFFFFF" opacity=".08"/>
  <text x="105" y="155" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="700" fill="#BEF264">{$categoryLabel}</text>
  <text x="105" y="355" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="800" fill="#FFFFFF">{$title}</text>
  <rect x="105" y="650" width="430" height="104" rx="28" fill="#84CC16"/>
  <text x="145" y="718" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="800" fill="#0F172A">{$price}</text>
  <text x="105" y="805" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700" fill="#CBD5E1">Mercasto · referencia editorial</text>
</svg>
SVG;
    }

    private function templates(): array
    {
        $make = fn (array $rows) => array_map(fn ($r) => [
            'title' => $r[0], 'price' => $r[1], 'state' => $r[2], 'city' => $r[3],
            'description' => $r[4], 'condition' => $r[5] ?? 'usado', 'subcategory' => $r[6] ?? null,
        ], $rows);

        return [
            'coches' => $make([
                ['Nissan Versa Advance 2021',238000,'Veracruz','Boca del Río','Sedán automático con aire acondicionado, cámara de reversa y mantenimiento al día. Referencia útil para comparar unidades similares en la zona.','usado','Sedán'],
                ['Mazda 3 Touring 2020',285000,'Jalisco','Guadalajara','Hatchback bien equipado, interiores cuidados, pantalla central y controles al volante. Precio de referencia para vehículos de características comparables.','usado','Hatchback'],
                ['Toyota Corolla LE 2022',329000,'Nuevo León','Monterrey','Sedán de uso familiar con transmisión automática, buen espacio interior y consumo contenido. Referencia editorial para orientar la búsqueda.','usado','Sedán'],
                ['Volkswagen Jetta Comfortline 2019',249000,'Ciudad de México','Benito Juárez','Sedán con equipamiento de confort, cajuela amplia y manejo estable. Valor ilustrativo basado en publicaciones comparables del mercado.','usado','Sedán'],
            ]),
            'motor' => $make([
                ['Honda CB190R 2023',54500,'Veracruz','Veracruz','Motocicleta urbana de 184 cc, posición cómoda y consumo eficiente. Referencia para comparar motos recientes de uso diario.','usado','Motos'],
                ['Yamaha FZ 25 2022',62000,'Jalisco','Zapopan','Motocicleta naked para ciudad y trayectos cortos, con freno de disco y tablero digital. Precio orientativo para equipos similares.','usado','Motos'],
                ['Italika Vort-X 300 2024',69900,'Puebla','Puebla de Zaragoza','Opción deportiva de media cilindrada con iluminación LED y postura ágil. Referencia editorial de categoría.','usado','Motos'],
                ['Casco integral certificado para moto',1850,'Nuevo León','Monterrey','Casco integral con visor transparente, ventilación frontal y acolchado desmontable. Referencia de precio para equipamiento nuevo.','nuevo','Cascos'],
            ]),
            'inmobiliaria' => $make([
                ['Departamento de 2 recámaras cerca del centro',1850000,'Veracruz','Boca del Río','Departamento con dos recámaras, sala comedor, cocina integral, dos baños y un cajón de estacionamiento. Referencia de mercado en zona urbana.','usado','Departamentos'],
                ['Casa familiar de 3 recámaras con patio',2950000,'Querétaro','Querétaro','Casa de dos niveles con tres recámaras, cocina equipada, patio posterior y estacionamiento para dos autos. Precio editorial de comparación.','usado','Casas en venta'],
                ['Terreno residencial de 200 m²',780000,'Yucatán','Mérida','Lote urbano de referencia con 200 m², acceso por calle pavimentada y servicios disponibles en la zona.','nuevo','Terrenos'],
                ['Local comercial de 55 m²',13500,'Jalisco','Guadalajara','Espacio comercial de referencia con área abierta, baño y frente visible a calle secundaria. Precio mensual orientativo.','usado','Locales comerciales'],
            ]),
            'empleo' => $make([
                ['Asesor de ventas de tiempo completo',14000,'Veracruz','Veracruz','Vacante de referencia para atención a clientes, seguimiento de prospectos y cierre de ventas. Jornada completa y capacitación inicial.','nuevo','Ventas'],
                ['Auxiliar administrativo',12500,'Ciudad de México','Coyoacán','Puesto de referencia para control de documentos, captura de información, agenda y apoyo operativo. Manejo básico de hojas de cálculo.','nuevo','Administración'],
                ['Chofer repartidor local',15000,'Nuevo León','Guadalupe','Vacante de referencia para rutas locales, entrega de pedidos y control de evidencias. Licencia vigente y conducción responsable.','nuevo','Chofer'],
                ['Desarrollador web junior',22000,'Jalisco','Guadalajara','Posición de referencia para desarrollo y mantenimiento de interfaces web, trabajo con APIs y control de versiones.','nuevo','Tecnología'],
            ]),
            'servicios' => $make([
                ['Servicio de plomería residencial',650,'Veracruz','Boca del Río','Referencia de servicio para reparación de fugas, cambio de llaves, mantenimiento de sanitarios y revisiones domésticas. Precio base orientativo.','nuevo','Plomería'],
                ['Limpieza profunda de casa o departamento',950,'Ciudad de México','Tlalpan','Servicio editorial de referencia para limpieza general de cocina, baños, pisos y superficies. Tarifa base para espacios pequeños y medianos.','nuevo','Limpieza'],
                ['Electricista para instalaciones y reparaciones',800,'Jalisco','Zapopan','Referencia para diagnóstico de contactos, iluminación, centros de carga y pequeñas instalaciones residenciales.','nuevo','Electricidad'],
                ['Mudanza local con camioneta',1800,'Nuevo León','Monterrey','Servicio de referencia para traslados locales de muebles y cajas, con apoyo de carga y descarga. Precio inicial orientativo.','nuevo','Mudanzas'],
            ]),
            'moda' => $make([
                ['Bolso de piel estilo tote',1450,'Jalisco','Guadalajara','Bolso amplio de uso diario con asas reforzadas, compartimento interior y acabado clásico. Referencia de producto en excelente estado.','usado','Bolsos'],
                ['Tenis urbanos de piel talla 27',1200,'Ciudad de México','Cuauhtémoc','Calzado casual con suela de goma y diseño neutro, pensado para uso diario. Referencia editorial de precio y presentación.','nuevo','Calzado'],
                ['Chamarra ligera impermeable',980,'Nuevo León','Monterrey','Chamarra ligera con cierre frontal, bolsillos laterales y material repelente al agua. Referencia de moda funcional.','nuevo','Ropa hombre'],
                ['Reloj clásico de acero inoxidable',2100,'Veracruz','Veracruz','Reloj de referencia con brazalete metálico, carátula limpia y resistencia básica al agua.','usado','Accesorios'],
            ]),
            'hogar' => $make([
                ['Sofá de 3 plazas en tela gris',6800,'Veracruz','Boca del Río','Sofá de líneas sencillas con tres plazas, cojines removibles y tapizado gris. Referencia para salas de tamaño medio.','usado','Muebles'],
                ['Comedor de madera para 6 personas',8900,'Jalisco','Zapopan','Mesa rectangular con seis sillas, acabado natural y diseño contemporáneo. Referencia editorial para mobiliario de comedor.','usado','Muebles'],
                ['Refrigerador inverter de 14 pies',10400,'Nuevo León','Monterrey','Refrigerador de referencia con congelador superior, tecnología inverter y anaqueles ajustables.','usado','Electrodomésticos'],
                ['Taladro inalámbrico con batería',1750,'Ciudad de México','Benito Juárez','Herramienta compacta con batería recargable, control de velocidad y estuche. Referencia para tareas domésticas.','nuevo','Herramientas'],
            ]),
            'electronica' => $make([
                ['Televisor 55 pulgadas 4K Smart TV',9200,'Veracruz','Veracruz','Pantalla 4K de referencia con aplicaciones de streaming, HDR y conectividad Wi-Fi. Estado muy cuidado.','usado','TV y video'],
                ['Audífonos inalámbricos con cancelación de ruido',2650,'Jalisco','Guadalajara','Audífonos over-ear con Bluetooth, estuche y cancelación activa. Referencia de precio para equipos similares.','usado','Audio'],
                ['Cámara mirrorless con lente 16-50 mm',11800,'Ciudad de México','Coyoacán','Cámara compacta de lentes intercambiables con lente de kit, batería y cargador. Referencia editorial para fotografía.','usado','Cámaras'],
                ['Monitor IPS 27 pulgadas QHD',5900,'Nuevo León','Monterrey','Monitor de referencia con panel IPS, resolución QHD y soporte ajustable para escritorio.','nuevo','Monitores'],
            ]),
            'telefonos' => $make([
                ['iPhone 13 128 GB',9800,'Ciudad de México','Benito Juárez','Teléfono de referencia con 128 GB, cámaras en buen estado y batería funcional. Incluye cable compatible.','usado','Smartphones'],
                ['Samsung Galaxy S23 256 GB',11200,'Nuevo León','Monterrey','Smartphone Android de referencia con 256 GB, pantalla AMOLED y triple cámara. Equipo cuidado.','usado','Smartphones'],
                ['Google Pixel 8 128 GB',10500,'Jalisco','Guadalajara','Equipo de referencia con Android actualizado, cámara principal avanzada y 128 GB de almacenamiento.','usado','Smartphones'],
                ['Xiaomi 13T 256 GB',7900,'Veracruz','Boca del Río','Smartphone de referencia con pantalla AMOLED, carga rápida y almacenamiento amplio.','usado','Smartphones'],
            ]),
            'telefonia' => $make([
                ['iPhone 12 128 GB',7600,'Veracruz','Veracruz','Smartphone de referencia con almacenamiento de 128 GB, pantalla OLED y cámaras funcionales.','usado','Smartphones'],
                ['Samsung Galaxy A55 256 GB',6900,'Jalisco','Zapopan','Equipo Android de referencia con pantalla AMOLED, buena autonomía y almacenamiento de 256 GB.','usado','Smartphones'],
                ['Motorola Edge 40',6100,'Nuevo León','Monterrey','Teléfono de referencia con pantalla fluida, carga rápida y cámara principal estabilizada.','usado','Smartphones'],
                ['Cargador USB-C de 45 W',690,'Ciudad de México','Cuauhtémoc','Cargador compacto de referencia con salida USB-C y potencia de hasta 45 W para equipos compatibles.','nuevo','Cargadores y Cables'],
            ]),
            'deportes' => $make([
                ['Bicicleta de montaña rodada 29',7800,'Jalisco','Guadalajara','Bicicleta de aluminio con suspensión delantera y transmisión de varias velocidades. Referencia para rutas recreativas.','usado','Bicicletas'],
                ['Tabla de surf 7 pies',5200,'Veracruz','Boca del Río','Tabla de referencia para nivel recreativo, con quillas y leash. Medidas adecuadas para olas pequeñas y medianas.','usado','Surf'],
                ['Set de mancuernas ajustables',3600,'Nuevo León','Monterrey','Par de mancuernas de peso ajustable para entrenamiento en casa. Referencia de equipo fitness.','usado','Gym'],
                ['Casa de campaña para 4 personas',2200,'Ciudad de México','Tlalpan','Tienda de campaña de referencia con doble techo, ventilación lateral y bolsa de transporte.','nuevo','Camping'],
            ]),
            'ocio' => $make([
                ['Guitarra acústica tamaño completo',3200,'Jalisco','Guadalajara','Instrumento de referencia con cuerpo de madera, funda y juego de cuerdas reciente.','usado','Instrumentos musicales'],
                ['Consola Nintendo Switch OLED',5400,'Nuevo León','Monterrey','Consola de referencia con pantalla OLED, base, controles y cargador.','usado','Juegos'],
                ['Colección de novelas contemporáneas',850,'Ciudad de México','Coyoacán','Lote de libros de referencia en buen estado, ideal para lectura personal o biblioteca doméstica.','usado','Arte'],
                ['Kayak recreativo individual',6800,'Veracruz','Boca del Río','Kayak de referencia para paseo costero o laguna, con asiento y remo.','usado','Kayak'],
            ]),
            'infantil' => $make([
                ['Carriola compacta plegable',2700,'Ciudad de México','Benito Juárez','Carriola de referencia con plegado compacto, cinturón de seguridad y canastilla inferior.','usado','Carriolas'],
                ['Cuna de madera con colchón',3900,'Jalisco','Zapopan','Cuna de referencia con barandales fijos, base ajustable y colchón en buen estado.','usado','Cunas'],
                ['Silla alta para comer',1450,'Nuevo León','Monterrey','Silla infantil de referencia con charola removible, arnés y estructura fácil de limpiar.','usado','Muebles infantiles'],
                ['Juego de bloques de construcción',650,'Veracruz','Veracruz','Set de referencia con piezas grandes y resistentes para actividades creativas.','usado','Juguetes'],
            ]),
            'bebes' => $make([
                ['Autoasiento infantil con base',2900,'Veracruz','Boca del Río','Autoasiento de referencia con arnés de cinco puntos y base para instalación en vehículo.','usado','Autoasientos'],
                ['Moisés portátil para bebé',1800,'Ciudad de México','Coyoacán','Moisés ligero de referencia con estructura plegable, colchón y laterales ventilados.','usado','Cunas'],
                ['Lote de ropa de bebé 6-12 meses',700,'Jalisco','Guadalajara','Conjunto de referencia con prendas variadas para uso diario, organizadas por talla.','usado','Ropa bebé'],
                ['Bañera plegable para bebé',850,'Nuevo León','Monterrey','Bañera de referencia con base antideslizante y formato plegable para facilitar el almacenamiento.','usado','Baño y cuidado'],
            ]),
            'mascotas' => $make([
                ['Transportadora mediana para perro',1200,'Veracruz','Veracruz','Transportadora rígida de referencia con ventilación lateral y puerta frontal segura.','usado','Perros'],
                ['Rascador alto para gato',1450,'Ciudad de México','Benito Juárez','Rascador de referencia con plataformas, postes de sisal y zona de descanso.','nuevo','Gatos'],
                ['Acuario de 60 litros equipado',2600,'Jalisco','Zapopan','Acuario de referencia con tapa, iluminación y filtro para montaje doméstico.','usado','Peces'],
                ['Cama lavable para mascota mediana',780,'Nuevo León','Monterrey','Cama acolchada de referencia con funda desmontable y base antideslizante.','nuevo','Accesorios'],
            ]),
            'negocios' => $make([
                ['Vitrina refrigerada para negocio',18500,'Veracruz','Veracruz','Equipo comercial de referencia con frente de vidrio, control de temperatura y espacio de exhibición.','usado','Equipamiento'],
                ['Cafetera profesional de dos grupos',32000,'Jalisco','Guadalajara','Máquina de referencia para cafetería, con dos grupos y vaporizadores. Precio orientativo de equipo usado.','usado','Equipamiento'],
                ['Impresora térmica para punto de venta',2400,'Nuevo León','Monterrey','Impresora de tickets de referencia con conexión USB y corte automático.','nuevo','Equipamiento'],
                ['Mesa de trabajo de acero inoxidable',5800,'Ciudad de México','Iztacalco','Mesa comercial de referencia con superficie inoxidable y entrepaño inferior para cocina o taller.','usado','Equipamiento'],
            ]),
            'formacion' => $make([
                ['Curso práctico de Excel intermedio',1200,'Ciudad de México','Benito Juárez','Curso de referencia enfocado en fórmulas, tablas dinámicas, organización de datos y ejercicios prácticos.','nuevo','Cursos'],
                ['Clases particulares de inglés conversacional',350,'Jalisco','Guadalajara','Sesión de referencia enfocada en conversación, pronunciación y vocabulario para situaciones cotidianas. Precio por hora.','nuevo','Idiomas'],
                ['Colección de libros universitarios de administración',1100,'Nuevo León','Monterrey','Lote de referencia con textos de administración, contabilidad y gestión en estado funcional.','usado','Universidad'],
                ['Curso básico de programación web',1800,'Veracruz','Boca del Río','Programa de referencia para fundamentos de HTML, CSS, JavaScript y práctica con un proyecto sencillo.','nuevo','Programación'],
            ]),
            'informatica' => $make([
                ['Laptop Lenovo ThinkPad 14 pulgadas',8900,'Ciudad de México','Cuauhtémoc','Laptop empresarial de referencia con SSD, 16 GB de RAM y cargador. Adecuada para oficina y estudio.','usado','Laptops'],
                ['PC de escritorio Ryzen 5 con 16 GB RAM',12500,'Nuevo León','Monterrey','Equipo de referencia con procesador Ryzen 5, 16 GB de memoria y SSD para trabajo general.','usado','PCs'],
                ['Teclado mecánico inalámbrico',1650,'Jalisco','Zapopan','Teclado compacto de referencia con conexión inalámbrica, retroiluminación y switches mecánicos.','nuevo','Accesorios'],
                ['Router Wi-Fi 6 de doble banda',1950,'Veracruz','Veracruz','Router de referencia con Wi-Fi 6, doble banda y puertos Gigabit para red doméstica.','nuevo','Redes'],
            ]),
            'coleccionismo' => $make([
                ['Colección de monedas mexicanas del siglo XX',2400,'Ciudad de México','Coyoacán','Lote de referencia con monedas mexicanas de distintas décadas, organizado para colección y consulta.','usado','Monedas y Billetes'],
                ['Cámara analógica vintage de 35 mm',3600,'Jalisco','Guadalajara','Cámara clásica de referencia con lente estándar y controles mecánicos. Pieza para uso o colección.','usado','Antigüedades'],
                ['Lote de cómics en español',1300,'Nuevo León','Monterrey','Colección de referencia con varios números en español, conservados en fundas individuales.','usado','Cómics'],
                ['Tornamesa clásico restaurado',7200,'Veracruz','Boca del Río','Tornamesa de referencia con cubierta, brazo ajustado y funcionamiento revisado.','usado','Música y Vinilos'],
            ]),
            'boletos' => $make([
                ['Entrada de referencia para concierto nacional',1600,'Ciudad de México','Iztacalco','Referencia editorial de precio para una entrada de zona general. La disponibilidad debe confirmarse en una publicación real.','nuevo','Conciertos'],
                ['Entrada de referencia para partido de liga',950,'Nuevo León','Monterrey','Referencia de precio para acceso a evento deportivo. No representa un boleto disponible para compra.','nuevo','Deportes'],
                ['Acceso de referencia a festival cultural',650,'Jalisco','Guadalajara','Referencia editorial para comparar entradas a festivales y actividades culturales.','nuevo','Festivales'],
                ['Entrada de referencia para obra de teatro',780,'Ciudad de México','Cuauhtémoc','Referencia de precio para función teatral en zona intermedia. La disponibilidad se confirma con publicaciones reales.','nuevo','Teatro y Cultura'],
            ]),
        ];
    }
}

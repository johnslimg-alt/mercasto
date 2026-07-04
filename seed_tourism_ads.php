// Seed tourism ads inside tinker shell
$userId = DB::table('users')->where('email', 'tienda_demo@mercasto.com')->value('id') ?? 1;

$ads = [
    // 1. Отели / hospedaje
    [
        'title' => 'Habitación de Lujo frente al Mar',
        'description' => 'Disfruta de una maravillosa estancia en Cancún. Habitación de lujo totalmente equipada con aire acondicionado, jacuzzi privado y acceso directo a la playa. Reserva ahora tu hospedaje.',
        'price' => 2499.00,
        'category' => 'hospedaje',
        'subcategory' => 'Hoteles',
        'image_url' => '["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Quintana Roo',
        'city' => 'Cancún',
        'latitude' => 21.1619,
        'longitude' => -86.8515,
        'attributes' => json_encode(['tipo_hospedaje' => 'Hotel', 'servicios_incluidos' => ['Wifi', 'Alberca', 'Estacionamiento', 'Vista al mar']]),
    ],
    [
        'title' => 'Hostal Eco-Friendly Centro Histórico',
        'description' => 'Perfecto para viajeros y mochileros en Mérida. Habitaciones compartidas y privadas limpias, excelente ambiente, cocina comunitaria y renta de bicicletas incluida. Muy cerca de la plaza principal.',
        'price' => 350.00,
        'category' => 'hospedaje',
        'subcategory' => 'Hostales',
        'image_url' => '["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Yucatán',
        'city' => 'Mérida',
        'latitude' => 20.9754,
        'longitude' => -89.6169,
        'attributes' => json_encode(['tipo_hospedaje' => 'Hostal', 'servicios_incluidos' => ['Wifi', 'Aire acondicionado', 'Desayuno']]),
    ],

    // 2. Туры / tours
    [
        'title' => 'Tour Privado a Chichén Itzá con Cenote',
        'description' => 'Tour guiado privado de un día completo a Chichén Itzá, una de las nuevas maravillas del mundo. Incluye transportación privada en van con aire acondicionado, entrada al cenote Ik Kil y comida buffet regional.',
        'price' => 1800.00,
        'category' => 'tours',
        'subcategory' => 'Culturales',
        'image_url' => '["https://images.unsplash.com/photo-1518638150341-db7e46ab655a?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Yucatán',
        'city' => 'Valladolid',
        'latitude' => 20.6903,
        'longitude' => -88.2017,
        'attributes' => json_encode(['duracion' => 'Día completo', 'idioma_guia' => 'Español, Inglés']),
    ],

    // 3. Билеты / boletos_turismo
    [
        'title' => 'Boleto de Acceso Rápido a Xcaret Plus',
        'description' => 'Disfruta de la mejor experiencia en el parque ecológico Xcaret. Incluye comida buffet, casillero, equipo de snorkel gratis y acceso al show de la noche. Boleto digital oficial transferible.',
        'price' => 2850.00,
        'category' => 'boletos_turismo',
        'subcategory' => 'Atracciones',
        'image_url' => '["https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Quintana Roo',
        'city' => 'Playa del Carmen',
        'latitude' => 20.6289,
        'longitude' => -87.0785,
        'attributes' => json_encode(['tipo_boleto' => 'Parques temáticos']),
    ],

    // 4. Товары для туризма / articulos_camping
    [
        'title' => 'Casa de Campaña Impermeable para 4 Personas',
        'description' => 'Casa de campaña marca Coleman ideal para cualquier clima. Impermeable, fácil de armar en menos de 5 minutos, con ventilación avanzada y espacio cómodo para 4 adultos. Prácticamente nueva, usada solo una vez.',
        'price' => 1450.00,
        'category' => 'articulos_camping',
        'subcategory' => 'Camping',
        'image_url' => '["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Nuevo León',
        'city' => 'Monterrey',
        'latitude' => 25.6866,
        'longitude' => -100.3161,
        'attributes' => json_encode(['estado_articulo' => 'Como nuevo']),
    ],

    // 5. Сувениры / souvenirs
    [
        'title' => 'Sombrero Charro Bordado a Mano Tradicional',
        'description' => 'Hermoso sombrero charro mexicano bordado a mano con hilos plateados metálicos. Fabricado en terciopelo de alta calidad. Ideal como decoración, regalo mexicano típico o souvenir de colección.',
        'price' => 950.00,
        'category' => 'souvenirs',
        'subcategory' => 'Artesanías',
        'image_url' => '["https://images.unsplash.com/photo-1590076212873-19597793d11b?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Jalisco',
        'city' => 'Guadalajara',
        'latitude' => 20.6597,
        'longitude' => -103.3496,
        'attributes' => json_encode(['material' => 'Terciopelo', 'tipo_souvenir' => 'Artesanías']),
    ],

    // 6. Аренда транспорта / renta_vehiculos
    [
        'title' => 'Yate de Lujo de 42 Pies para Paseos en Cancún',
        'description' => 'Renta de yate de lujo por hora o por día completo. Capacidad para 12 personas, incluye capitán, marinero, combustible, bebidas refrescantes y equipo de snorkel. Perfecto para festejar cumpleaños o paseos familiares a Isla Mujeres.',
        'price' => 3500.00,
        'category' => 'renta_vehiculos',
        'subcategory' => 'Yates y Barcos',
        'image_url' => '["https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Quintana Roo',
        'city' => 'Cancún',
        'latitude' => 21.1619,
        'longitude' => -86.8515,
        'attributes' => json_encode(['tipo_vehiculo' => 'Yate', 'combustible' => 'Incluido']),
    ],

    // 7. Гиды / guias_servicios
    [
        'title' => 'Guía Certificado bilingüe en Teotihuacán',
        'description' => '¿Visitas las pirámides de Teotihuacán? Ofrezco servicio de guía arqueológico certificado oficial de la SECTUR. Recorrido personalizado de 3 horas lleno de historia de la cultura teotihuacana. Hablo español e inglés.',
        'price' => 600.00,
        'category' => 'guias_servicios',
        'subcategory' => 'Guías',
        'image_url' => '["https://images.unsplash.com/photo-1608958416738-9cf89a5e87a2?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Estado de México',
        'city' => 'Teotihuacán',
        'latitude' => 19.6890,
        'longitude' => -98.8612,
        'attributes' => json_encode(['idiomas' => ['Español', 'Inglés']]),
    ],

    // 8. Развлечения / atracciones_exp
    [
        'title' => 'Vuelo en Globo Aerostático al Amanecer',
        'description' => 'Una experiencia única en la vida. Vuelo en globo aerostático sobre el valle de Teotihuacán al amanecer. Incluye brindis tradicional con vino espumoso, certificado de vuelo y desayuno americano en restaurante subterráneo.',
        'price' => 2300.00,
        'category' => 'atracciones_exp',
        'subcategory' => 'Aventuras',
        'image_url' => '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Estado de México',
        'city' => 'Teotihuacán',
        'latitude' => 19.6890,
        'longitude' => -98.8612,
        'attributes' => json_encode(['tipo_experiencia' => 'Aventura', 'duracion' => '4 horas']),
    ],

    // 9. Ретриты / retiros_bienestar
    [
        'title' => 'Retiro de Yoga y Meditación en la Selva de Tulum',
        'description' => 'Desconéctate y sana en nuestro retiro holístico de 3 días en el corazón de la selva de Tulum. Incluye clases diarias de Vinyasa Yoga, meditación de sonido con cuencos, ceremonia de temazcal y alimentación vegana orgánica.',
        'price' => 4500.00,
        'category' => 'retiros_bienestar',
        'subcategory' => 'Retiros',
        'image_url' => '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Quintana Roo',
        'city' => 'Tulum',
        'latitude' => 20.2114,
        'longitude' => -87.4654,
        'attributes' => json_encode(['tipo_retiro' => 'Yoga y Meditación', 'duracion' => '3 días']),
    ],

    // 10. Обучение / formacion
    [
        'title' => 'Curso de Preparación para Examen TOEFL iBT',
        'description' => 'Obtén la puntuación que necesitas para estudiar o trabajar en el extranjero. Curso intensivo de 40 horas en línea con profesor certificado nativo. Material didáctico digital oficial y exámenes simulados ilimitados incluidos.',
        'price' => 3200.00,
        'category' => 'formacion',
        'subcategory' => 'Cursos de Idiomas',
        'image_url' => '["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80"]',
        'state' => 'Ciudad de México',
        'city' => 'Benito Juárez',
        'latitude' => 19.3821,
        'longitude' => -99.1613,
        'attributes' => json_encode(['modalidad' => 'Online', 'tipo_estudio' => 'Idiomas']),
    ]
];

$count = 0;
foreach ($ads as $ad) {
    // Вставляем объявление
    $adId = DB::table('ads')->insertGetId([
        'title' => $ad['title'],
        'description' => $ad['description'],
        'price' => $ad['price'],
        'category' => $ad['category'],
        'subcategory' => $ad['subcategory'],
        'image_url' => $ad['image_url'],
        'state' => $ad['state'],
        'city' => $ad['city'],
        'latitude' => $ad['latitude'],
        'longitude' => $ad['longitude'],
        'user_id' => $userId,
        'attributes' => $ad['attributes'],
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    if ($adId) {
        $count++;
    }
}

echo "Successfully seeded " . $count . " ads in DB.\n";

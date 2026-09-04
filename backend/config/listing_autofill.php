<?php

return [
    'enabled' => env('LISTING_AUTOFILL_ENABLED', false),
    'gateway_url' => env('AI_MODERATION_GATEWAY_URL', 'http://mercasto-ai-gateway:8080'),
    'timeout_seconds' => (int) env('LISTING_AUTOFILL_TIMEOUT_SECONDS', 20),
    'max_images' => 2,
    'max_hint_chars' => 2000,
    'min_field_confidence' => 0.55,
    'subcategories' => [
        'motor' => ['Compactos', 'SUV', 'Pickup', 'Sedán', 'Hatchback', 'Coupé', 'Deportivos', 'Clásicos', 'Eléctricos', 'Accesorios', 'Camiones', 'Autobuses', 'Motos', 'Scooters', 'Cuatrimotos', 'UTV', 'Motos de agua', 'Refacciones', 'Cascos', 'Equipamiento', 'Bicicletas eléctricas', 'Patines eléctricos', 'Monociclos eléctricos', 'Karts de golf', 'Micro autos'],
        'inmobiliaria' => ['Casas en venta', 'Casas en renta', 'Departamentos', 'Terrenos', 'Locales comerciales', 'Oficinas', 'Bodegas', 'Renta vacacional'],
        'empleo' => ['Ventas', 'Chofer', 'Construcción', 'Administración', 'Atención al cliente', 'Tecnología', 'Hotelería', 'Medio tiempo'],
        'servicios' => ['Mudanzas', 'Limpieza', 'Plomería', 'Electricidad', 'Cerrajería', 'Clases', 'Diseño', 'Eventos'],
        'moda' => ['Ropa mujer', 'Ropa hombre', 'Calzado', 'Bolsos', 'Accesorios', 'Joyería', 'Cosmética'],
        'hogar' => ['Muebles', 'Decoración', 'Electrodomésticos', 'Cocina', 'Jardín', 'Herramientas', 'Organización'],
        'electronica' => ['Smartphones', 'Laptops', 'Tablets', 'PCs', 'Componentes', 'Monitores', 'TV y video', 'Audio', 'Smartwatches', 'Cámaras', 'Drones', 'Fundas y Carcasas', 'Cargadores y Cables', 'Impresoras', 'Redes', 'Accesorios', 'Repuestos'],
        'ocio' => ['Bicicletas', 'Gym', 'Running', 'Camping', 'Pesca', 'Surf', 'Kayak', 'Arte', 'Antigüedades', 'Cómics', 'Monedas y Billetes', 'Música y Vinilos', 'Instrumentos musicales', 'Entradas', 'Juegos'],
        'infantil' => ['Carriolas', 'Autoasientos', 'Cunas', 'Juguetes', 'Ropa infantil', 'Ropa bebé', 'Baño y cuidado', 'Escolar', 'Muebles infantiles', 'Seguridad'],
        'mascotas' => ['Perros', 'Gatos', 'Aves', 'Peces', 'Accesorios', 'Alimento', 'Veterinaria'],
        'negocios' => ['Traspasos', 'Franquicias', 'Equipamiento', 'Maquinaria', 'Industria', 'Inversión'],
        'formacion' => ['Libros', 'Cursos', 'Idiomas', 'Universidad', 'Infantil', 'Programación'],
        'boletos' => ['Conciertos', 'Deportes', 'Teatro y Cultura', 'Festivales', 'Cine', 'Conferencias'],
        'turismo' => [
            'hospedaje', 'tours', 'boletos_turismo', 'articulos_camping', 'souvenirs',
            'guias_servicios', 'atracciones_exp', 'retiros_bienestar', 'renta_autos',
            'renta_motos', 'renta_bicis', 'renta_yates', 'renta_acuatico',
            'renta_equipamiento', 'renta_quads', 'renta_campers',
        ],
    ],
];

<?php

return [
    'version' => 1,

    'verticals' => [
        'autos' => [
            'category_slugs' => [
                'coches-y-motor/coches',
                'coches-y-motor/motos',
                'coches-y-motor/refacciones',
            ],
            'attributes' => [
                'marca' => ['type' => 'string', 'filter' => 'exact'],
                'modelo' => ['type' => 'string', 'filter' => 'exact'],
                'año' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['year']],
                'kilometraje' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['km']],
                'transmision' => ['type' => 'string', 'filter' => 'exact'],
                'combustible' => ['type' => 'string', 'filter' => 'exact'],
            ],
        ],

        'inmuebles' => [
            'category_slugs' => [
                'inmuebles/casas-en-venta',
                'inmuebles/casas-en-renta',
                'inmuebles/departamentos',
                'inmuebles/terrenos',
                'inmuebles/locales-comerciales',
                'inmuebles/oficinas',
                'inmuebles/bodegas',
                'inmuebles/renta-vacacional',
            ],
            'attributes' => [
                'metros_cuadrados' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['m2']],
                'habitaciones' => ['type' => 'integer', 'filter' => 'range'],
                'baños' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['banos']],
                'tipo' => ['type' => 'string', 'filter' => 'exact'],
                'operacion' => ['type' => 'string', 'filter' => 'exact'],
            ],
        ],

        'empleos' => [
            'category_slugs' => [
                'empleos/ventas',
                'empleos/chofer',
                'empleos/construccion',
                'empleos/administracion',
                'empleos/atencion-al-cliente',
                'empleos/tecnologia',
                'empleos/hoteleria',
                'empleos/medio-tiempo',
            ],
            'attributes' => [
                'salario' => ['type' => 'integer', 'filter' => 'range'],
                'tipo_empleo' => ['type' => 'string', 'filter' => 'exact'],
                'modalidad' => ['type' => 'string', 'filter' => 'exact'],
                'experiencia' => ['type' => 'string', 'filter' => 'exact'],
            ],
        ],

        'electronica' => [
            'category_slugs' => [
                'electronica/laptops',
                'electronica/tablets',
                'electronica/tv-y-video',
                'electronica/audio',
                'electronica/camaras',
                'electronica/drones',
                'electronica/accesorios',
                'moviles-y-telefonia/iphone',
                'moviles-y-telefonia/android',
                'moviles-y-telefonia/smartwatch',
                'moviles-y-telefonia/accesorios',
                'moviles-y-telefonia/tablets',
                'moviles-y-telefonia/repuestos',
            ],
            'attributes' => [
                'marca' => ['type' => 'string', 'filter' => 'exact'],
                'modelo' => ['type' => 'string', 'filter' => 'exact'],
                'condicion' => ['type' => 'string', 'filter' => 'exact'],
                'almacenamiento' => ['type' => 'string', 'filter' => 'exact'],
            ],
        ],
    ],

    'global_filters' => [
        'price_min' => ['column' => 'price', 'operator' => '>=', 'type' => 'number', 'aliases' => ['min_price']],
        'price_max' => ['column' => 'price', 'operator' => '<=', 'type' => 'number', 'aliases' => ['max_price']],
        'published_days' => ['column' => 'created_at', 'type' => 'days_back', 'max' => 365],
        'verified_only' => ['relation' => 'user', 'column' => 'is_verified', 'type' => 'boolean'],
    ],
];

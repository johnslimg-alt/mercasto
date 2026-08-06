<?php

return [
    'version' => 1,

    'verticals' => [
        'autos' => [
            'category_slugs' => [
                'motor',
                'coches-y-motor/coches',
                'coches-y-motor/motos',
                'coches-y-motor/refacciones',
            ],
            'attributes' => [
                'marca' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['brand'], 'storage_aliases' => ['brand']],
                'modelo' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['model'], 'storage_aliases' => ['model']],
                'año' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['year'], 'storage_aliases' => ['year']],
                'kilometraje' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['km', 'kms'], 'storage_aliases' => ['km', 'kms']],
                'transmision' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['transmission'], 'storage_aliases' => ['transmission']],
                'combustible' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['fuel'], 'storage_aliases' => ['fuel']],
            ],
        ],

        'inmuebles' => [
            'category_slugs' => [
                'inmobiliaria',
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
                'metros_cuadrados' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['m2', 'area'], 'storage_aliases' => ['m2', 'area']],
                'habitaciones' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['rooms'], 'storage_aliases' => ['rooms']],
                'baños' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['banos', 'bathrooms'], 'storage_aliases' => ['banos', 'bathrooms']],
                'tipo' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['property_type'], 'storage_aliases' => ['property_type']],
                'operacion' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['listing_type'], 'storage_aliases' => ['listing_type']],
            ],
        ],

        'empleos' => [
            'category_slugs' => [
                'empleo',
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
                'salario' => ['type' => 'integer', 'filter' => 'range', 'aliases' => ['salary'], 'storage_aliases' => ['salary']],
                'tipo_empleo' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['contract_type'], 'storage_aliases' => ['contract_type']],
                'modalidad' => ['type' => 'string', 'filter' => 'exact', 'aliases' => ['working_hours'], 'storage_aliases' => ['working_hours']],
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

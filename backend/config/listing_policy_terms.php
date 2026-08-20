<?php

// Conservative text signals used only to route a listing to human review.
// A match never auto-rejects or auto-approves a listing. Keep these phrases
// narrow and use benign-context exclusions where an ordinary marketplace term
// would otherwise be ambiguous.
return [
    'weapons_ammunition_explosives' => [
        'include' => [
            'pistola', 'pistolas',
            'rifle', 'rifles',
            'escopeta', 'escopetas',
            'municion', 'municiones',
            'cartucho de arma', 'cartuchos de arma',
            'arma de fuego', 'armas de fuego',
            'revolver calibre', 'revolver arma', 'revolver 22', 'revolver 38', 'revolver 357',
            'firearm', 'firearms',
            'ammunition',
            'explosive', 'explosives',
            'grenade', 'grenades',
        ],
        'exclude' => [
            'pistola de calor', 'pistolas de calor',
            'pistola de silicon', 'pistola de silicona',
            'pistola para silicon', 'pistola para silicona',
            'pistola para pintar', 'pistola de pintura',
            'pistola de agua', 'pistola de masaje',
        ],
    ],
    'firearm_related_components' => [
        'include' => [
            'silenciador para arma', 'silenciadores para arma',
            'cargador para arma', 'cargadores para arma',
            'receptor de arma', 'receptores de arma',
            'firearm receiver', 'firearm receivers',
            'gun silencer', 'gun silencers',
            'firearm magazine', 'firearm magazines',
        ],
        'exclude' => [],
    ],
    'controlled_drugs_and_medicines' => [
        'include' => [
            'cocaina', 'metanfetamina', 'fentanilo', 'heroina',
            'droga controlada', 'drogas controladas',
            'medicamento controlado', 'medicamentos controlados',
            'controlled drug', 'controlled drugs',
            'controlled medicine', 'controlled medicines',
            'narcotic', 'narcotics',
        ],
        'exclude' => [],
    ],
    'regulated_health_products' => [
        'include' => [
            'medicamento con receta', 'medicamentos con receta',
            'medicamento de prescripcion', 'medicamentos de prescripcion',
            'prescription medicine', 'prescription medicines',
            'producto sanitario regulado', 'productos sanitarios regulados',
        ],
        'exclude' => [],
    ],
    'counterfeit_stolen_goods_false_documents' => [
        'include' => [
            'producto robado', 'productos robados',
            'mercancia robada', 'mercancias robadas',
            'producto falsificado', 'productos falsificados',
            'replica falsificada', 'replicas falsificadas',
            'pasaporte falso', 'pasaportes falsos',
            'ine falsa', 'credencial ine falsa',
            'licencia falsa', 'licencias falsas',
            'documento falso', 'documentos falsos',
            'stolen goods', 'counterfeit goods',
            'fake passport', 'fake passports',
            'forged document', 'forged documents',
        ],
        'exclude' => [],
    ],
    'regulated_wildlife' => [
        'include' => [
            'especie protegida', 'especies protegidas',
            'animal silvestre protegido', 'animales silvestres protegidos',
            'marfil', 'colmillo de elefante', 'colmillos de elefante',
            'protected species', 'wildlife ivory',
        ],
        'exclude' => [],
    ],
    'protected_cultural_property' => [
        'include' => [
            'pieza arqueologica', 'piezas arqueologicas',
            'objeto arqueologico', 'objetos arqueologicos',
            'artefacto arqueologico', 'artefactos arqueologicos',
            'monumento historico en venta', 'monumentos historicos en venta',
            'archaeological object', 'archaeological objects',
            'archaeological artifact', 'archaeological artifacts',
        ],
        'exclude' => [],
    ],
    'financial_identity_personal_data' => [
        'include' => [
            'venta de datos personales', 'datos personales en venta',
            'base de datos de clientes en venta', 'bases de datos de clientes en venta',
            'cuenta bancaria en venta', 'cuentas bancarias en venta',
            'identidad en venta', 'identidades en venta',
            'personal data for sale', 'bank account for sale', 'bank accounts for sale',
            'identity for sale', 'identities for sale',
        ],
        'exclude' => [],
    ],
    'adult_exploitative_content_services' => [
        'include' => [
            'servicio sexual', 'servicios sexuales',
            'contenido sexual de menores',
            'sexual service', 'sexual services',
            'sexual exploitation', 'minor sexual content',
        ],
        'exclude' => [],
    ],
    'dangerous_services_or_instructions' => [
        'include' => [
            'fabricacion de explosivos', 'como fabricar explosivos',
            'modificacion de armas', 'servicio de modificacion de armas',
            'weapon modification service', 'weapon modification services',
            'how to make explosives',
        ],
        'exclude' => [],
    ],
    'spam_fraud_impersonation_offplatform_abuse' => [
        'include' => [
            'suplantacion de identidad', 'phishing',
            'fraude de anticipo', 'fraudes de anticipo',
            'pago por adelantado para liberar',
            'impersonation service', 'impersonation services',
            'advance fee fraud',
        ],
        'exclude' => [],
    ],
];

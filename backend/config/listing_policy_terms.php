<?php

// Conservative text signals used only to route a listing to human review.
// A match never auto-rejects or auto-approves a listing. Keep these phrases
// narrow to avoid turning ordinary seller copy into moderation false positives.
return [
    'weapons_ammunition_explosives' => [
        'pistola', 'revolver', 'rifle', 'escopeta', 'municiones', 'cartuchos de arma',
        'arma de fuego', 'firearm', 'ammunition', 'explosive', 'grenade',
    ],
    'firearm_related_components' => [
        'silenciador para arma', 'cargador para arma', 'receptor de arma',
        'firearm receiver', 'gun silencer', 'firearm magazine',
    ],
    'controlled_drugs_and_medicines' => [
        'cocaina', 'metanfetamina', 'fentanilo', 'heroina', 'droga controlada',
        'medicamento controlado', 'controlled drug', 'controlled medicine', 'narcotic',
    ],
    'regulated_health_products' => [
        'medicamento con receta', 'medicamento de prescripcion', 'prescription medicine',
        'producto sanitario regulado',
    ],
    'counterfeit_stolen_goods_false_documents' => [
        'producto robado', 'mercancia robada', 'producto falsificado', 'replica falsificada',
        'pasaporte falso', 'ine falsa', 'licencia falsa', 'documento falso',
        'stolen goods', 'counterfeit goods', 'fake passport', 'forged document',
    ],
    'regulated_wildlife' => [
        'especie protegida', 'animal silvestre protegido', 'marfil', 'colmillo de elefante',
        'protected species', 'wildlife ivory',
    ],
    'protected_cultural_property' => [
        'pieza arqueologica', 'objeto arqueologico', 'artefacto arqueologico',
        'monumento historico en venta', 'archaeological object', 'archaeological artifact',
    ],
    'financial_identity_personal_data' => [
        'venta de datos personales', 'base de datos de clientes en venta', 'cuenta bancaria en venta',
        'identidad en venta', 'personal data for sale', 'bank account for sale', 'identity for sale',
    ],
    'adult_exploitative_content_services' => [
        'servicio sexual', 'servicios sexuales', 'contenido sexual de menores',
        'sexual service', 'sexual exploitation', 'minor sexual content',
    ],
    'dangerous_services_or_instructions' => [
        'fabricacion de explosivos', 'como fabricar explosivos', 'modificacion de armas',
        'weapon modification service', 'how to make explosives',
    ],
    'spam_fraud_impersonation_offplatform_abuse' => [
        'suplantacion de identidad', 'phishing', 'fraude de anticipo', 'pago por adelantado para liberar',
        'impersonation service', 'advance fee fraud',
    ],
];

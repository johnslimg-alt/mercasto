<?php

return [
    'version' => '2026-08-19-draft-1',
    'publication_status' => 'internal_draft',
    'legal_review_status' => 'pending',
    'reviewed_on' => '2026-08-19',
    'next_review_on' => '2026-11-19',

    // This matrix is an internal product-safety contract, not legal advice or
    // final public policy. Public policy publication remains blocked until a
    // qualified Mexico legal reviewer records approval.
    'allowed_dispositions' => [
        'prohibited',
        'restricted_verification',
        'allowed_with_conditions',
        'manual_legal_review',
    ],

    'enforcement' => [
        'human_authoritative' => true,
        'ai_may_auto_approve' => false,
        'ai_may_auto_reject' => false,
        'model_failure_disposition' => 'manual_review',
        'destructive_action_from_model_only' => false,
    ],

    // Current-law references are recorded only to make the draft reviewable.
    // A lawyer must determine the final legal treatment for individual cases.
    'sources' => [
        'weapons' => [
            'authority' => 'Camara de Diputados / Diario Oficial de la Federacion',
            'instrument' => 'Ley Federal de Armas de Fuego y Explosivos',
            'last_reform' => '2025-05-29',
        ],
        'health' => [
            'authority' => 'Camara de Diputados / Diario Oficial de la Federacion',
            'instrument' => 'Ley General de Salud',
            'last_reform' => '2026-01-15',
        ],
        'wildlife' => [
            'authority' => 'Camara de Diputados / Diario Oficial de la Federacion',
            'instrument' => 'Ley General de Vida Silvestre',
            'last_reform' => '2025-07-16',
        ],
        'cultural_property' => [
            'authority' => 'Camara de Diputados / Diario Oficial de la Federacion',
            'instrument' => 'Ley Federal sobre Monumentos y Zonas Arqueologicos, Artisticos e Historicos',
            'last_reform' => '2025-11-14',
        ],
    ],

    // Stable policy IDs are shared machine identifiers for publish preflight,
    // moderation, support and future AI assistance. Display copy must be
    // localized separately and must never be used as an API/policy identifier.
    'policies' => [
        'weapons_ammunition_explosives' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'weapon', 'firearm', 'gun', 'ammunition', 'ammo', 'explosive', 'grenade',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'firearm_related_components' => [
            'disposition' => 'manual_legal_review',
            'legal_review' => 'pending',
            'seller_evidence' => ['proof_of_lawful_status_if_requested'],
            'allowed_fields_media' => ['identity_safe_product_evidence'],
            'automated_signals' => [
                'firearm_component', 'firearm_part', 'receiver', 'magazine', 'silencer',
            ],
            'moderator_action' => 'hold_for_manual_legal_review',
            'appeal_path' => 'manual_legal_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'controlled_drugs_and_medicines' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'controlled_drug', 'controlled_medicine', 'narcotic', 'psychotropic', 'illegal_drug',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'regulated_health_products' => [
            'disposition' => 'manual_legal_review',
            'legal_review' => 'pending',
            'seller_evidence' => ['authorization_or_registration_if_applicable'],
            'allowed_fields_media' => ['product_label', 'authorization_evidence'],
            'automated_signals' => [
                'regulated_health_product', 'prescription_product', 'medical_claim',
            ],
            'moderator_action' => 'hold_for_manual_legal_review',
            'appeal_path' => 'manual_legal_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'counterfeit_stolen_goods_false_documents' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'counterfeit', 'stolen_goods', 'false_document', 'fake_document', 'forged_document',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'regulated_wildlife' => [
            'disposition' => 'restricted_verification',
            'legal_review' => 'pending',
            'seller_evidence' => ['species_provenance', 'permit_or_registration_if_applicable'],
            'allowed_fields_media' => ['non_sensitive_species_evidence', 'permit_redacted_for_public_display'],
            'automated_signals' => [
                'wildlife', 'protected_species', 'wildlife_part', 'wildlife_derivative',
            ],
            'moderator_action' => 'hold_until_verification_and_legal_review',
            'appeal_path' => 'manual_legal_review',
            'retention' => 'restricted_goods_verification_policy',
        ],
        'protected_cultural_property' => [
            'disposition' => 'manual_legal_review',
            'legal_review' => 'pending',
            'seller_evidence' => ['provenance_and_ownership_evidence'],
            'allowed_fields_media' => ['provenance_evidence_redacted_for_public_display'],
            'automated_signals' => [
                'archaeological_object', 'historic_monument', 'protected_cultural_property',
            ],
            'moderator_action' => 'hold_for_manual_legal_review',
            'appeal_path' => 'manual_legal_review',
            'retention' => 'restricted_goods_verification_policy',
        ],
        'financial_identity_personal_data' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'identity_document_sale', 'personal_data_sale', 'bank_account_sale', 'payment_instrument_sale',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'privacy_safe_moderation_evidence_policy',
        ],
        'adult_exploitative_content_services' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'sexual_exploitation', 'explicit_service', 'minor_sexual_content', 'nonconsensual_intimate_content',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'privacy_safe_moderation_evidence_policy',
        ],
        'dangerous_services_or_instructions' => [
            'disposition' => 'manual_legal_review',
            'legal_review' => 'pending',
            'seller_evidence' => ['license_or_authorization_if_applicable'],
            'allowed_fields_media' => ['non_sensitive_authorization_evidence'],
            'automated_signals' => [
                'dangerous_service', 'illegal_instruction', 'explosive_instruction', 'weapon_modification_service',
            ],
            'moderator_action' => 'hold_for_manual_legal_review',
            'appeal_path' => 'manual_legal_review',
            'retention' => 'moderation_evidence_policy',
        ],
        'spam_fraud_impersonation_offplatform_abuse' => [
            'disposition' => 'prohibited',
            'legal_review' => 'pending',
            'seller_evidence' => [],
            'allowed_fields_media' => [],
            'automated_signals' => [
                'spam', 'fraud', 'impersonation', 'phishing', 'advance_fee_fraud', 'search_manipulation',
            ],
            'moderator_action' => 'manual_review_then_reject_if_confirmed',
            'appeal_path' => 'standard_moderation_review',
            'retention' => 'fraud_moderation_evidence_policy',
        ],
    ],
];

<?php

return [
    'semantic' => [
        'enabled' => (bool) env('DISCOVERY_SEMANTIC_ENABLED', true),
        'max_distance' => (float) env('DISCOVERY_MAX_DISTANCE', 0.35),
        'candidate_limit' => (int) env('DISCOVERY_CANDIDATE_LIMIT', 96),
        'page_size' => 16,
        'max_pages' => (int) env('DISCOVERY_MAX_PAGES', 6),
        'timeout_seconds' => (int) env('DISCOVERY_EMBEDDING_TIMEOUT', 5),
        'model' => env('DISCOVERY_EMBEDDING_MODEL', 'nomic-embed-text:latest'),
        'dimensions' => 768,
        'index' => 'hnsw/vector_cosine_ops',
    ],
    'similar' => [
        'max_distance' => (float) env('DISCOVERY_SIMILAR_MAX_DISTANCE', 0.45),
        'price_floor_ratio' => (float) env('DISCOVERY_SIMILAR_PRICE_FLOOR_RATIO', 0.5),
        'price_ceiling_ratio' => (float) env('DISCOVERY_SIMILAR_PRICE_CEILING_RATIO', 1.5),
    ],
    'ranking' => [
        'mode' => 'shadow_hybrid',
        'lexical_weight' => 2.0,
        'semantic_weight' => 1.0,
        'sponsored_tie_break_bonus' => 0.00025,
    ],
];

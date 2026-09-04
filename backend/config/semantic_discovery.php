<?php

return [
    'enabled' => (bool) env('SEMANTIC_DISCOVERY_ENABLED', true),
    'mode' => env('SEMANTIC_DISCOVERY_MODE', 'fallback_only'),
    'embedding_model' => env('SEMANTIC_DISCOVERY_MODEL', 'nomic-embed-text'),
    'timeout_seconds' => max(1, min(5, (int) env('SEMANTIC_DISCOVERY_TIMEOUT_SECONDS', 3))),
    'max_distance' => max(0.05, min(1.0, (float) env('SEMANTIC_DISCOVERY_MAX_DISTANCE', 0.35))),
    'per_page' => 16,
    'max_page' => 100,
    'similar' => [
        'semantic_enabled' => (bool) env('SEMANTIC_SIMILAR_ENABLED', true),
        'limit' => max(1, min(12, (int) env('SEMANTIC_SIMILAR_LIMIT', 8))),
        'max_distance' => max(0.05, min(1.0, (float) env('SEMANTIC_SIMILAR_MAX_DISTANCE', 0.45))),
        'price_min_ratio' => max(0.1, min(1.0, (float) env('SEMANTIC_SIMILAR_PRICE_MIN_RATIO', 0.5))),
        'price_max_ratio' => max(1.0, min(5.0, (float) env('SEMANTIC_SIMILAR_PRICE_MAX_RATIO', 1.75))),
    ],
];

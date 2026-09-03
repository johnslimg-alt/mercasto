<?php

return [
    'enabled' => (bool) env('SEMANTIC_DISCOVERY_ENABLED', true),
    'mode' => env('SEMANTIC_DISCOVERY_MODE', 'fallback_only'),
    'embedding_model' => env('SEMANTIC_DISCOVERY_MODEL', 'nomic-embed-text'),
    'timeout_seconds' => max(1, min(5, (int) env('SEMANTIC_DISCOVERY_TIMEOUT_SECONDS', 3))),
    'max_distance' => max(0.05, min(1.0, (float) env('SEMANTIC_DISCOVERY_MAX_DISTANCE', 0.35))),
    'per_page' => 16,
    'max_page' => 100,
];

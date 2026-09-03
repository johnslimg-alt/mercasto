<?php

return [
    'hybrid_search_enabled' => filter_var(env('SEMANTIC_HYBRID_SEARCH_ENABLED', true), FILTER_VALIDATE_BOOL),
    'semantic_recommendations_enabled' => filter_var(env('SEMANTIC_RECOMMENDATIONS_ENABLED', true), FILTER_VALIDATE_BOOL),
    'exact_first_min_results' => max(1, min(16, (int) env('SEMANTIC_EXACT_FIRST_MIN_RESULTS', 3))),
    'candidate_multiplier' => max(1, min(5, (int) env('SEMANTIC_CANDIDATE_MULTIPLIER', 2))),
    'minimum_similarity' => max(0.0, min(1.0, (float) env('SEMANTIC_MINIMUM_SIMILARITY', 0.30))),
    'profile_history_limit' => max(1, min(50, (int) env('SEMANTIC_PROFILE_HISTORY_LIMIT', 20))),
];

<?php

return [
    // Emergency kill switch. When disabled, listings remain in the human queue
    // and no model call is required to continue moderation operations.
    'enabled' => env('AI_MODERATION_ENABLED', true),

    // Two independent gates are required before model output can ever become
    // authoritative. Changing only ASSIST_ONLY is intentionally insufficient:
    // the separate approval gate remains false until measured quality, legal
    // review and rollout readiness are explicitly accepted.
    'assist_only' => ! env('AI_MODERATION_ENFORCEMENT_APPROVED', false)
        || env('AI_MODERATION_ASSIST_ONLY', true),

    // Keep runtime bounded. The job already has its own queue timeout; this is
    // recorded here as the product-level moderation budget for observability.
    'max_runtime_seconds' => (int) env('AI_MODERATION_MAX_RUNTIME_SECONDS', 150),

    'rollout' => [
        'mode' => env('AI_MODERATION_ROLLOUT_MODE', 'assist'),
        'human_authoritative' => true,
        'enforcement_approved' => (bool) env('AI_MODERATION_ENFORCEMENT_APPROVED', false),
        'destructive_model_only_actions' => false,
    ],
];

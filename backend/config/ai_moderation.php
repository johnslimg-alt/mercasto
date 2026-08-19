<?php

return [
    // Emergency kill switch. When disabled, listings remain in the human queue
    // and no model call is required to continue moderation operations.
    'enabled' => env('AI_MODERATION_ENABLED', true),

    // First production rollout is intentionally assist-only. The model may
    // propose approved/rejected/manual_review, but only a human moderator can
    // make the authoritative listing decision while this flag is enabled.
    'assist_only' => env('AI_MODERATION_ASSIST_ONLY', true),

    // Keep runtime bounded. The job already has its own queue timeout; this is
    // recorded here as the product-level moderation budget for observability.
    'max_runtime_seconds' => (int) env('AI_MODERATION_MAX_RUNTIME_SECONDS', 150),

    'rollout' => [
        'mode' => env('AI_MODERATION_ROLLOUT_MODE', 'assist'),
        'human_authoritative' => true,
        'destructive_model_only_actions' => false,
    ],
];

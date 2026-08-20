<?php

return [
    // Emergency kill switch. When disabled, listings remain in the human queue
    // and no model call is required to continue moderation operations.
    'enabled' => env('AI_MODERATION_ENABLED', true),

    // Safety invariant for the first production rollout: model output is only
    // advisory. This is deliberately not environment-switchable in the policy
    // matrix rollout, so missing/unknown model flags can never auto-publish or
    // auto-reject a listing. A later measured rollout may introduce a separate
    // reviewed promotion gate.
    'assist_only' => true,

    // Keep runtime bounded below the queue timeout.
    'max_runtime_seconds' => (int) env('AI_MODERATION_MAX_RUNTIME_SECONDS', 150),

    'rollout' => [
        'mode' => 'assist',
        'human_authoritative' => true,
        'destructive_model_only_actions' => false,
    ],
];

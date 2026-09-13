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

    // How long the scheduler stops queueing new moderation work after the
    // private gateway fails. This MUST outlast the `ads:moderate-pending`
    // schedule interval (five minutes): a shorter window expires before the
    // next scheduled run, so the breaker would never suppress anything.
    'provider_backoff_seconds' => max(60, (int) env('AI_MODERATION_PROVIDER_BACKOFF_SECONDS', 600)),

    'rollout' => [
        'mode' => 'assist',
        'human_authoritative' => true,
        'destructive_model_only_actions' => false,
    ],
];

<?php

return [
    'enabled' => filter_var(env('LISTING_AUTOFILL_ENABLED', true), FILTER_VALIDATE_BOOL),
    'url' => env('LISTING_AUTOFILL_URL', env('AI_MODERATION_GATEWAY_URL', 'http://mercasto-ai-gateway:8080')),
    'timeout_seconds' => max(3, min(45, (int) env('LISTING_AUTOFILL_TIMEOUT_SECONDS', 22))),
];

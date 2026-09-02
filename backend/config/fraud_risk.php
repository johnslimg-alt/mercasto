<?php

return [
    'version' => '2026-09-01-python-shadow-2',
    'mode' => 'shadow_assist',
    'python' => [
        'enabled' => (bool) env('FRAUD_RISK_PYTHON_ENABLED', true),
        'url' => env('FRAUD_RISK_GATEWAY_URL', env('AI_MODERATION_GATEWAY_URL', 'http://mercasto-ai-gateway:8080')),
        'timeout_seconds' => (int) env('FRAUD_RISK_GATEWAY_TIMEOUT', 3),
    ],
    'thresholds' => [
        'low' => 20,
        'review' => 40,
        'high' => 70,
    ],
];

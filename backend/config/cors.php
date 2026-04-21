<?php

$frontendUrl = env('FRONTEND_URL', 'https://mercasto.com');
$frontendHost = parse_url($frontendUrl, PHP_URL_HOST);
$frontendScheme = parse_url($frontendUrl, PHP_URL_SCHEME);
$frontendOrigin = $frontendScheme && $frontendHost
    ? $frontendScheme . '://' . $frontendHost
    : 'https://mercasto.com';

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [$frontendOrigin],
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];

<?php

return [
    'service_account_path' => env('GOOGLE_REPORTING_SERVICE_ACCOUNT_PATH'),
    'search_console_site_url' => env('GOOGLE_SEARCH_CONSOLE_SITE_URL'),
    'analytics_property_id' => env('GOOGLE_ANALYTICS_PROPERTY_ID'),
    'token_url' => env('GOOGLE_REPORTING_TOKEN_URL', 'https://oauth2.googleapis.com/token'),
    'search_console_api' => env(
        'GOOGLE_SEARCH_CONSOLE_API',
        'https://searchconsole.googleapis.com/webmasters/v3'
    ),
    'analytics_data_api' => env(
        'GOOGLE_ANALYTICS_DATA_API',
        'https://analyticsdata.googleapis.com/v1beta'
    ),
    'timeout_seconds' => max(5, (int) env('GOOGLE_REPORTING_TIMEOUT', 20)),
    'ai_sources' => [
        'chatgpt', 'chatgpt.com', 'perplexity', 'perplexity.ai',
        'claude', 'claude.ai', 'gemini', 'gemini.google.com',
        'copilot', 'copilot.microsoft.com',
    ],
    'funnel_events' => [
        'sign_up', 'ad_posted', 'listing_published',
        'contact_opened', 'contact_click', 'purchase',
    ],
];

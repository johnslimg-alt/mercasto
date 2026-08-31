<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have a
    | conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('APP_URL').'/api/auth/google/callback',
    ],

    'openstreetmap' => [
        'nominatim_url' => env('OSM_NOMINATIM_URL', 'https://nominatim.openstreetmap.org'),
        'user_agent' => env('OSM_NOMINATIM_USER_AGENT', 'Mercasto/1.0 (+https://mercasto.com)'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APP_URL').'/api/auth/apple/callback',
    ],

    'telegram' => [
        'client_id' => env('TELEGRAM_CLIENT_ID', env('TELEGRAM_BOT_NAME')),
        'client_secret' => env('TELEGRAM_CLIENT_SECRET', env('TELEGRAM_BOT_TOKEN')),
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'redirect' => env('APP_URL').'/api/auth/telegram/callback',
    ],

    'twitter' => [
        'client_id' => env('TWITTER_CLIENT_ID'),
        'client_secret' => env('TWITTER_CLIENT_SECRET'),
        'redirect' => env('APP_URL').'/api/auth/twitter/callback',
    ],

    'twitter-oauth2' => [
        'client_id' => env('TWITTER_CLIENT_ID'),
        'client_secret' => env('TWITTER_CLIENT_SECRET'),
        'redirect' => env('APP_URL').'/api/auth/twitter/callback',
    ],

    'clip' => [
        'api_key' => env('CLIP_API_KEY'),
        'api_secret' => env('CLIP_API_SECRET'),
        'webhook_secret' => env('CLIP_WEBHOOK_SECRET'),
        'checkout_url' => env('CLIP_CHECKOUT_URL', 'https://api.payclip.com/v2/checkout'),
        'verification_url' => env('CLIP_VERIFICATION_URL', 'https://api.payclip.com/v2/checkout'),
    ],


    'ollama' => [
        'url' => env('OLLAMA_URL', 'http://mercasto_ollama:11434'),
        'model' => env('OLLAMA_TEXT_MODEL', 'qwen3.8:9b-local'),
        'timeout' => env('OLLAMA_TIMEOUT', 60),
        'base_url' => env('OLLAMA_BASE_URL', 'http://ollama:11434'),
        'chat_model' => env('OLLAMA_TEXT_MODEL', 'qwen3.8:9b-local'),
        'vision_model' => env('OLLAMA_VISION_MODEL', 'qwen3-vl:4b-instruct'),
        'keep_alive' => env('OLLAMA_KEEP_ALIVE', '24h'),
    ],

    'ai_moderation_gateway' => [
        'url' => env('AI_MODERATION_GATEWAY_URL', 'http://mercasto-ai-gateway:8080'),
        'token' => env('MERCASTO_AI_INTERNAL_TOKEN'),
        'timeout' => (int) env('AI_MODERATION_GATEWAY_TIMEOUT', 150),
    ],


    'webpush' => [
        'vapid_public_key' => env('VAPID_PUBLIC_KEY'),
        'vapid_private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    'firebase' => [
        'service_account_base64' => env('FIREBASE_SERVICE_ACCOUNT_BASE64'),
    ],

    'huawei_push' => [
        'app_id' => env('HUAWEI_PUSH_APP_ID'),
        'app_secret' => env('HUAWEI_PUSH_APP_SECRET'),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from' => env('TWILIO_FROM', '+15005550006'),
    ],

    'google_analytics' => [
        'measurement_id' => env('GOOGLE_ANALYTICS_MEASUREMENT_ID', 'G-VX87HQC817'),
        'api_secret' => env('GOOGLE_ANALYTICS_API_SECRET'),
        'endpoint' => env('GOOGLE_ANALYTICS_ENDPOINT', 'https://www.google-analytics.com/mp/collect'),
    ],

    'facebook' => [
        'pixel_id' => env('FACEBOOK_PIXEL_ID'),
        'access_token' => env('FACEBOOK_ACCESS_TOKEN'),
        'graph_version' => env('FACEBOOK_GRAPH_VERSION', 'v25.0'),
    ],

    'tiktok' => [
        'pixel_code' => env('TIKTOK_PIXEL_CODE', 'D9C3HKBC77UBS5FSD7C0'),
        'access_token' => env('TIKTOK_EVENTS_ACCESS_TOKEN', env('TIKTOK_ACCESS_TOKEN')),
        'events_api_endpoint' => env(
            'TIKTOK_EVENTS_API_ENDPOINT',
            'https://business-api.tiktok.com/open_api/v1.3/event/track/'
        ),
        'test_event_code' => env('TIKTOK_TEST_EVENT_CODE'),
        'marketing' => [
            'advertiser_id' => env('TIKTOK_ADVERTISER_ID', '7662999035432206356'),
            'access_token' => env('TIKTOK_MARKETING_ACCESS_TOKEN'),
            'app_id' => env('TIKTOK_MARKETING_APP_ID'),
            'app_secret' => env('TIKTOK_MARKETING_APP_SECRET'),
            'auth_code' => env('TIKTOK_MARKETING_AUTH_CODE'),
            'api_base' => env(
                'TIKTOK_MARKETING_API_BASE',
                'https://business-api.tiktok.com/open_api/v1.3'
            ),
        ],
    ],


];

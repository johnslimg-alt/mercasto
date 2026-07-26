<?php

return [
    'meta' => [
        'ad_account_id' => env('META_AD_ACCOUNT_ID'),
        'access_token' => env('META_MARKETING_ACCESS_TOKEN', env('FACEBOOK_ACCESS_TOKEN')),
        'graph_version' => env('FACEBOOK_GRAPH_VERSION', 'v25.0'),
    ],
];

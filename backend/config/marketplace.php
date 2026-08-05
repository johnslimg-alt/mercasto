<?php

return [
    'ad_lifetime_days' => max(1, (int) env('AD_LIFETIME_DAYS', 7)),
    'ad_renewal_days' => max(1, (int) env('AD_RENEWAL_DAYS', 7)),
    'ad_renewal_price_mxn' => max(1, (float) env('AD_RENEWAL_PRICE_MXN', 49)),
    'ad_renewal_product_code' => 'ad_renewal_7_days',

    // Fingerprints of historical Mercasto logos that were copied into per-ad
    // paths and must never be treated as seller-provided product photos.
    'legacy_placeholder_sha256' => [
        '690f06ce1ba1fd1ecf04edbcd2ff836f45c57f183f4cf362b238e77b72e9e979',
    ],
    'supply_readiness' => [
        'recent_days' => 90,
        'national' => [
            'genuine_active_min' => 30,
            'genuine_recent_90d_min' => 15,
            'genuine_sellers_min' => 10,
            'states_min' => 3,
            'location_completeness_min_percent' => 80,
        ],
        'state_category' => [
            'genuine_active_min' => 20,
            'genuine_recent_90d_min' => 10,
            'genuine_sellers_min' => 8,
            'cities_min' => 2,
            'location_completeness_min_percent' => 90,
            'consecutive_weekly_snapshots' => 2,
        ],
        'city_category' => [
            'genuine_active_min' => 12,
            'genuine_recent_90d_min' => 8,
            'genuine_sellers_min' => 5,
            'location_completeness_min_percent' => 100,
            'consecutive_weekly_snapshots' => 2,
        ],
    ],
];

<?php

return [
    'ad_lifetime_days' => max(1, (int) env('AD_LIFETIME_DAYS', 7)),
    'ad_renewal_days' => max(1, (int) env('AD_RENEWAL_DAYS', 7)),
    'ad_renewal_price_mxn' => max(1, (float) env('AD_RENEWAL_PRICE_MXN', 49)),
    'ad_renewal_product_code' => 'ad_renewal_7_days',
];

<?php

namespace App\Services\AI;

use App\Models\Ad;

class SellerMediaAwareFraudRiskFeatureExtractor extends FraudRiskFeatureExtractor
{
    public function forAd(Ad $ad): array
    {
        $features = parent::forAd($ad);

        // Generated illustrative covers are not seller-provided evidence. Keep
        // the Python boundary numeric/boolean-only while preserving the semantic
        // distinction needed by the high-value/no-photo risk rule.
        if ((bool) $ad->generated_cover && (float) ($ad->price ?? 0) > 10000) {
            $features['listing']['no_images_high_value'] = true;
        }

        return $features;
    }
}

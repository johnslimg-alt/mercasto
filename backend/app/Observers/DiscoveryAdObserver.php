<?php

namespace App\Observers;

use App\Jobs\GenerateAdEmbedding;
use App\Models\Ad;

class DiscoveryAdObserver extends AdObserver
{
    public function updated(Ad $ad): void
    {
        parent::updated($ad);

        $additionalDiscoveryFields = [
            'attributes',
            'condition',
            'location',
            'city',
            'state',
        ];
        if (! $ad->wasChanged($additionalDiscoveryFields) || app()->runningUnitTests()) {
            return;
        }

        GenerateAdEmbedding::dispatch($ad->id)->afterCommit();
    }
}

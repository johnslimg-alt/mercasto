<?php

namespace App\Observers;

use App\Models\Ad;
use App\Http\Controllers\Api\IndexNowController;
use Illuminate\Support\Facades\Log;

class AdObserver
{
    /**
     * Handle the Ad "created" event.
     */
    public function created(Ad $ad): void
    {
        Log::info('Ad created, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'create');
    }

    /**
     * Handle the Ad "updated" event.
     */
    public function updated(Ad $ad): void
    {
        // Only notify if important fields changed
        $importantFields = ['title', 'description', 'price', 'status', 'images'];
        
        if ($ad->wasChanged($importantFields)) {
            Log::info('Ad updated, notifying IndexNow', [
                'ad_id' => $ad->id,
                'changed_fields' => $ad->getChanges()
            ]);
            IndexNowController::notifyAdChange($ad, 'update');
        }
    }

    /**
     * Handle the Ad "deleted" event.
     */
    public function deleted(Ad $ad): void
    {
        Log::info('Ad deleted, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'delete');
    }

    /**
     * Handle the Ad "restored" event.
     */
    public function restored(Ad $ad): void
    {
        Log::info('Ad restored, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'update');
    }

    /**
     * Handle the Ad "force deleted" event.
     */
    public function forceDeleted(Ad $ad): void
    {
        Log::info('Ad force deleted, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'delete');
    }
}

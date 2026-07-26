<?php

use App\Http\Controllers\Api\MarketingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum', 'throttle:api'])
    ->prefix('api/admin/marketing')
    ->group(function () {
        Route::get('/meta/status', [MarketingController::class, 'metaStatus']);
        Route::get('/meta/campaigns', [MarketingController::class, 'metaCampaigns']);
        Route::patch('/meta/campaigns/{campaignId}/status', [MarketingController::class, 'updateMetaCampaignStatus']);
        Route::patch('/meta/campaigns/{campaignId}/budget', [MarketingController::class, 'updateMetaCampaignBudget']);
    });

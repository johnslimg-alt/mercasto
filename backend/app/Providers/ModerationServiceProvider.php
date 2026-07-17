<?php

namespace App\Providers;

use App\Http\Controllers\Api\AdminAdModerationController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ModerationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'throttle:api'])
            ->prefix('api/admin/moderation')
            ->group(function () {
                Route::get('/ads', [AdminAdModerationController::class, 'index']);
                Route::post('/process-pending', [AdminAdModerationController::class, 'processPending']);
                Route::get('/ads/{ad}', [AdminAdModerationController::class, 'show'])->whereNumber('ad');
                Route::post('/ads/{ad}/retry-ai', [AdminAdModerationController::class, 'retry'])->whereNumber('ad');
                Route::post('/ads/{ad}/decision', [AdminAdModerationController::class, 'decide'])->whereNumber('ad');
            });
    }
}

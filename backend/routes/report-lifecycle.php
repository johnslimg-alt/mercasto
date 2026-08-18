<?php

use App\Http\Controllers\Api\AdminReportLifecycleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum', 'throttle:api'])
    ->prefix('api/admin')
    ->group(function () {
        Route::patch('/reports/{id}/lifecycle', [AdminReportLifecycleController::class, 'transitionListing'])
            ->whereNumber('id');
        Route::patch('/user-reports/{id}/lifecycle', [AdminReportLifecycleController::class, 'transitionUser'])
            ->whereNumber('id');
    });

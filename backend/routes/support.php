<?php

use App\Http\Controllers\Api\SupportRequestController;
use Illuminate\Support\Facades\Route;

// Registered after routes/api.php so this controller intentionally replaces the legacy
// logging-only /api/contact closure while preserving its public 3/hour/IP contract.
Route::middleware(['api', 'throttle:3,60'])
    ->prefix('api')
    ->group(function () {
        Route::post('/contact', [SupportRequestController::class, 'store']);
    });

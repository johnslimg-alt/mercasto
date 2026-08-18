<?php

use App\Http\Controllers\Api\SupportRequestController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Registered after routes/api.php so this closure intentionally replaces the legacy
// logging-only /api/contact closure while preserving its public route signature and
// 3/hour/IP rate-limit contract. The durable behavior lives in the controller.
Route::middleware(['api', 'throttle:3,60'])
    ->prefix('api')
    ->group(function () {
        Route::post('/contact', function (Request $request) {
            return app(SupportRequestController::class)->store($request);
        });
    });

<?php

use App\Http\Controllers\Api\SupportRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'throttle:5,1'])
    ->prefix('api')
    ->group(function () {
        Route::post('/contact', [SupportRequestController::class, 'store']);
    });

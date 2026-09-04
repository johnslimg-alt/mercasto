<?php

use App\Http\Controllers\Api\ListingAutofillController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum', 'throttle:5,1'])
    ->post('/api/ads/autofill', ListingAutofillController::class);

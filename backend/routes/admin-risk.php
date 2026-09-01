<?php

use App\Http\Controllers\Api\AdminFraudRiskController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:30,1')->get('/risk/ads', [AdminFraudRiskController::class, 'index']);
Route::middleware('throttle:10,1')->post('/risk/ads/{ad}/analyze', [AdminFraudRiskController::class, 'analyze'])->whereNumber('ad');
Route::middleware('throttle:2,1')->post('/risk/batch', [AdminFraudRiskController::class, 'batch']);

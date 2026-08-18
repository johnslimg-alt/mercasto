<?php

use App\Http\Controllers\Api\ReportModerationController;
use Illuminate\Support\Facades\Route;

Route::patch('/reports/{id}/transition', [ReportModerationController::class, 'transitionListingReport'])->whereNumber('id');
Route::patch('/user-reports/{id}/transition', [ReportModerationController::class, 'transitionUserReport'])->whereNumber('id');

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShareAdController;

Route::get('/share/ads/{id}', ShareAdController::class)->whereNumber('id');

Route::get('/', function () {
    return view('welcome');
});

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShareAdController;
use App\Http\Controllers\Api\SitemapController;

Route::get('/sitemap.xml', [SitemapController::class, 'sitemapIndex']);
Route::get('/sitemap-main.xml', [SitemapController::class, 'index']);
Route::get('/sitemap-categories.xml', [SitemapController::class, 'categories']);
Route::get('/sitemap-states.xml', [SitemapController::class, 'states']);
Route::get('/sitemap-ads.xml', [SitemapController::class, 'ads']);

Route::get('/share/ads/{id}', ShareAdController::class)->whereNumber('id');

Route::get('/', function () {
    return view('welcome');
});

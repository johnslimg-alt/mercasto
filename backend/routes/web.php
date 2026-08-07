<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShareAdController;
use App\Http\Controllers\SeoShellController;
use App\Http\Controllers\Api\SitemapController;

Route::get('/sitemap.xml', [SitemapController::class, 'sitemapIndex']);
Route::get('/sitemap-main.xml', [SitemapController::class, 'index']);
Route::get('/sitemap-categories.xml', [SitemapController::class, 'categories']);
Route::get('/sitemap-states.xml', [SitemapController::class, 'states']);
Route::get('/sitemap-ads.xml', [SitemapController::class, 'ads']);

Route::get('/share/ads/{id}', ShareAdController::class)->whereNumber('id');
Route::get('/listings', [SeoShellController::class, 'listings']);
foreach (array_keys((array) config('vertical_seo.pages', [])) as $vertical) {
    Route::get('/' . $vertical, [SeoShellController::class, 'vertical']);
}
foreach (array_keys((array) config('vertical_seo.aliases', [])) as $alias) {
    Route::get('/' . $alias, [SeoShellController::class, 'verticalAlias']);
}
foreach ((array) config('vertical_seo.redirects', []) as $alias => $target) {
    Route::redirect('/' . $alias, '/' . $target, 301);
}
foreach (array_keys((array) config('public_seo.pages', [])) as $publicPage) {
    Route::get('/' . $publicPage, [SeoShellController::class, 'publicPage']);
}
Route::get('/como-funciona', [SeoShellController::class, 'source']);
Route::get('/seguridad', [SeoShellController::class, 'source']);
Route::get('/ayuda/publicar-anuncio', [SeoShellController::class, 'source']);
Route::get('/ayuda/comprar-y-contactar', [SeoShellController::class, 'source']);
Route::get('/tarifas', [SeoShellController::class, 'source']);
Route::get('/sobre-mercasto', [SeoShellController::class, 'source']);
Route::redirect('/safety', '/seguridad', 301);
Route::redirect('/acerca-de', '/sobre-mercasto', 301);
Route::redirect('/terms', '/terminos', 301);
Route::redirect('/privacy', '/privacidad', 301);
Route::redirect('/help', '/ayuda', 301);
Route::get('/ads/{id}', [SeoShellController::class, 'ad'])->whereNumber('id');

Route::get('/', function () {
    return view('welcome');
});

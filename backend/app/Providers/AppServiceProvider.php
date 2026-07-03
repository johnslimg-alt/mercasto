<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MetaEventController;
use App\Models\Ad;
use App\Observers\AdObserver;
use App\Support\MailLocale;
use App\Support\MailTranslations;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach (MailLocale::SUPPORTED as $locale) {
            Lang::addLines(MailTranslations::lines($locale), $locale);
        }

        if (! $this->app->runningInConsole()) {
            App::setLocale(MailLocale::resolve(request()));
        }

        Route::middleware('throttle:60,1')->prefix('api/meta/events')->group(function () {
            Route::post('/contact', [MetaEventController::class, 'contact']);
        });

        Route::middleware(['auth:sanctum', 'throttle:api'])->prefix('api/meta/events')->group(function () {
            Route::post('/post-ad', [MetaEventController::class, 'postAd']);
            Route::post('/wishlist', [MetaEventController::class, 'addToWishlist']);
        });

        RateLimiter::for("api", function ($request) {
            return Limit::perMinute(240)->by($request->ip());
        });

        RateLimiter::for("auth", function ($request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for("otp", function ($request) {
            return Limit::perHour(5)->by($request->ip());
        });

        RateLimiter::for("ads", function ($request) {
            return Limit::perDay(20)->by(optional($request->user())->id ?: $request->ip());
        });

        RateLimiter::for("search", function ($request) {
            return Limit::perMinute(240)->by($request->ip());
        });

        Gate::define("viewHorizon", function ($user) {
            return $user && $user->role === "admin";
        });

        Ad::observe(AdObserver::class);
    }
}

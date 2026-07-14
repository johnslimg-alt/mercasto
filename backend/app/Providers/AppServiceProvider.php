<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Lang;
use App\Models\Ad;
use App\Models\User;
use App\Observers\AdObserver;
use App\Observers\UserMetaRegistrationObserver;
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

        // Public read APIs serve several parallel widgets on each marketplace page.
        RateLimiter::for("api", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }
            return Limit::perMinute(240)->by($request->ip());
        });

        // Auth endpoints (login, register, OTP): 10 req/min per IP
        RateLimiter::for("auth", function ($request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // OTP sending: 5 per hour per IP
        RateLimiter::for("otp", function ($request) {
            return Limit::perHour(5)->by($request->ip());
        });

        // Ad creation: 20 new ads per day per user (unlimited for E2E test runs)
        RateLimiter::for("ads", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }
            return Limit::perDay(20)->by(optional($user)->id ?: $request->ip());
        });

        // Allow normal navigation across category landings without false 429s (unlimited for E2E)
        RateLimiter::for("search", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }
            return Limit::perMinute(240)->by($request->ip());
        });

        Gate::define("viewHorizon", function ($user) {
            return $user && $user->role === "admin";
        });

        // Register model observers.
        Ad::observe(AdObserver::class);
        User::observe(UserMetaRegistrationObserver::class);
    }
}

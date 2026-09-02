<?php

namespace App\Providers;

use App\Events\NewNotification;
use App\Http\Controllers\Api\AdminAdModerationController;
use App\Http\Controllers\Api\RiskAwareAdminAdModerationController;
use App\Listeners\DispatchNativePushFromNotification;
use App\Models\Ad;
use App\Models\User;
use App\Observers\AdObserver;
use App\Observers\UserMetaRegistrationObserver;
use App\Services\AI\FraudDetectionService;
use App\Services\AI\PythonFraudDetectionService;
use App\Support\MailLocale;
use App\Support\MailTranslations;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(FraudDetectionService::class, PythonFraudDetectionService::class);
        $this->app->bind(AdminAdModerationController::class, RiskAwareAdminAdModerationController::class);
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

        // Authenticated listing writes: cap bursty clients without affecting normal editing.
        RateLimiter::for("ad-mutations", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }

            $key = $user ? "user:{$user->id}" : "ip:{$request->ip()}";

            return [
                Limit::perMinute(30)->by($key),
                Limit::perHour(300)->by($key),
            ];
        });

        // Heavy import endpoints get a separate burst and daily budget.
        RateLimiter::for("uploads", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }

            $key = $user ? "user:{$user->id}" : "ip:{$request->ip()}";

            return [
                Limit::perMinute(5)->by($key),
                Limit::perDay(50)->by($key),
            ];
        });

        // Profile image uploads share a user budget across avatar, logo, banner, and profile updates.
        RateLimiter::for("profile-uploads", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }

            $key = $user ? "user:{$user->id}" : "ip:{$request->ip()}";

            return [
                Limit::perMinute(10)->by($key),
                Limit::perDay(100)->by($key),
            ];
        });

        // Identity documents are sensitive and expensive to parse/review, so use a tighter budget.
        RateLimiter::for("identity-uploads", function ($request) {
            $user = $request->user();
            if ($user && (str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
                return Limit::none();
            }

            $key = $user ? "user:{$user->id}" : "ip:{$request->ip()}";

            return [
                Limit::perHour(3)->by($key),
                Limit::perDay(10)->by($key),
            ];
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

        Event::listen(
            NewNotification::class,
            DispatchNativePushFromNotification::class,
        );

        // Register model observers.
        Ad::observe(AdObserver::class);
        User::observe(UserMetaRegistrationObserver::class);
    }
}

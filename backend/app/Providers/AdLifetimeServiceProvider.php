<?php

namespace App\Providers;

use App\Http\Controllers\Api\AdRenewalWebhookController;
use App\Http\Middleware\EnforcePaidAdRenewal;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AdLifetimeServiceProvider extends ServiceProvider
{
    public function boot(Router $router): void
    {
        $router->pushMiddlewareToGroup('api', EnforcePaidAdRenewal::class);

        Route::post('/api/webhooks/clip/ad-renewal', AdRenewalWebhookController::class)
            ->middleware('throttle:60,1');
    }
}

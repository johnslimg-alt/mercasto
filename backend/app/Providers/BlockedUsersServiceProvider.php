<?php

namespace App\Providers;

use App\Http\Controllers\Api\BlockedUserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class BlockedUsersServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware(['api', 'auth:sanctum'])
            ->prefix('api')
            ->group(function () {
                Route::get('/user/blocked-users', [BlockedUserController::class, 'index']);
                Route::post('/users/{id}/block', [BlockedUserController::class, 'store'])->whereNumber('id');
                Route::delete('/users/{id}/block', [BlockedUserController::class, 'destroy'])->whereNumber('id');
            });
    }
}

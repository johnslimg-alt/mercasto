<?php

use App\Http\Controllers\Api\AccountDeletionController;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

$trustedProxies = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', '127.0.0.1,::1')))));

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            Route::middleware(['api', 'auth:sanctum'])->delete('/api/user', [AccountDeletionController::class, 'delete']);
        },
    )
    ->withMiddleware(function (Middleware $middleware) use ($trustedProxies) {
        $middleware->trustProxies(at: $trustedProxies);
        $middleware->redirectGuestsTo(function (Request $request) {
            return $request->is('api/*') || $request->expectsJson() ? null : route('login');
        });
        $middleware->alias([
            'last-active' => \App\Http\Middleware\UpdateLastActive::class,
        ]);
        $middleware->appendToGroup('api', \App\Http\Middleware\UpdateLastActive::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return null;
        });
    })->create();

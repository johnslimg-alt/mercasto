<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\InviteWhitelist;

class InviteOnlyMiddleware
{
    /**
     * Routes that should always be accessible (public endpoints)
     */
    protected array $except = [
        // Waitlist system
        'api/waitlist/*',
        // Push notifications
        'api/push/vapid-key',
        'api/push/subscribe',
        'api/push/unsubscribe',
        'api/push/test',
        
        // Authentication (login only - register requires invite)
        'api/login',
        'api/login/two-factor',
        'api/forgot-password',
        'api/reset-password',
        'api/auth/*',
        
        // Public content (SEO, browsing ads)
        'api/ads',
        'api/ads/featured',
        'api/ads/*/similar',
        'api/ads/*/price-history',
        'api/ads/*/pdf',
        'api/ads/*/click',
        'api/ads/*/view',
        'api/ads/*/contact-click',
        'api/ads/impressions',
        'api/categories',
        'api/category-attributes',
        'api/states/counts',
        'api/search/suggestions',
        'api/recommendations/trending',
        'api/users/*/reviews',
        'api/users/*/profile',
        'api/users/*/business-profile',
        'api/stores',
        'api/banners',
        'api/banners/*/click',
        
        // SEO & Sitemaps
        'api/sitemap*',
        'api/google-merchant.xml',
        'api/indexnow/*',
        
        // Email verification (public)
        'api/email/verify',
        
        // Webhooks (payment providers)
        'api/webhooks/*',
        'api/payment/webhook',
        
        // Contact form
        'api/contact',
        
        // Health checks
        'api/health',
        'up',
        
        // Sanctum
        'sanctum/*',
        
        // Admin panel
        'api/admin/*',

        // Debug logging
        'api/debug-log',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip for excluded paths
        foreach ($this->except as $pattern) {
            if ($request->is($pattern)) {
                return $next($request);
            }
        }

        // Check if user is authenticated and whitelisted
        if (auth()->check()) {
            $user = auth()->user();
            
            // Admin users always have access
            if ($user->role === 'admin') {
                return $next($request);
            }
            
            // Check if user is whitelisted (email is in whitelist, not used yet or used by this user)
            $isWhitelisted = InviteWhitelist::where('email', $user->email)->exists();
            
            if ($isWhitelisted) {
                return $next($request);
            }
        }

        // For registration: check if email is in whitelist
        if ($request->is('api/register') && $request->has('email')) {
            $email = $request->input('email');
            $isWhitelisted = InviteWhitelist::where('email', $email)->exists();
            
            if ($isWhitelisted) {
                return $next($request);
            }
            
            // Email not in whitelist
            return response()->json([
                'message' => 'Registration is currently invite-only. Join the waitlist at mercasto.com/waitlist',
                'errors' => [
                    'email' => ['This email is not on the invite list. Please join the waitlist first.']
                ]
            ], 403);
        }

        // Check for valid invite code in query or cookie
        $inviteCode = $request->query('invite') ?? $request->cookie('invite_code');
        if ($inviteCode) {
            $whitelist = InviteWhitelist::where('invite_code', $inviteCode)->first();
            
            if ($whitelist) {
                // Set cookie for future requests
                return $next($request)->withCookie(
                    cookie()->forever('invite_code', $inviteCode)
                );
            }
        }

        // For API routes, return JSON error
        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'error' => 'Invite only',
                'message' => 'This feature is currently in invite-only mode. Join the waitlist at mercasto.com/waitlist',
            ], 403);
        }

        // For web routes, redirect to waitlist
        return redirect('/waitlist');
    }
}

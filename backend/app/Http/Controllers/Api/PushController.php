<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushController extends Controller
{
    /**
     * Subscribe user to push notifications
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string|max:500',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string',
        ]);

        $user = $request->user();
        
        // Remove existing subscription with same endpoint
        PushSubscription::where('endpoint', $request->endpoint)->delete();
        
        // Create new subscription
        $subscription = PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => $request->endpoint,
            'public_key' => $request->input('keys.p256dh'),
            'auth_token' => $request->input('keys.auth'),
        ]);

        Log::info("Push subscription created for user {$user->id}");

        return response()->json([
            'success' => true,
            'message' => 'Subscribed to push notifications',
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Unsubscribe user from push notifications
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $deleted = PushSubscription::where('endpoint', $request->endpoint)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Unsubscribed from push notifications',
            'deleted' => $deleted > 0,
        ]);
    }

    /**
     * Get VAPID public key (needed for frontend subscription)
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'publicKey' => config('services.webpush.vapid_public_key'),
        ]);
    }

    /**
     * Send test notification to current user
     */
    public function test(Request $request)
    {
        $user = $request->user();
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No push subscriptions found',
            ], 404);
        }

        $auth = [
            'VAPID' => [
                'subject' => 'mailto:hello@mercasto.com',
                'publicKey' => config('services.webpush.vapid_public_key'),
                'privateKey' => config('services.webpush.vapid_private_key'),
            ],
        ];

        $webPush = new WebPush($auth);
        $sent = 0;
        $failed = 0;

        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->public_key,
                    'authToken' => $sub->auth_token,
                ]);

                $report = $webPush->sendOneNotification(
                    $subscription,
                    json_encode([
                        'title' => '🎉 ¡Mercasto funciona!',
                        'body' => 'Las notificaciones push están activas',
                        'icon' => '/icon-192x192.png',
                        'badge' => '/icon-192x192.png',
                        'data' => ['url' => '/'],
                    ])
                );

                if ($report->isSuccess()) {
                    $sent++;
                } else {
                    $failed++;
                    // Remove failed subscription
                    if (strpos($report->getReason(), '410') !== false || strpos($report->getReason(), '404') !== false) {
                        $sub->delete();
                    }
                }
            } catch (\Exception $e) {
                Log::error("Push send error: " . $e->getMessage());
                $failed++;
            }
        }

        return response()->json([
            'success' => true,
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }
}

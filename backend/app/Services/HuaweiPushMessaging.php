<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HuaweiPushMessaging
{
    public function sendToUser(
        int $userId,
        string $title,
        string $body,
        array $data = []
    ): void {
        $appId = config('services.huawei_push.app_id');
        $appSecret = config('services.huawei_push.app_secret');
        if (!$appId || !$appSecret) {
            return;
        }

        $preferences = User::find($userId)?->notification_preferences ?? [];
        if (($preferences['push_notifications'] ?? true) === false) {
            return;
        }

        $tokens = DB::table('mobile_push_tokens')
            ->where('user_id', $userId)
            ->where('provider', 'hms')
            ->pluck('token')
            ->all();

        if ($tokens === []) {
            return;
        }

        $response = Http::withToken($this->accessToken($appId, $appSecret))
            ->timeout(10)
            ->post(
                "https://push-api.cloud.huawei.com/v1/{$appId}/messages:send",
                [
                    'validate_only' => false,
                    'message' => [
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'android' => [
                            'urgency' => 'HIGH',
                            'notification' => [
                                'click_action' => [
                                    'type' => 1,
                                    'intent' => 'mercasto://notifications',
                                ],
                            ],
                        ],
                        'data' => json_encode(
                            $data + ['title' => $title, 'body' => $body],
                            JSON_THROW_ON_ERROR
                        ),
                        'token' => $tokens,
                    ],
                ]
            )
            ->throw()
            ->json();

        if (($response['code'] ?? null) !== '80000000') {
            throw new RuntimeException(
                'Huawei Push rejected the message: '
                . ($response['msg'] ?? 'unknown error')
            );
        }
    }

    private function accessToken(string $appId, string $appSecret): string
    {
        return Cache::remember(
            'huawei.push.access_token',
            3300,
            function () use ($appId, $appSecret) {
                $response = Http::asForm()
                    ->timeout(10)
                    ->post(
                        'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
                        [
                            'grant_type' => 'client_credentials',
                            'client_id' => $appId,
                            'client_secret' => $appSecret,
                        ]
                    )
                    ->throw()
                    ->json();

                if (empty($response['access_token'])) {
                    throw new RuntimeException(
                        'Huawei OAuth response has no access token.'
                    );
                }

                return $response['access_token'];
            }
        );
    }
}

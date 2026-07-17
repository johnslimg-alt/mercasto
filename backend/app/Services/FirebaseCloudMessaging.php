<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FirebaseCloudMessaging
{
    public function sendToUser(
        int $userId,
        string $title,
        string $body,
        array $data = []
    ): void {
        $credentials = $this->credentials();
        if ($credentials === null) {
            return;
        }

        $preferences = User::find($userId)?->notification_preferences ?? [];
        if (($preferences['push_notifications'] ?? true) === false) {
            return;
        }

        $tokens = DB::table('mobile_push_tokens')
            ->where('user_id', $userId)
            ->where('provider', 'fcm')
            ->get();

        if ($tokens->isEmpty()) {
            return;
        }

        $accessToken = $this->accessToken($credentials);
        $projectId = $credentials['project_id'];

        foreach ($tokens as $token) {
            $response = Http::withToken($accessToken)
                ->timeout(10)
                ->post(
                    "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send",
                    [
                        'message' => [
                            'token' => $token->token,
                            'notification' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                            'data' => collect($data)
                                ->map(fn ($value) => (string) $value)
                                ->all(),
                            'android' => ['priority' => 'high'],
                        ],
                    ]
                );

            if ($response->successful()) {
                continue;
            }

            if ($this->tokenIsInvalid($response->json())) {
                DB::table('mobile_push_tokens')
                    ->where('id', $token->id)
                    ->delete();
                continue;
            }

            $response->throw();
        }
    }

    private function accessToken(array $credentials): string
    {
        return Cache::remember('firebase.messaging.access_token', 3300, function () use ($credentials) {
            $now = time();
            $claim = [
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ];

            $header = $this->base64Url(json_encode([
                'alg' => 'RS256',
                'typ' => 'JWT',
            ], JSON_THROW_ON_ERROR));
            $payload = $this->base64Url(
                json_encode($claim, JSON_THROW_ON_ERROR)
            );
            $unsignedToken = "{$header}.{$payload}";

            $signed = openssl_sign(
                $unsignedToken,
                $signature,
                $credentials['private_key'],
                OPENSSL_ALGO_SHA256
            );
            if (!$signed) {
                throw new RuntimeException('Unable to sign Firebase JWT.');
            }

            $jwt = "{$unsignedToken}.{$this->base64Url($signature)}";
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://oauth2.googleapis.com/token', [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ])
                ->throw()
                ->json();

            return $response['access_token'];
        });
    }

    private function credentials(): ?array
    {
        $encoded = config('services.firebase.service_account_base64');
        if (!$encoded) {
            return null;
        }

        $json = base64_decode($encoded, true);
        $credentials = $json === false
            ? null
            : json_decode($json, true);

        if (
            !is_array($credentials)
            || empty($credentials['project_id'])
            || empty($credentials['client_email'])
            || empty($credentials['private_key'])
        ) {
            throw new RuntimeException(
                'Invalid FIREBASE_SERVICE_ACCOUNT_BASE64 configuration.'
            );
        }

        return $credentials;
    }

    private function tokenIsInvalid(?array $response): bool
    {
        $details = $response['error']['details'] ?? [];
        foreach ($details as $detail) {
            $code = $detail['errorCode'] ?? null;
            if (in_array($code, ['UNREGISTERED', 'INVALID_ARGUMENT'], true)) {
                return true;
            }
        }

        return false;
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}

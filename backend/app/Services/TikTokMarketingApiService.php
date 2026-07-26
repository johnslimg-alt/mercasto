<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TikTokMarketingApiService
{
    public function advertiserId(): string
    {
        return trim((string) config('services.tiktok.marketing.advertiser_id', ''));
    }

    public function hasAccessToken(): bool
    {
        return trim((string) config('services.tiktok.marketing.access_token', '')) !== '';
    }

    public function credentialStatus(): array
    {
        return [
            'advertiser_id_configured' => $this->advertiserId() !== '',
            'access_token_configured' => $this->hasAccessToken(),
            'app_id_configured' => trim((string) config('services.tiktok.marketing.app_id', '')) !== '',
            'app_secret_configured' => trim((string) config('services.tiktok.marketing.app_secret', '')) !== '',
        ];
    }

    public function advertiserInfo(): array
    {
        $advertiserId = $this->advertiserId();

        if ($advertiserId === '') {
            return $this->configurationError('missing_advertiser_id');
        }

        return $this->request('GET', '/advertiser/info/', [
            'advertiser_ids' => [$advertiserId],
        ]);
    }

    public function authorizedAdvertisers(): array
    {
        return $this->request('GET', '/oauth2/advertiser/get/');
    }

    public function campaigns(array $filter = [], int $page = 1, int $pageSize = 20): array
    {
        $advertiserId = $this->advertiserId();

        if ($advertiserId === '') {
            return $this->configurationError('missing_advertiser_id');
        }

        $query = [
            'advertiser_id' => $advertiserId,
            'page' => max(1, $page),
            'page_size' => min(1000, max(1, $pageSize)),
        ];

        if ($filter !== []) {
            $query['filtering'] = $filter;
        }

        return $this->request('GET', '/campaign/get/', $query);
    }

    public function exchangeAuthCode(?string $authCode = null): array
    {
        $appId = trim((string) config('services.tiktok.marketing.app_id', ''));
        $appSecret = trim((string) config('services.tiktok.marketing.app_secret', ''));
        $authCode = trim((string) ($authCode ?: config('services.tiktok.marketing.auth_code', '')));

        if ($appId === '' || $appSecret === '' || $authCode === '') {
            return $this->configurationError('missing_oauth_credentials');
        }

        return $this->request(
            'POST',
            '/oauth2/access_token/',
            [
                'app_id' => $appId,
                'secret' => $appSecret,
                'auth_code' => $authCode,
            ],
            false
        );
    }

    private function request(
        string $method,
        string $path,
        array $payload = [],
        bool $authenticated = true
    ): array {
        $accessToken = trim((string) config('services.tiktok.marketing.access_token', ''));

        if ($authenticated && $accessToken === '') {
            return $this->configurationError('missing_marketing_access_token');
        }

        $baseUrl = rtrim((string) config(
            'services.tiktok.marketing.api_base',
            'https://business-api.tiktok.com/open_api/v1.3'
        ), '/');
        $url = $baseUrl.'/'.ltrim($path, '/');

        try {
            $client = Http::timeout(20)
                ->retry(2, 500)
                ->acceptJson();

            if ($authenticated) {
                $client = $client->withHeaders(['Access-Token' => $accessToken]);
            }

            $response = strtoupper($method) === 'GET'
                ? $client->get($url, $this->encodeQuery($payload))
                : $client->asJson()->post($url, $payload);

            $body = $response->json();
            $code = is_array($body) ? ($body['code'] ?? null) : null;
            $message = is_array($body)
                ? ($body['message'] ?? $body['msg'] ?? null)
                : null;
            $requestId = is_array($body)
                ? ($body['request_id'] ?? data_get($body, 'data.request_id'))
                : null;
            $ok = $response->successful() && ($code === null || (int) $code === 0);

            Log::info('TikTok Marketing API response', [
                'path' => $path,
                'advertiser_id' => $this->advertiserId() ?: null,
                'status' => $response->status(),
                'code' => $code,
                'message' => $message,
                'request_id' => $requestId,
            ]);

            return [
                'ok' => $ok,
                'status' => $response->status(),
                'code' => $code,
                'message' => $message,
                'request_id' => $requestId,
                'data' => is_array($body) ? ($body['data'] ?? null) : null,
            ];
        } catch (\Throwable $e) {
            Log::error('TikTok Marketing API request failed', [
                'path' => $path,
                'advertiser_id' => $this->advertiserId() ?: null,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'error' => $e->getMessage(),
                'reason' => 'request_failed',
            ];
        }
    }

    private function encodeQuery(array $query): array
    {
        foreach ($query as $key => $value) {
            if (is_array($value)) {
                $query[$key] = json_encode($value, JSON_UNESCAPED_SLASHES);
            }
        }

        return $query;
    }

    private function configurationError(string $reason): array
    {
        return [
            'ok' => false,
            'skipped' => true,
            'reason' => $reason,
            'credentials' => $this->credentialStatus(),
        ];
    }
}

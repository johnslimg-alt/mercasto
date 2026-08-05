<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Firebase\JWT\JWT;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class GoogleSeoReportingService
{
    private const SCOPES = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/analytics.readonly',
    ];

    public function collect(CarbonInterface $start, CarbonInterface $end): array
    {
        $readiness = $this->readiness();
        $searchConsole = ['status' => 'not_configured'];
        $ga4 = ['status' => 'not_configured'];

        if ($readiness['search_console_configured']) {
            $searchConsole = $this->safely(
                fn (): array => $this->searchConsole($start, $end),
            );
        }

        if ($readiness['ga4_data_configured']) {
            $ga4 = $this->safely(
                fn (): array => $this->ga4($start, $end),
            );
        }

        return [
            'readiness' => $readiness,
            'search_console' => $searchConsole,
            'ga4' => $ga4,
            'external_complete' => ($searchConsole['status'] ?? null) === 'ok'
                && ($ga4['status'] ?? null) === 'ok',
        ];
    }

    public function readiness(): array
    {
        $path = $this->credentialPath();
        $serviceAccount = $path !== null && is_file($path);
        $site = trim((string) config('seo_reporting.search_console_site_url'));
        $property = trim((string) config('seo_reporting.analytics_property_id'));

        return [
            'service_account_configured' => $serviceAccount,
            'search_console_site_configured' => $site !== '',
            'analytics_property_configured' => $property !== '',
            'search_console_configured' => $serviceAccount && $site !== '',
            'ga4_data_configured' => $serviceAccount && $property !== '',
            'status' => ! $serviceAccount
                ? 'not_configured'
                : (($site !== '' && $property !== '') ? 'ready' : 'partial'),
        ];
    }

    private function searchConsole(CarbonInterface $start, CarbonInterface $end): array
    {
        $token = $this->accessToken();
        $site = trim((string) config('seo_reporting.search_console_site_url'));
        $base = rtrim((string) config('seo_reporting.search_console_api'), '/');
        $sitePath = rawurlencode($site);
        $timeout = (int) config('seo_reporting.timeout_seconds', 20);

        $performance = Http::withToken($token)->timeout($timeout)->post(
            "{$base}/sites/{$sitePath}/searchAnalytics/query",
            [
                'startDate' => $start->toDateString(),
                'endDate' => $end->copy()->subDay()->toDateString(),
                'rowLimit' => 1,
            ],
        );
        $this->requireSuccess($performance);
        $row = (array) data_get($performance->json(), 'rows.0', []);

        $sitemaps = Http::withToken($token)->timeout($timeout)->get(
            "{$base}/sites/{$sitePath}/sitemaps",
        );
        $this->requireSuccess($sitemaps);
        $sitemapRows = collect((array) data_get($sitemaps->json(), 'sitemap', []));
        $contents = $sitemapRows->flatMap(
            fn (array $sitemap) => (array) ($sitemap['contents'] ?? []),
        );

        return [
            'status' => 'ok',
            'performance' => [
                'clicks' => (float) ($row['clicks'] ?? 0),
                'impressions' => (float) ($row['impressions'] ?? 0),
                'ctr_percent' => round(((float) ($row['ctr'] ?? 0)) * 100, 2),
                'average_position' => round((float) ($row['position'] ?? 0), 2),
            ],
            'sitemaps' => [
                'count' => $sitemapRows->count(),
                'submitted_urls' => (int) $contents->sum(
                    fn (array $row) => (int) ($row['submitted'] ?? 0),
                ),
                'indexed_urls' => (int) $contents->sum(
                    fn (array $row) => (int) ($row['indexed'] ?? 0),
                ),
            ],
        ];
    }

    private function ga4(CarbonInterface $start, CarbonInterface $end): array
    {
        $property = preg_replace(
            '#^properties/#',
            '',
            trim((string) config('seo_reporting.analytics_property_id')),
        );
        $dateRange = [[
            'startDate' => $start->toDateString(),
            'endDate' => $end->copy()->subDay()->toDateString(),
        ]];

        $channels = $this->runGaReport($property, [
            'dateRanges' => $dateRange,
            'dimensions' => [['name' => 'sessionDefaultChannelGroup']],
            'metrics' => [['name' => 'sessions'], ['name' => 'totalUsers']],
        ]);
        $organic = collect((array) ($channels['rows'] ?? []))->first(
            fn (array $row) => data_get($row, 'dimensionValues.0.value') === 'Organic Search',
        ) ?: [];

        $sources = $this->runGaReport($property, [
            'dateRanges' => $dateRange,
            'dimensions' => [['name' => 'sessionSource']],
            'metrics' => [['name' => 'sessions']],
            'dimensionFilter' => [
                'filter' => [
                    'fieldName' => 'sessionSource',
                    'inListFilter' => [
                        'values' => (array) config('seo_reporting.ai_sources', []),
                        'caseSensitive' => false,
                    ],
                ],
            ],
        ]);

        $events = $this->runGaReport($property, [
            'dateRanges' => $dateRange,
            'dimensions' => [['name' => 'eventName']],
            'metrics' => [['name' => 'eventCount']],
            'dimensionFilter' => [
                'filter' => [
                    'fieldName' => 'eventName',
                    'inListFilter' => [
                        'values' => (array) config('seo_reporting.funnel_events', []),
                        'caseSensitive' => true,
                    ],
                ],
            ],
        ]);

        return [
            'status' => 'ok',
            'organic_search' => [
                'sessions' => (int) data_get($organic, 'metricValues.0.value', 0),
                'users' => (int) data_get($organic, 'metricValues.1.value', 0),
            ],
            'ai_referrals' => collect((array) ($sources['rows'] ?? []))->map(
                fn (array $row) => [
                    'source' => (string) data_get($row, 'dimensionValues.0.value', ''),
                    'sessions' => (int) data_get($row, 'metricValues.0.value', 0),
                ],
            )->filter(fn (array $row) => $row['source'] !== '')->values()->all(),
            'funnel_events' => collect((array) ($events['rows'] ?? []))->mapWithKeys(
                fn (array $row) => [
                    (string) data_get($row, 'dimensionValues.0.value', 'unknown')
                        => (int) data_get($row, 'metricValues.0.value', 0),
                ],
            )->all(),
        ];
    }

    private function runGaReport(string $property, array $payload): array
    {
        $base = rtrim((string) config('seo_reporting.analytics_data_api'), '/');
        $response = Http::withToken($this->accessToken())
            ->timeout((int) config('seo_reporting.timeout_seconds', 20))
            ->post("{$base}/properties/{$property}:runReport", $payload);
        $this->requireSuccess($response);

        return (array) $response->json();
    }

    private function accessToken(): string
    {
        $credentials = $this->credentials();
        $cacheKey = 'seo-reporting-token:' . hash('sha256', $credentials['client_email']);

        return Cache::remember($cacheKey, now()->addMinutes(55), function () use ($credentials): string {
            $now = now()->timestamp;
            $assertion = JWT::encode([
                'iss' => $credentials['client_email'],
                'scope' => implode(' ', self::SCOPES),
                'aud' => $credentials['token_uri'],
                'iat' => $now,
                'exp' => $now + 3600,
            ], $credentials['private_key'], 'RS256');

            $response = Http::asForm()
                ->timeout((int) config('seo_reporting.timeout_seconds', 20))
                ->post($credentials['token_uri'], [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $assertion,
                ]);
            $this->requireSuccess($response);
            $token = trim((string) data_get($response->json(), 'access_token'));
            if ($token === '') {
                throw new RuntimeException('Google reporting token was not returned.');
            }

            return $token;
        });
    }

    private function credentials(): array
    {
        $path = $this->credentialPath();
        if ($path === null || ! is_file($path)) {
            throw new RuntimeException('Google reporting service account is not configured.');
        }

        $credentials = json_decode((string) file_get_contents($path), true);
        if (! is_array($credentials)) {
            throw new RuntimeException('Google reporting service account is invalid.');
        }
        $credentials['token_uri'] = trim((string) ($credentials['token_uri']
            ?? config('seo_reporting.token_url')));

        foreach (['client_email', 'private_key', 'token_uri'] as $field) {
            if (trim((string) ($credentials[$field] ?? '')) === '') {
                throw new RuntimeException('Google reporting service account is incomplete.');
            }
        }

        return $credentials;
    }

    private function credentialPath(): ?string
    {
        $configured = trim((string) config('seo_reporting.service_account_path'));
        if ($configured === '') {
            return null;
        }

        return str_starts_with($configured, '/') ? $configured : base_path($configured);
    }

    private function requireSuccess(Response $response): void
    {
        if (! $response->successful()) {
            throw new RuntimeException('Google reporting provider request failed.');
        }
    }

    private function safely(callable $callback): array
    {
        try {
            return $callback();
        } catch (Throwable) {
            return [
                'status' => 'error',
                'reason' => 'provider_request_failed',
            ];
        }
    }
}

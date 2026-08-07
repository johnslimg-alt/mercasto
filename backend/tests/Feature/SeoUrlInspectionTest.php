<?php

namespace Tests\Feature;

use App\Services\GoogleSeoReportingService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class SeoUrlInspectionTest extends TestCase
{
    private ?string $credentialFile = null;

    protected function tearDown(): void
    {
        if ($this->credentialFile && is_file($this->credentialFile)) {
            unlink($this->credentialFile);
        }
        parent::tearDown();
    }

    public function test_read_only_url_inspection_returns_bounded_safe_fields(): void
    {
        $this->configureReporting();
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'test-token'], 200),
            'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect' => Http::response([
                'inspectionResult' => [
                    'indexStatusResult' => [
                        'verdict' => 'PASS',
                        'coverageState' => 'Submitted and indexed',
                        'robotsTxtState' => 'ALLOWED',
                        'indexingState' => 'INDEXING_ALLOWED',
                        'pageFetchState' => 'SUCCESSFUL',
                        'lastCrawlTime' => '2026-08-07T06:00:00Z',
                        'googleCanonical' => 'https://mercasto.com/motor',
                        'userCanonical' => 'https://mercasto.com/motor',
                        'sitemap' => ['https://mercasto.com/sitemap.xml'],
                        'referringUrls' => ['https://example.invalid/private-referrer'],
                    ],
                ],
            ], 200),
        ]);

        $report = app(GoogleSeoReportingService::class)->inspectUrls([
            'https://mercasto.com/motor',
        ]);

        $this->assertSame(1, $report['count']);
        $this->assertSame('PASS', $report['results'][0]['verdict']);
        $this->assertSame('https://mercasto.com/motor', $report['results'][0]['google_canonical']);
        $this->assertSame(1, $report['results'][0]['sitemap_count']);
        $this->assertArrayNotHasKey('referringUrls', $report['results'][0]);
        $this->assertStringNotContainsString('private-referrer', json_encode($report));

        Http::assertSent(function (ClientRequest $request): bool {
            return $request->url() === 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
                && ($request->data()['inspectionUrl'] ?? null) === 'https://mercasto.com/motor'
                && ($request->data()['siteUrl'] ?? null) === 'https://mercasto.com/'
                && ($request->data()['languageCode'] ?? null) === 'en-US';
        });
    }

    public function test_inspection_rejects_external_query_or_fragment_urls_before_provider_call(): void
    {
        $this->configureReporting();
        Http::fake();
        $service = app(GoogleSeoReportingService::class);

        foreach ([
            'https://example.com/motor',
            'https://mercasto.com/motor?utm_source=test',
            'https://mercasto.com/motor#section',
        ] as $url) {
            try {
                $service->inspectUrls([$url]);
                $this->fail("Expected inspection URL rejection for {$url}");
            } catch (RuntimeException) {
                // Expected fail-closed validation before any Google request.
            }
        }

        Http::assertNothingSent();
    }

    public function test_command_normalizes_relative_paths_and_enforces_provider_success(): void
    {
        config(['seo_reporting.search_console_site_url' => 'https://mercasto.com/']);
        $service = \Mockery::mock(GoogleSeoReportingService::class);
        $service->shouldReceive('inspectUrls')
            ->once()
            ->with(['https://mercasto.com/motor'])
            ->andReturn([
                'site_url' => 'https://mercasto.com/',
                'count' => 1,
                'results' => [[
                    'url' => 'https://mercasto.com/motor',
                    'status' => 'ok',
                    'verdict' => 'PASS',
                ]],
            ]);
        $this->app->instance(GoogleSeoReportingService::class, $service);

        $this->artisan('seo:inspect-urls', [
            'urls' => ['/motor'],
            '--json' => true,
            '--require-provider' => true,
        ])->assertSuccessful();
    }

    private function configureReporting(): void
    {
        $key = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        $this->assertNotFalse($key);
        $privateKey = '';
        $this->assertTrue(openssl_pkey_export($key, $privateKey));

        $this->credentialFile = tempnam(sys_get_temp_dir(), 'seo-reporting-test-');
        file_put_contents($this->credentialFile, json_encode([
            'client_email' => 'seo-test@merc-example.invalid',
            'private_key' => $privateKey,
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ], JSON_THROW_ON_ERROR));

        config([
            'seo_reporting.service_account_path' => $this->credentialFile,
            'seo_reporting.search_console_site_url' => 'https://mercasto.com/',
            'seo_reporting.search_console_inspection_api' => 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
            'seo_reporting.timeout_seconds' => 5,
        ]);
    }
}

<?php

namespace App\Console\Commands;

use App\Services\GoogleSeoReportingService;
use Illuminate\Console\Command;
use RuntimeException;

class SeoInspectUrls extends Command
{
    protected $signature = 'seo:inspect-urls
        {urls* : Up to 20 Mercasto absolute URLs or paths}
        {--json : Emit machine-readable JSON}
        {--require-provider : Fail if any Search Console inspection request fails}';

    protected $description = 'Inspect bounded Mercasto URLs through the read-only Search Console URL Inspection API';

    public function handle(GoogleSeoReportingService $service): int
    {
        try {
            $urls = $this->normalizeUrls((array) $this->argument('urls'));
            $report = $service->inspectUrls($urls);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());
            return self::FAILURE;
        }

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(
                ['URL', 'Status', 'Verdict', 'Coverage', 'Last crawl', 'Google canonical', 'User canonical'],
                collect($report['results'])->map(fn (array $row) => [
                    $row['url'] ?? '',
                    $row['status'] ?? '',
                    $row['verdict'] ?? '',
                    $row['coverage_state'] ?? '',
                    $row['last_crawl_time'] ?? '',
                    $row['google_canonical'] ?? '',
                    $row['user_canonical'] ?? '',
                ])->all(),
            );
        }

        $hasErrors = collect($report['results'])->contains(fn (array $row) => ($row['status'] ?? null) !== 'ok');
        if ($this->option('require-provider') && $hasErrors) {
            $this->error('One or more Search Console URL Inspection requests failed.');
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function normalizeUrls(array $inputs): array
    {
        if ($inputs === [] || count($inputs) > 20) {
            throw new RuntimeException('Provide between 1 and 20 URLs.');
        }

        $site = trim((string) config('seo_reporting.search_console_site_url'));
        $base = str_starts_with($site, 'http://') || str_starts_with($site, 'https://')
            ? rtrim($site, '/')
            : '';

        $urls = collect($inputs)->map(function ($input) use ($base): string {
            $value = trim((string) $input);
            if (str_starts_with($value, '/')) {
                if ($base === '') {
                    throw new RuntimeException('Relative paths require an HTTP(S) Search Console URL-prefix property.');
                }
                return $base . $value;
            }
            return $value;
        })->unique()->values()->all();

        if ($urls === [] || count($urls) > 20) {
            throw new RuntimeException('Provide between 1 and 20 unique URLs.');
        }

        return $urls;
    }
}

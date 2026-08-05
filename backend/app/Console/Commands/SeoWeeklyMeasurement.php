<?php

namespace App\Console\Commands;

use App\Models\SeoMeasurementSnapshot;
use App\Services\SeoWeeklyMeasurementService;
use Illuminate\Console\Command;

class SeoWeeklyMeasurement extends Command
{
    protected $signature = 'seo:weekly-measurement
        {--days=7 : Rolling period length from 1 to 90 days}
        {--json : Emit machine-readable JSON}
        {--store : Store or replace the snapshot for this date range}
        {--require-external : Fail unless both Search Console and GA4 Data API succeed}';

    protected $description = 'Create a privacy-safe SEO, supply and conversion measurement snapshot';

    public function handle(SeoWeeklyMeasurementService $service): int
    {
        $days = filter_var($this->option('days'), FILTER_VALIDATE_INT);
        if ($days === false || $days < 1 || $days > 90) {
            $this->error('--days must be an integer from 1 to 90.');
            return self::FAILURE;
        }

        $report = $service->report($days);
        if ($report['privacy_hits'] !== []) {
            $this->error('Privacy scan failed; snapshot was not stored.');
            return self::FAILURE;
        }

        if ($this->option('store')) {
            SeoMeasurementSnapshot::query()->updateOrCreate(
                [
                    'period_start' => $report['period']['start'],
                    'period_end' => $report['period']['end'],
                ],
                [
                    'generated_at' => $report['generated_at'],
                    'external_complete' => $report['external']['external_complete'],
                    'report' => $report,
                ],
            );
        }

        if ($this->option('json')) {
            $this->line(json_encode(
                $report,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            ));
        } else {
            $this->renderReport($report);
        }

        if ($this->option('require-external') && ! $report['external']['external_complete']) {
            $this->error('Search Console and GA4 Data API reporting are not both complete.');
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function renderReport(array $report): void
    {
        $current = $report['internal']['current'];
        $supply = $report['supply']['summary'];
        $external = $report['external'];

        $this->info('Mercasto weekly SEO measurement');
        $this->table(['Metric', 'Value'], [
            ['Period', $report['period']['start'] . ' to ' . $report['period']['end']],
            ['New users', $current['new_users']],
            ['First publishers', $current['first_publishers']],
            ['Genuine ads created', $current['genuine_ads_created']],
            ['Genuine listing views', $current['genuine_listing_views']],
            ['Genuine contact clicks', $current['genuine_contact_clicks']],
            ['Registration → first publish', $current['registration_to_first_publish_percent'] . '%'],
            ['View → contact', $current['view_to_contact_percent'] . '%'],
            ['Active genuine supply', $supply['active_genuine']],
            ['Ready for seller confirmation', $supply['ready_for_seller_confirmation']],
            ['Indexable genuine listing URLs', $report['indexability']['indexable_genuine_listing_urls']],
            ['Catalog references kept noindex', $report['indexability']['active_catalog_references_noindex']],
            ['Search Console', $external['search_console']['status']],
            ['GA4 Data API', $external['ga4']['status']],
            ['Queue / failed jobs', $report['system']['queue_jobs'] . ' / ' . $report['system']['failed_jobs']],
        ]);

        if ($this->option('store')) {
            $this->info('Snapshot stored.');
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Services\SupplyReadinessService;
use Illuminate\Console\Command;

class SupplyReadinessReport extends Command
{
    protected $signature = 'ads:supply-readiness
        {--json : Emit machine-readable JSON}
        {--category= : Restrict the report to one category}
        {--state= : Restrict the report to one state}
        {--city= : Restrict the report to one city}';

    protected $description = 'Report genuine marketplace supply readiness without personal data';

    public function handle(SupplyReadinessService $service): int
    {
        $report = $service->report(
            $this->stringOption('category'),
            $this->stringOption('state'),
            $this->stringOption('city'),
        );

        if ($this->option('json')) {
            $this->line(json_encode(
                $report,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            ));
            return self::SUCCESS;
        }

        $summary = $report['summary'];
        $this->info('Mercasto genuine supply readiness');
        $this->table(['Metric', 'Value'], [
            ['Generated at', $report['generated_at']],
            ['Genuine ads total', $summary['genuine_total']],
            ['Active genuine', $summary['active_genuine']],
            ['Recent active (90d)', $summary['recent_active_90d']],
            ['Distinct active sellers', $summary['active_sellers']],
            ['Active states', $summary['active_states']],
            ['Active cities', $summary['active_cities']],
            ['Location completeness', $summary['location_completeness_percent'] . '%'],
            ['Ready for seller confirmation', $summary['ready_for_seller_confirmation']],
            ['National qualified', $report['qualification']['national']['qualified'] ? 'yes' : 'no'],
        ]);

        $this->line('Status breakdown: ' . json_encode(
            $summary['status_breakdown'],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        ));
        $this->line('Moderation backlog: ' . json_encode(
            $summary['moderation_backlog'],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        ));

        $this->renderCategoryTable($report['categories']);
        $this->renderLocationTable('State/category candidates', $report['state_categories'], false);
        $this->renderLocationTable('City/category candidates', $report['city_categories'], true);

        return self::SUCCESS;
    }

    private function renderCategoryTable(array $rows): void
    {
        if ($rows === []) {
            return;
        }

        $this->newLine();
        $this->info('Category readiness');
        $this->table(
            ['Category', 'Active', 'Recent', 'Sellers', 'States', 'Cities', 'Location %', 'Ready', 'Qualified'],
            collect($rows)->map(fn (array $row) => [
                $row['category'],
                $row['active_genuine'],
                $row['recent_active_90d'],
                $row['active_sellers'],
                $row['active_states'],
                $row['active_cities'],
                $row['location_completeness_percent'],
                $row['ready_for_seller_confirmation'],
                $row['qualification']['qualified'] ? 'yes' : 'no',
            ])->all(),
        );
    }

    private function renderLocationTable(string $title, array $rows, bool $includeCity): void
    {
        if ($rows === []) {
            return;
        }

        $headers = $includeCity
            ? ['State', 'City', 'Category', 'Active', 'Recent', 'Sellers', 'Location %', 'Qualified']
            : ['State', 'Category', 'Active', 'Recent', 'Sellers', 'Cities', 'Location %', 'Qualified'];

        $this->newLine();
        $this->info($title);
        $this->table(
            $headers,
            collect($rows)->map(function (array $row) use ($includeCity): array {
                if ($includeCity) {
                    return [
                        $row['state'], $row['city'], $row['category'],
                        $row['active_genuine'], $row['recent_active_90d'],
                        $row['active_sellers'], $row['location_completeness_percent'],
                        $row['qualification']['qualified'] ? 'yes' : 'no',
                    ];
                }

                return [
                    $row['state'], $row['category'], $row['active_genuine'],
                    $row['recent_active_90d'], $row['active_sellers'],
                    $row['active_cities'], $row['location_completeness_percent'],
                    $row['qualification']['qualified'] ? 'yes' : 'no',
                ];
            })->all(),
        );
    }

    private function stringOption(string $name): ?string
    {
        $value = trim((string) $this->option($name));
        return $value !== '' ? $value : null;
    }
}

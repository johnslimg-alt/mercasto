<?php

namespace App\Services;

use App\Models\Ad;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class SupplyReadinessService
{
    public function report(
        ?string $category = null,
        ?string $state = null,
        ?string $city = null,
    ): array {
        $recentDays = (int) config('marketplace.supply_readiness.recent_days', 90);
        $query = Ad::query()
            ->where('is_catalog_filler', false)
            ->select([
                'id', 'user_id', 'category', 'state', 'city', 'status',
                'created_at', 'updated_at', 'republished_at',
                'ai_moderation_status', 'moderation_submitted_at',
            ]);

        $this->applyFilter($query, 'category', $category);
        $this->applyFilter($query, 'state', $state);
        $this->applyFilter($query, 'city', $city);

        $ads = $query->get();
        $active = $ads->where('status', 'active')->values();

        return [
            'generated_at' => now()->toIso8601String(),
            'filters' => array_filter([
                'category' => $category,
                'state' => $state,
                'city' => $city,
            ], fn ($value) => $value !== null && $value !== ''),
            'thresholds' => config('marketplace.supply_readiness'),
            'summary' => [
                'genuine_total' => $ads->count(),
                'active_genuine' => $active->count(),
                'recent_active_90d' => $this->recentCount($active, $recentDays),
                'active_sellers' => $active->pluck('user_id')->unique()->count(),
                'active_states' => $this->distinctNonEmpty($active, 'state'),
                'active_cities' => $this->distinctNonEmpty($active, 'city'),
                ...$this->locationCompleteness($active),
                'ready_for_seller_confirmation' => $ads
                    ->where('status', 'archived')
                    ->where('ai_moderation_status', 'approved')
                    ->count(),
                'status_breakdown' => $this->countByValue($ads, 'status'),
                'moderation_backlog' => $this->moderationBacklog($ads),
            ],
            'qualification' => [
                'national' => $this->qualification(
                    $this->metrics($active, $recentDays),
                    (array) config('marketplace.supply_readiness.national', []),
                ),
            ],
            'categories' => $this->groupReport(
                $ads,
                ['category'],
                'national',
                $recentDays,
            ),
            'state_categories' => $this->groupReport(
                $active,
                ['state', 'category'],
                'state_category',
                $recentDays,
            ),
            'city_categories' => $this->groupReport(
                $active,
                ['state', 'city', 'category'],
                'city_category',
                $recentDays,
            ),
        ];
    }

    private function applyFilter($query, string $column, ?string $value): void
    {
        $value = trim((string) $value);
        if ($value !== '') {
            $query->where($column, $value);
        }
    }

    private function groupReport(
        Collection $ads,
        array $keys,
        string $thresholdKey,
        int $recentDays,
    ): array {
        $eligible = $ads->filter(function ($ad) use ($keys): bool {
            foreach ($keys as $key) {
                if (trim((string) data_get($ad, $key)) === '') {
                    return false;
                }
            }
            return true;
        });

        $threshold = (array) config("marketplace.supply_readiness.{$thresholdKey}", []);
        $rows = $eligible->groupBy(function ($ad) use ($keys): string {
            return json_encode(array_map(
                fn (string $key) => trim((string) data_get($ad, $key)),
                $keys,
            ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        })->map(function (Collection $group, string $groupKey) use ($keys, $threshold, $recentDays): array {
            $dimensions = array_combine(
                $keys,
                json_decode($groupKey, true) ?: [],
            );
            $active = $group->where('status', 'active')->values();
            $metrics = $this->metrics($active, $recentDays);

            return [
                ...($dimensions ?: []),
                'genuine_total' => $group->count(),
                ...$metrics,
                'ready_for_seller_confirmation' => $group
                    ->where('status', 'archived')
                    ->where('ai_moderation_status', 'approved')
                    ->count(),
                'status_breakdown' => $this->countByValue($group, 'status'),
                'qualification' => $this->qualification($metrics, $threshold),
            ];
        })->values();

        return $rows->sortByDesc(fn (array $row) => [
            $row['active_genuine'],
            $row['genuine_total'],
        ])->values()->all();
    }

    private function metrics(Collection $active, int $recentDays): array
    {
        return [
            'active_genuine' => $active->count(),
            'recent_active_90d' => $this->recentCount($active, $recentDays),
            'active_sellers' => $active->pluck('user_id')->unique()->count(),
            'active_states' => $this->distinctNonEmpty($active, 'state'),
            'active_cities' => $this->distinctNonEmpty($active, 'city'),
            ...$this->locationCompleteness($active),
        ];
    }

    private function recentCount(Collection $ads, int $recentDays): int
    {
        $cutoff = now()->subDays($recentDays);

        return $ads->filter(function ($ad) use ($cutoff): bool {
            $activityAt = $ad->republished_at ?: $ad->created_at;
            return $activityAt instanceof CarbonInterface && $activityAt->gte($cutoff);
        })->count();
    }

    private function distinctNonEmpty(Collection $ads, string $field): int
    {
        return $ads->map(fn ($ad) => trim((string) data_get($ad, $field)))
            ->filter()
            ->map(fn (string $value) => mb_strtolower($value))
            ->unique()
            ->count();
    }

    private function locationCompleteness(Collection $ads): array
    {
        $total = $ads->count();
        if ($total === 0) {
            return [
                'state_completeness_percent' => 0.0,
                'city_completeness_percent' => 0.0,
                'location_completeness_percent' => 0.0,
            ];
        }

        $stateComplete = $ads->filter(
            fn ($ad) => trim((string) $ad->state) !== '',
        )->count();
        $cityComplete = $ads->filter(
            fn ($ad) => trim((string) $ad->city) !== '',
        )->count();
        $fullComplete = $ads->filter(
            fn ($ad) => trim((string) $ad->state) !== ''
                && trim((string) $ad->city) !== '',
        )->count();

        return [
            'state_completeness_percent' => $this->percent($stateComplete, $total),
            'city_completeness_percent' => $this->percent($cityComplete, $total),
            'location_completeness_percent' => $this->percent($fullComplete, $total),
        ];
    }

    private function moderationBacklog(Collection $ads): array
    {
        return $this->countByValue(
            $ads->where('status', 'archived'),
            'ai_moderation_status',
            '(null)',
        );
    }

    private function countByValue(
        Collection $items,
        string $field,
        string $emptyLabel = '(empty)',
    ): array {
        return $items->countBy(function ($item) use ($field, $emptyLabel): string {
            $value = trim((string) data_get($item, $field));
            return $value !== '' ? $value : $emptyLabel;
        })->sortKeys()->all();
    }

    private function qualification(array $metrics, array $threshold): array
    {
        $metricMap = [
            'genuine_active_min' => 'active_genuine',
            'genuine_recent_90d_min' => 'recent_active_90d',
            'genuine_sellers_min' => 'active_sellers',
            'states_min' => 'active_states',
            'cities_min' => 'active_cities',
            'location_completeness_min_percent' => 'location_completeness_percent',
        ];

        $checks = [];
        foreach ($metricMap as $thresholdKey => $metricKey) {
            if (! array_key_exists($thresholdKey, $threshold)) {
                continue;
            }
            $actual = $metrics[$metricKey] ?? 0;
            $required = $threshold[$thresholdKey];
            $checks[$thresholdKey] = [
                'actual' => $actual,
                'required' => $required,
                'passed' => $actual >= $required,
            ];
        }

        return [
            'qualified' => $checks !== []
                && collect($checks)->every(fn (array $check) => $check['passed']),
            'checks' => $checks,
            'consecutive_weekly_snapshots_required' =>
                (int) ($threshold['consecutive_weekly_snapshots'] ?? 1),
        ];
    }

    private function percent(int $value, int $total): float
    {
        return round(($value / max(1, $total)) * 100, 1);
    }
}

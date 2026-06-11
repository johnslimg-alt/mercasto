<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

/**
 * Predictive analytics for demand forecasting
 * Uses time-series analysis to predict trends
 */
class DemandForecastingService
{
    /**
     * Get demand forecast for a category
     * Uses exponential smoothing (Holt-Winters simplified)
     */
    public function forecastCategory(string $categorySlug, int $daysAhead = 30): array
    {
        $cacheKey = "forecast_category_{$categorySlug}_{$daysAhead}";
        
        return Cache::remember($cacheKey, 3600, function () use ($categorySlug, $daysAhead) {
            // Get historical data (last 90 days)
            $historical = $this->getHistoricalData($categorySlug, 90);
            
            if (count($historical) < 14) {
                return ['error' => 'Insufficient data', 'data_points' => count($historical)];
            }

            // Calculate trend and seasonality
            $trend = $this->calculateTrend($historical);
            $seasonality = $this->calculateSeasonality($historical);
            $movingAvg = $this->movingAverage($historical, 7);
            
            // Generate forecast
            $forecast = [];
            $lastValue = end($historical)['value'] ?? 0;
            $lastDate = Carbon::parse(end($historical)['date']);
            
            for ($i = 1; $i <= $daysAhead; $i++) {
                $date = $lastDate->copy()->addDays($i);
                $dayOfWeek = $date->dayOfWeek;
                
                // Base forecast: trend extrapolation
                $predicted = $lastValue + ($trend['slope'] * $i);
                
                // Apply weekly seasonality
                $seasonalFactor = $seasonality[$dayOfWeek] ?? 1.0;
                $predicted *= $seasonalFactor;
                
                // Ensure non-negative
                $predicted = max(0, round($predicted));
                
                $forecast[] = [
                    'date' => $date->format('Y-m-d'),
                    'predicted_views' => $predicted,
                    'confidence_lower' => max(0, round($predicted * 0.7)),
                    'confidence_upper' => round($predicted * 1.3),
                ];
            }

            return [
                'category' => $categorySlug,
                'trend' => $trend,
                'historical_avg' => round(array_sum(array_column($historical, 'value')) / count($historical), 1),
                'forecast' => $forecast,
                'data_points' => count($historical),
                'generated_at' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Get trending categories (demand increasing)
     */
    public function getTrendingCategories(int $lookbackDays = 14): array
    {
        $cacheKey = "trending_categories_{$lookbackDays}";
        
        return Cache::remember($cacheKey, 1800, function () use ($lookbackDays) {
            $categories = DB::table('ads')
                ->select('category')
                ->whereNotNull('category')
                ->distinct()
                ->pluck('category')
                ->toArray();

            $trends = [];

            foreach ($categories as $category) {
                // Compare last 7 days vs previous 7 days
                $recent = $this->getDemandMetric($category, 7);
                $previous = $this->getDemandMetric($category, 7, 7);

                if ($previous > 0) {
                    $change = (($recent - $previous) / $previous) * 100;
                } else {
                    $change = $recent > 0 ? 100 : 0;
                }

                $trends[] = [
                    'category' => $category,
                    'recent_views' => $recent,
                    'previous_views' => $previous,
                    'change_percent' => round($change, 1),
                    'trend' => $change > 10 ? 'up' : ($change < -10 ? 'down' : 'stable'),
                ];
            }

            // Sort by change percent descending
            usort($trends, fn($a, $b) => $b['change_percent'] <=> $a['change_percent']);

            return $trends;
        });
    }

    /**
     * Predict best time to post (maximize visibility)
     */
    public function predictBestPostingTime(?string $categorySlug = null): array
    {
        $cacheKey = "best_posting_time_" . ($categorySlug ?? 'all');
        
        return Cache::remember($cacheKey, 3600, function () use ($categorySlug) {
            // Analyze views by hour and day of week
            $query = DB::table('ad_views')
                ->selectRaw('EXTRACT(HOUR FROM created_at) as hour, EXTRACT(DOW FROM created_at) as dow, COUNT(*) as views')
                ->where('created_at', '>', now()->subDays(30));

            if ($categorySlug) {
                $query->join('ads', 'ad_views.ad_id', '=', 'ads.id')
                      ->where('ads.category', $categorySlug);
            }

            $data = $query->groupBy('hour', 'dow')->get();

            // Calculate best hours
            $hourlyViews = array_fill(0, 24, 0);
            $dailyViews = array_fill(0, 7, 0);
            $heatmap = [];

            foreach ($data as $row) {
                $hourlyViews[$row->hour] += $row->views;
                $dailyViews[$row->dow] += $row->views;
                $heatmap[$row->dow][$row->hour] = $row->views;
            }

            // Find peak hours
            arsort($hourlyViews);
            $bestHours = array_slice(array_keys($hourlyViews), 0, 5);
            sort($bestHours);

            // Find best days
            $dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            arsort($dailyViews);
            $bestDays = array_slice(array_keys($dailyViews), 0, 3);

            return [
                'best_hours' => $bestHours,
                'best_hours_formatted' => array_map(fn($h) => sprintf('%02d:00', $h), $bestHours),
                'best_days' => array_map(fn($d) => $dayNames[$d], $bestDays),
                'best_days_ids' => $bestDays,
                'hourly_distribution' => $hourlyViews,
                'daily_distribution' => array_combine($dayNames, $dailyViews),
                'heatmap' => $heatmap,
                'recommendation' => $this->generatePostingRecommendation($bestHours, $bestDays, $dayNames),
            ];
        });
    }

    /**
     * Price trend prediction for a category
     */
    public function predictPriceTrend(string $categorySlug, int $daysAhead = 30): array
    {
        $cacheKey = "price_trend_{$categorySlug}_{$daysAhead}";
        
        return Cache::remember($cacheKey, 3600, function () use ($categorySlug, $daysAhead) {
            // Get average price by week for last 12 weeks
            $historical = DB::table('ads')
                ->selectRaw("DATE_TRUNC('week', created_at) as week, AVG(price) as avg_price, COUNT(*) as count")
                ->where('category', $categorySlug)
                ->where('status', 'active')
                ->whereNotNull('price')
                ->where('price', '>', 0)
                ->where('created_at', '>', now()->subWeeks(12))
                ->groupBy('week')
                ->orderBy('week')
                ->get();

            if ($historical->count() < 4) {
                return ['error' => 'Insufficient price data'];
            }

            // Calculate linear regression
            $prices = $historical->pluck('avg_price')->toArray();
            $n = count($prices);
            $sumX = array_sum(range(1, $n));
            $sumY = array_sum($prices);
            $sumXY = 0;
            $sumXX = 0;

            foreach ($prices as $i => $y) {
                $x = $i + 1;
                $sumXY += $x * $y;
                $sumXX += $x * $x;
            }

            $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumXX - $sumX * $sumX);
            $intercept = ($sumY - $slope * $sumX) / $n;

            // Forecast
            $forecast = [];
            $lastWeek = $n;
            
            for ($i = 1; $i <= $daysAhead / 7; $i++) {
                $week = $lastWeek + $i;
                $predicted = $slope * $week + $intercept;
                
                $forecast[] = [
                    'week' => $i,
                    'predicted_avg_price' => round($predicted, 2),
                    'trend' => $slope > 0 ? 'increasing' : ($slope < 0 ? 'decreasing' : 'stable'),
                ];
            }

            return [
                'category' => $categorySlug,
                'current_avg_price' => round(end($prices), 2),
                'slope_per_week' => round($slope, 2),
                'trend_direction' => $slope > 1 ? 'rising' : ($slope < -1 ? 'falling' : 'stable'),
                'forecast' => $forecast,
                'confidence' => $n >= 8 ? 'high' : ($n >= 4 ? 'medium' : 'low'),
            ];
        });
    }

    /**
     * Overall platform demand summary
     */
    public function getPlatformDemandSummary(): array
    {
        return Cache::remember('platform_demand_summary', 1800, function () {
            return [
                'total_views_today' => DB::table('ad_views')
                    ->where('created_at', '>', now()->startOfDay())
                    ->count(),
                'total_views_week' => DB::table('ad_views')
                    ->where('created_at', '>', now()->subDays(7))
                    ->count(),
                'views_trend' => $this->calculateViewTrend(),
                'new_ads_today' => DB::table('ads')
                    ->where('created_at', '>', now()->startOfDay())
                    ->count(),
                'new_ads_week' => DB::table('ads')
                    ->where('created_at', '>', now()->subDays(7))
                    ->count(),
                'active_users_today' => DB::table('ad_views')
                    ->where('created_at', '>', now()->startOfDay())
                    ->distinct('user_id')
                    ->count('user_id'),
                'top_categories' => $this->getTrendingCategories(7),
                'generated_at' => now()->toIso8601String(),
            ];
        });
    }

    // === HELPER METHODS ===

    private function getHistoricalData(string $categorySlug, int $days): array
    {
        $data = DB::table('ad_views')
            ->join('ads', 'ad_views.ad_id', '=', 'ads.id')
            ->selectRaw('DATE(ad_views.created_at) as date, COUNT(*) as value')
            ->where('ads.category', $categorySlug)
            ->where('ad_views.created_at', '>', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $data->map(fn($row) => [
            'date' => $row->date,
            'value' => $row->value,
        ])->toArray();
    }

    private function getDemandMetric(string $categorySlug, int $days, int $offset = 0): int
    {
        return DB::table('ad_views')
            ->join('ads', 'ad_views.ad_id', '=', 'ads.id')
            ->where('ads.category', $categorySlug)
            ->where('ad_views.created_at', '>', now()->subDays($days + $offset))
            ->where('ad_views.created_at', '<=', now()->subDays($offset))
            ->count();
    }

    private function calculateTrend(array $data): array
    {
        $n = count($data);
        if ($n < 2) return ['slope' => 0, 'direction' => 'stable'];

        $values = array_column($data, 'value');
        $sumX = array_sum(range(1, $n));
        $sumY = array_sum($values);
        $sumXY = 0;
        $sumXX = 0;

        foreach ($values as $i => $y) {
            $x = $i + 1;
            $sumXY += $x * $y;
            $sumXX += $x * $x;
        }

        $denominator = ($n * $sumXX - $sumX * $sumX);
        $slope = $denominator != 0 ? ($n * $sumXY - $sumX * $sumY) / $denominator : 0;

        return [
            'slope' => round($slope, 2),
            'direction' => $slope > 0.5 ? 'up' : ($slope < -0.5 ? 'down' : 'stable'),
        ];
    }

    private function calculateSeasonality(array $data): array
    {
        $byDay = array_fill(0, 7, []);
        
        foreach ($data as $point) {
            $dow = Carbon::parse($point['date'])->dayOfWeek;
            $byDay[$dow][] = $point['value'];
        }

        $overallAvg = array_sum(array_column($data, 'value')) / count($data);
        $seasonality = [];

        for ($d = 0; $d < 7; $d++) {
            if (empty($byDay[$d])) {
                $seasonality[$d] = 1.0;
                continue;
            }
            $dayAvg = array_sum($byDay[$d]) / count($byDay[$d]);
            $seasonality[$d] = $overallAvg > 0 ? round($dayAvg / $overallAvg, 2) : 1.0;
        }

        return $seasonality;
    }

    private function movingAverage(array $data, int $window): array
    {
        $result = [];
        $n = count($data);
        
        for ($i = 0; $i < $n; $i++) {
            $start = max(0, $i - $window + 1);
            $slice = array_slice(array_column($data, 'value'), $start, $i - $start + 1);
            $result[] = [
                'date' => $data[$i]['date'],
                'value' => round(array_sum($slice) / count($slice), 1),
            ];
        }

        return $result;
    }

    private function calculateViewTrend(): array
    {
        $thisWeek = DB::table('ad_views')
            ->where('created_at', '>', now()->subDays(7))
            ->count();
        
        $lastWeek = DB::table('ad_views')
            ->where('created_at', '>', now()->subDays(14))
            ->where('created_at', '<=', now()->subDays(7))
            ->count();

        $change = $lastWeek > 0 ? (($thisWeek - $lastWeek) / $lastWeek) * 100 : 0;

        return [
            'this_week' => $thisWeek,
            'last_week' => $lastWeek,
            'change_percent' => round($change, 1),
            'direction' => $change > 5 ? 'up' : ($change < -5 ? 'down' : 'stable'),
        ];
    }

    private function generatePostingRecommendation(array $bestHours, array $bestDays, array $dayNames): string
    {
        $hourStr = implode(', ', array_map(fn($h) => sprintf('%02d:00', $h), array_slice($bestHours, 0, 3)));
        $dayStr = implode(', ', array_map(fn($d) => $dayNames[$d], array_slice($bestDays, 0, 2)));
        
        return "Publica entre las {$hourStr} para máxima visibilidad. Los mejores días son {$dayStr}.";
    }
}

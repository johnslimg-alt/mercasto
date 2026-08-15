<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SeoMeasurementSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class AdminSeoMeasurementController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        if (! $request->user() || $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $limit = max(1, min(12, (int) $request->integer('limit', 12)));
        $snapshots = SeoMeasurementSnapshot::query()
            ->orderByDesc('period_end')
            ->orderByDesc('generated_at')
            ->limit($limit)
            ->get()
            ->map(fn (SeoMeasurementSnapshot $snapshot): array => [
                'period_start' => $snapshot->period_start?->toDateString(),
                'period_end' => $snapshot->period_end?->toDateString(),
                'generated_at' => $snapshot->generated_at?->toIso8601String(),
                'external_complete' => $snapshot->external_complete,
                'report' => $this->safeReport((array) $snapshot->report),
            ])
            ->values();

        return response()->json([
            'data' => $snapshots,
            'meta' => [
                'count' => $snapshots->count(),
                'limit' => $limit,
                'privacy_contract' => 'aggregate_only',
            ],
        ]);
    }

    private function safeReport(array $report): array
    {
        $period = Arr::only((array) ($report['period'] ?? []), [
            'days', 'start', 'end', 'timezone',
        ]);
        $internal = (array) ($report['internal'] ?? []);
        $supply = (array) ($report['supply'] ?? []);
        $external = (array) ($report['external'] ?? []);

        return [
            'period' => $period,
            'internal' => [
                'current' => $this->internalMetrics((array) ($internal['current'] ?? [])),
                'previous' => $this->internalMetrics((array) ($internal['previous'] ?? [])),
                'change_percent' => Arr::only(
                    (array) ($internal['change_percent'] ?? []),
                    $this->internalMetricKeys(),
                ),
            ],
            'supply' => [
                'summary' => Arr::only((array) ($supply['summary'] ?? []), [
                    'genuine_total', 'active_genuine', 'recent_active_90d',
                    'active_sellers', 'active_states', 'active_cities',
                    'state_completeness_percent', 'city_completeness_percent',
                    'location_completeness_percent', 'ready_for_seller_confirmation',
                    'status_breakdown', 'moderation_backlog',
                ]),
                'national_qualification' => Arr::only(
                    (array) ($supply['national_qualification'] ?? []),
                    ['qualified', 'checks'],
                ),
                'qualified_categories' => (int) ($supply['qualified_categories'] ?? 0),
                'qualified_state_categories' => (int) ($supply['qualified_state_categories'] ?? 0),
                'qualified_city_categories' => (int) ($supply['qualified_city_categories'] ?? 0),
            ],
            'indexability' => Arr::only((array) ($report['indexability'] ?? []), [
                'indexable_genuine_listing_urls', 'active_catalog_references_noindex',
                'source_pages', 'location_routes_open',
            ]),
            'external' => [
                'readiness' => Arr::only((array) ($external['readiness'] ?? []), [
                    'service_account_configured', 'search_console_site_configured',
                    'analytics_property_configured', 'search_console_configured',
                    'ga4_data_configured', 'status',
                ]),
                'search_console' => $this->safeProvider(
                    (array) ($external['search_console'] ?? []),
                    ['performance', 'sitemaps'],
                ),
                'ga4' => $this->safeProvider(
                    (array) ($external['ga4'] ?? []),
                    ['organic_search', 'ai_referrals', 'funnel_events'],
                ),
                'external_complete' => (bool) ($external['external_complete'] ?? false),
            ],
            'system' => Arr::only((array) ($report['system'] ?? []), [
                'queue_jobs', 'failed_jobs',
            ]),
            'privacy_clear' => ($report['privacy_hits'] ?? []) === [],
        ];
    }

    private function safeProvider(array $provider, array $allowedPayloads): array
    {
        return Arr::only($provider, [
            'status', 'reason', ...$allowedPayloads,
        ]);
    }

    private function internalMetrics(array $metrics): array
    {
        return Arr::only($metrics, $this->internalMetricKeys());
    }

    private function internalMetricKeys(): array
    {
        return [
            'new_users',
            'verified_new_users',
            'genuine_ads_created',
            'first_publishers',
            'genuine_listing_views',
            'genuine_contact_clicks',
            'distinct_contacted_listings',
            'registration_to_first_publish_percent',
            'view_to_contact_percent',
            'internal_conversations_started',
            'seller_replied_conversations',
            'seller_response_rate_percent',
            'median_first_response_minutes',
            'seller_replies_within_2h_percent',
        ];
    }
}

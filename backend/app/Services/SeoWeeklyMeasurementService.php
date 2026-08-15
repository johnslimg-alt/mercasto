<?php

namespace App\Services;

use App\Models\Ad;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class SeoWeeklyMeasurementService
{
    public function __construct(
        private readonly SupplyReadinessService $supplyReadiness,
        private readonly GoogleSeoReportingService $googleReporting,
    ) {
    }

    public function report(int $days = 7): array
    {
        $days = max(1, min(90, $days));
        $end = now();
        $start = $end->copy()->subDays($days);
        $previousEnd = $start->copy();
        $previousStart = $previousEnd->copy()->subDays($days);

        $current = $this->periodMetrics($start, $end);
        $previous = $this->periodMetrics($previousStart, $previousEnd);
        $supply = $this->supplyReadiness->report();
        $external = $this->googleReporting->collect($start, $end);

        $report = [
            'generated_at' => $end->toIso8601String(),
            'period' => [
                'days' => $days,
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'timezone' => (string) config('app.timezone', 'UTC'),
            ],
            'internal' => [
                'current' => $current,
                'previous' => $previous,
                'change_percent' => $this->changes($current, $previous),
            ],
            'supply' => [
                'summary' => $supply['summary'],
                'national_qualification' => $supply['qualification']['national'],
                'qualified_categories' => collect($supply['categories'])
                    ->where('qualification.qualified', true)
                    ->count(),
                'qualified_state_categories' => collect($supply['state_categories'])
                    ->where('qualification.qualified', true)
                    ->count(),
                'qualified_city_categories' => collect($supply['city_categories'])
                    ->where('qualification.qualified', true)
                    ->count(),
            ],
            'indexability' => $this->indexability(),
            'external' => $external,
            'system' => [
                'queue_jobs' => DB::table('jobs')->count(),
                'failed_jobs' => DB::table('failed_jobs')->count(),
            ],
        ];
        $report['privacy_hits'] = $this->privacyHits($report);

        return $report;
    }

    private function periodMetrics(CarbonInterface $start, CarbonInterface $end): array
    {
        $newUsers = $this->within(DB::table('users'), 'users.created_at', $start, $end)->count();
        $verifiedUsers = $this->within(DB::table('users'), 'users.created_at', $start, $end)
            ->where(function (Builder $query): void {
                $query->whereNotNull('email_verified_at')
                    ->orWhere('phone_verified', true)
                    ->orWhere('is_verified', true)
                    ->orWhere('kyc_status', 'approved');
            })->count();
        $genuineAds = $this->within(
            DB::table('ads')->where('is_catalog_filler', false),
            'ads.created_at',
            $start,
            $end,
        )->count();

        $firstAds = DB::table('ads')
            ->selectRaw('user_id, MIN(created_at) as first_ad_at')
            ->where('is_catalog_filler', false)
            ->whereNotNull('user_id')
            ->groupBy('user_id');
        $firstPublishers = DB::query()->fromSub($firstAds, 'first_ads')
            ->where('first_ad_at', '>=', $start)
            ->where('first_ad_at', '<', $end)
            ->count();

        $views = $this->within(
            DB::table('ad_views')->join('ads', 'ads.id', '=', 'ad_views.ad_id')
                ->where('ads.is_catalog_filler', false),
            'ad_views.created_at',
            $start,
            $end,
        );
        $contacts = $this->within(
            DB::table('ad_clicks')->join('ads', 'ads.id', '=', 'ad_clicks.ad_id')
                ->where('ads.is_catalog_filler', false),
            'ad_clicks.created_at',
            $start,
            $end,
        );
        $viewCount = $views->count();
        $contactCount = $contacts->count();
        $conversationMetrics = $this->conversationResponseMetrics($start, $end);
        $returnMetrics = $this->newUserReturnMetrics($start, $end);

        return [
            'new_users' => $newUsers,
            'verified_new_users' => $verifiedUsers,
            'genuine_ads_created' => $genuineAds,
            'first_publishers' => $firstPublishers,
            'genuine_listing_views' => $viewCount,
            'genuine_contact_clicks' => $contactCount,
            'distinct_contacted_listings' => $contacts->distinct()->count('ad_clicks.ad_id'),
            'registration_to_first_publish_percent' => $this->percent($firstPublishers, $newUsers),
            'view_to_contact_percent' => $this->percent($contactCount, $viewCount),
            ...$conversationMetrics,
            ...$returnMetrics,
        ];
    }

    private function newUserReturnMetrics(CarbonInterface $start, CarbonInterface $end): array
    {
        $eligibilityCutoff = Carbon::parse($end->toIso8601String())->subDay();
        if ($eligibilityCutoff->lessThanOrEqualTo($start)) {
            return [
                'new_user_24h_return_eligible' => 0,
                'new_user_24h_returned' => 0,
                'new_user_24h_return_rate_percent' => 0.0,
            ];
        }

        $eligible = $this->within(DB::table('users'), 'users.created_at', $start, $eligibilityCutoff);
        $eligibleCount = (clone $eligible)->count();
        $returnedCount = (clone $eligible)
            ->whereNotNull('users.first_return_after_24h_at')
            ->where('users.first_return_after_24h_at', '<', $end)
            ->count();

        return [
            'new_user_24h_return_eligible' => $eligibleCount,
            'new_user_24h_returned' => $returnedCount,
            'new_user_24h_return_rate_percent' => $this->percent($returnedCount, $eligibleCount),
        ];
    }

    private function conversationResponseMetrics(CarbonInterface $start, CarbonInterface $end): array
    {
        $conversations = $this->within(
            DB::table('conversations')
                ->join('ads', 'ads.id', '=', 'conversations.ad_id')
                ->where('ads.is_catalog_filler', false),
            'conversations.created_at',
            $start,
            $end,
        )->select([
            'conversations.id',
            'conversations.buyer_id',
            'conversations.seller_id',
        ])->get();

        if ($conversations->isEmpty()) {
            return [
                'internal_conversations_started' => 0,
                'seller_replied_conversations' => 0,
                'seller_response_rate_percent' => 0.0,
                'median_first_response_minutes' => null,
                'seller_replies_within_2h_percent' => 0.0,
            ];
        }

        $messages = DB::table('messages')
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->where('created_at', '<', $end)
            ->orderBy('created_at')
            ->get(['conversation_id', 'sender_id', 'created_at'])
            ->groupBy('conversation_id');

        $responseMinutes = [];
        foreach ($conversations as $conversation) {
            $firstBuyerAt = null;
            foreach ($messages->get($conversation->id, collect()) as $message) {
                if ($firstBuyerAt === null && (int) $message->sender_id === (int) $conversation->buyer_id) {
                    $firstBuyerAt = Carbon::parse($message->created_at);
                    continue;
                }
                if ($firstBuyerAt !== null && (int) $message->sender_id === (int) $conversation->seller_id) {
                    $sellerAt = Carbon::parse($message->created_at);
                    if ($sellerAt->greaterThanOrEqualTo($firstBuyerAt)) {
                        $responseMinutes[] = max(0.0, ($sellerAt->getTimestamp() - $firstBuyerAt->getTimestamp()) / 60);
                        break;
                    }
                }
            }
        }

        $started = $conversations->count();
        $replied = count($responseMinutes);
        $withinTwoHours = count(array_filter($responseMinutes, fn (float $minutes): bool => $minutes <= 120));

        return [
            'internal_conversations_started' => $started,
            'seller_replied_conversations' => $replied,
            'seller_response_rate_percent' => $this->percent($replied, $started),
            'median_first_response_minutes' => $this->median($responseMinutes),
            'seller_replies_within_2h_percent' => $this->percent($withinTwoHours, $started),
        ];
    }

    private function median(array $values): ?float
    {
        if ($values === []) {
            return null;
        }
        sort($values, SORT_NUMERIC);
        $count = count($values);
        $middle = intdiv($count, 2);
        $value = $count % 2 === 1
            ? $values[$middle]
            : ($values[$middle - 1] + $values[$middle]) / 2;

        return round((float) $value, 1);
    }

    private function indexability(): array
    {
        $indexable = Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->count();

        return [
            'indexable_genuine_listing_urls' => $indexable,
            'active_catalog_references_noindex' => Ad::query()
                ->where('is_catalog_filler', true)
                ->where('status', 'active')
                ->count(),
            'source_pages' => count((array) config('seo_source_pages.pages', [])),
            'location_routes_open' => 0,
        ];
    }

    private function changes(array $current, array $previous): array
    {
        return collect($current)->mapWithKeys(function (mixed $value, string $key) use ($previous): array {
            if (! is_numeric($value) || str_ends_with($key, '_percent')) {
                return [];
            }
            $before = (float) ($previous[$key] ?? 0);
            $after = (float) $value;

            return [$key => $before == 0.0
                ? ($after == 0.0 ? 0.0 : null)
                : round((($after - $before) / abs($before)) * 100, 1)];
        })->all();
    }

    private function within(
        Builder $query,
        string $column,
        CarbonInterface $start,
        CarbonInterface $end,
    ): Builder {
        return $query->where($column, '>=', $start)->where($column, '<', $end);
    }

    private function percent(int $value, int $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : 0.0;
    }

    private function privacyHits(array $report): array
    {
        $blockedKeys = [
            'email', 'phone', 'ip_address', 'user_id', 'seller_id',
            'listing_title', 'description', 'full_referrer_url', 'query_string',
        ];
        $hits = [];
        $walk = function (array $values, string $path = '') use (&$walk, &$hits, $blockedKeys): void {
            foreach ($values as $key => $value) {
                $current = ltrim($path . '.' . (string) $key, '.');
                if (in_array(mb_strtolower((string) $key), $blockedKeys, true)) {
                    $hits[] = $current;
                }
                if (is_array($value)) {
                    $walk($value, $current);
                }
            }
        };
        $walk($report);

        return array_values(array_unique($hits));
    }
}

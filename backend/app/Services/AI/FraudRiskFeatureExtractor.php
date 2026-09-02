<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FraudRiskFeatureExtractor
{
    public function forAd(Ad $ad): array
    {
        $userId = (int) $ad->user_id;
        $user = DB::table('users')
            ->select(['id', 'created_at', 'email_verified_at', 'phone_verified', 'is_verified', 'kyc_status'])
            ->where('id', $userId)
            ->first();
        $sinceHour = now()->subHour();
        $sinceDay = now()->subDay();
        $since90Days = now()->subDays(90);
        [$tokenCount, $maxTokenShare] = $this->textShape($ad);

        return [
            'account' => [
                'account_age_days' => $user?->created_at
                    ? min(36500, max(0, Carbon::parse($user->created_at)->diffInDays(now())))
                    : 36500,
                'verified_any' => (bool) (
                    $user?->email_verified_at
                    || $user?->phone_verified
                    || $user?->is_verified
                    || $user?->kyc_status === 'approved'
                ),
                'ads_1h' => $this->cap(Ad::query()->where('user_id', $userId)->where('created_at', '>=', $sinceHour)->count(), 10000),
                'ads_24h' => $this->cap(Ad::query()->where('user_id', $userId)->where('created_at', '>=', $sinceDay)->count(), 100000),
                'messages_1h' => $this->tableCount('messages', function ($query) use ($userId, $sinceHour) {
                    $query->where('sender_id', $userId)->where('created_at', '>=', $sinceHour);
                }, 100000),
                'distinct_recipients_1h' => $this->distinctCount(
                    'messages',
                    'receiver_id',
                    function ($query) use ($userId, $sinceHour) {
                        $query->where('sender_id', $userId)->where('created_at', '>=', $sinceHour);
                    },
                    100000,
                ),
                'resolved_user_reports_90d' => $this->tableCount('user_reports', function ($query) use ($userId, $since90Days) {
                    $query->where('reported_user_id', $userId)
                        ->where('status', 'resolved')
                        ->where('created_at', '>=', $since90Days);
                }, 10000),
                'resolved_ad_reports_90d' => $this->resolvedAdReportsForUser($userId, $since90Days),
                'violations_90d' => $this->tableCount('user_violations', function ($query) use ($userId, $since90Days) {
                    $query->where('user_id', $userId)->where('created_at', '>=', $since90Days);
                }, 10000),
                'admin_rejections_90d' => $this->adminRejectionsForUser($userId, $since90Days),
            ],
            'listing' => [
                'token_count' => $tokenCount,
                'max_token_share' => $maxTokenShare,
                'contact_pattern_count' => $this->contactPatternCount($ad),
                'exact_duplicate_ads' => $this->exactDuplicateCount($ad),
                'duplicate_media_ads' => $this->duplicateMediaCount($ad),
                'resolved_reports_90d' => $this->tableCount('reports', function ($query) use ($ad, $since90Days) {
                    $query->where('ad_id', $ad->id)
                        ->where('status', 'resolved')
                        ->where('created_at', '>=', $since90Days);
                }, 10000),
                'prior_admin_rejections' => $this->tableCount('ad_moderation_decisions', function ($query) use ($ad) {
                    $query->where('ad_id', $ad->id)
                        ->where('source', 'admin')
                        ->where('decision', 'rejected');
                }, 10000),
                'price_z_score' => $this->priceZScore($ad),
                'suspicious_keyword_score' => $this->suspiciousKeywordScore($ad),
                'no_images_high_value' => empty($ad->image_url) && (float) ($ad->price ?? 0) > 10000,
            ],
        ];
    }

    private function resolvedAdReportsForUser(int $userId, $since): int
    {
        if (! Schema::hasTable('reports') || ! Schema::hasTable('ads')) {
            return 0;
        }

        $count = DB::table('reports')
            ->join('ads', 'ads.id', '=', 'reports.ad_id')
            ->where('ads.user_id', $userId)
            ->where('reports.status', 'resolved')
            ->where('reports.created_at', '>=', $since)
            ->count();

        return $this->cap($count, 10000);
    }

    private function adminRejectionsForUser(int $userId, $since): int
    {
        if (! Schema::hasTable('ad_moderation_decisions') || ! Schema::hasTable('ads')) {
            return 0;
        }

        $count = DB::table('ad_moderation_decisions')
            ->join('ads', 'ads.id', '=', 'ad_moderation_decisions.ad_id')
            ->where('ads.user_id', $userId)
            ->where('ad_moderation_decisions.source', 'admin')
            ->where('ad_moderation_decisions.decision', 'rejected')
            ->where('ad_moderation_decisions.created_at', '>=', $since)
            ->count();

        return $this->cap($count, 10000);
    }

    private function tableCount(string $table, callable $scope, int $maximum): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        $query = DB::table($table);
        $scope($query);

        return $this->cap($query->count(), $maximum);
    }

    private function distinctCount(string $table, string $column, callable $scope, int $maximum): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        $query = DB::table($table);
        $scope($query);

        return $this->cap($query->distinct()->count($column), $maximum);
    }

    private function textShape(Ad $ad): array
    {
        $text = mb_strtolower(trim(strip_tags((string) ($ad->title ?? '').' '.(string) ($ad->description ?? ''))));
        if ($text === '') {
            return [0, 0.0];
        }

        $tokens = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $tokens = array_slice($tokens, 0, 100000);
        $count = count($tokens);
        if ($count === 0) {
            return [0, 0.0];
        }

        $frequencies = array_count_values($tokens);
        $maximum = max($frequencies);

        return [$count, min(1.0, round($maximum / $count, 6))];
    }

    private function contactPatternCount(Ad $ad): int
    {
        $text = (string) ($ad->title ?? '').' '.(string) ($ad->description ?? '');
        $patterns = [
            '/\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/u',
            '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/u',
            '/\bhttps?:\/\/[^\s]+/iu',
        ];

        return count(array_filter($patterns, fn (string $pattern): bool => preg_match($pattern, $text) === 1));
    }

    private function exactDuplicateCount(Ad $ad): int
    {
        $title = trim((string) ($ad->title ?? ''));
        $description = trim((string) ($ad->description ?? ''));
        if ($title === '' && $description === '') {
            return 0;
        }

        $count = Ad::query()
            ->where('id', '!=', $ad->id)
            ->where('title', $ad->title)
            ->where('description', $ad->description)
            ->count();

        return $this->cap($count, 10000);
    }

    private function duplicateMediaCount(Ad $ad): int
    {
        if (! Schema::hasTable('image_hashes')) {
            return 0;
        }

        $hashes = DB::table('image_hashes')
            ->where('ad_id', $ad->id)
            ->pluck('phash')
            ->filter(fn ($hash): bool => is_string($hash) && trim($hash) !== '')
            ->unique()
            ->values();

        if ($hashes->isEmpty()) {
            return 0;
        }

        $count = DB::table('image_hashes')
            ->whereIn('phash', $hashes->all())
            ->where('ad_id', '!=', $ad->id)
            ->distinct()
            ->count('ad_id');

        return $this->cap($count, 10000);
    }

    private function priceZScore(Ad $ad): float
    {
        $price = (float) ($ad->price ?? 0);
        if ($price <= 0 || trim((string) ($ad->category ?? '')) === '') {
            return 0.0;
        }

        $prices = DB::table('ads')
            ->where('category', $ad->category)
            ->where('status', 'active')
            ->where('id', '!=', $ad->id)
            ->whereNotNull('price')
            ->where('price', '>', 0)
            ->orderByDesc('created_at')
            ->limit(200)
            ->pluck('price')
            ->map(fn ($value): float => (float) $value)
            ->all();

        $count = count($prices);
        if ($count < 5) {
            return 0.0;
        }

        $average = array_sum($prices) / $count;
        $variance = array_sum(array_map(
            fn (float $value): float => ($value - $average) ** 2,
            $prices,
        )) / $count;
        $stddev = sqrt($variance);
        if ($stddev <= 0.0) {
            return 0.0;
        }

        return min(100.0, round(abs($price - $average) / $stddev, 4));
    }

    private function suspiciousKeywordScore(Ad $ad): int
    {
        $text = mb_strtolower((string) ($ad->title ?? '').' '.(string) ($ad->description ?? ''));
        $weights = [
            'urgent' => 5,
            'urgente' => 5,
            'oferta' => 3,
            'liquidación' => 5,
            'réplica' => 15,
            'replica' => 15,
            'copia' => 10,
            'imitación' => 15,
            'solo hoy' => 5,
            'only today' => 5,
            'western union' => 20,
            'moneygram' => 20,
            'bitcoin' => 10,
            'crypto' => 10,
            'anticipo' => 10,
            'depósito' => 5,
        ];

        $score = 0;
        foreach ($weights as $keyword => $points) {
            if (str_contains($text, $keyword)) {
                $score += $points;
            }
        }

        return min(100, $score);
    }

    private function cap(int $value, int $maximum): int
    {
        return max(0, min($maximum, $value));
    }
}

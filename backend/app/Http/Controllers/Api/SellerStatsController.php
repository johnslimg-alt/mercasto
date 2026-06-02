<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SellerStatsController extends Controller
{
    public function index(Request $request)
    {
        $user   = $request->user();
        $userId = $user->id;

        // --- Basic ad counts ---
        $totalAds  = DB::table('ads')->where('user_id', $userId)->count();
        $activeAds = DB::table('ads')->where('user_id', $userId)->where('status', 'active')->count();

        // --- Aggregate view count from ads.views column ---
        $totalViews = (int) DB::table('ads')
            ->where('user_id', $userId)
            ->sum('views');

        $totalImpressions = (int) DB::table('ad_impressions')
            ->whereIn('ad_id', $adIds = DB::table('ads')->where('user_id', $userId)->pluck('id'))
            ->count();

        $totalClicks = (int) DB::table('ad_clicks')
            ->whereIn('ad_id', $adIds)
            ->count();

        $clicksByChannel = DB::table('ad_clicks')
            ->whereIn('ad_id', $adIds)
            ->select('channel', DB::raw('COUNT(*) as count'))
            ->groupBy('channel')
            ->pluck('count', 'channel');

        $paidStatuses = ['paid', 'succeeded', 'approved'];
        $promotionCodes = ['boost_1_day', 'boost_3_days', 'highlight_7_days', 'featured_7_days', 'featured_30_days', 'top_category_7_days'];
        $promotionSpend = (float) DB::table('payments')
            ->whereIn('ad_id', $adIds)
            ->whereIn('status', $paidStatuses)
            ->whereIn('product_code', $promotionCodes)
            ->sum('amount');

        $activePromotedAds = DB::table('ads')
            ->where('user_id', $userId)
            ->whereNotNull('promoted')
            ->where(function ($query) {
                $query->whereNull('boost_expires_at')
                    ->orWhere('boost_expires_at', '>', now());
            })
            ->count();

        // --- Weekly view windows from ad_views log ---
        $now          = Carbon::now();
        $weekStart    = $now->copy()->subDays(7)->startOfDay();
        $prevWeekStart = $now->copy()->subDays(14)->startOfDay();

        $viewsThisWeek = DB::table('ad_views')
            ->whereIn('ad_id', $adIds)
            ->where('created_at', '>=', $weekStart)
            ->count();

        $viewsLastWeek = DB::table('ad_views')
            ->whereIn('ad_id', $adIds)
            ->whereBetween('created_at', [$prevWeekStart, $weekStart])
            ->count();

        // --- Views by day — last 7 days from ad_views log ---
        $viewsByDayRaw = DB::table('ad_views')
            ->whereIn('ad_id', $adIds)
            ->where('created_at', '>=', $weekStart)
            ->selectRaw("DATE(created_at) as date, COUNT(*) as views")
            ->groupByRaw("DATE(created_at)")
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $impressionsByDayRaw = DB::table('ad_impressions')
            ->whereIn('ad_id', $adIds)
            ->where('created_at', '>=', $weekStart)
            ->selectRaw("DATE(created_at) as date, COUNT(*) as impressions")
            ->groupByRaw("DATE(created_at)")
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $clicksByDayRaw = DB::table('ad_clicks')
            ->whereIn('ad_id', $adIds)
            ->where('created_at', '>=', $weekStart)
            ->selectRaw("DATE(created_at) as date, COUNT(*) as clicks")
            ->groupByRaw("DATE(created_at)")
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $viewsByDay = [];
        for ($i = 6; $i >= 0; $i--) {
            $date          = $now->copy()->subDays($i)->format('Y-m-d');
            $viewsByDay[]  = [
                'date'  => $date,
                'views' => isset($viewsByDayRaw[$date]) ? (int) $viewsByDayRaw[$date]->views : 0,
                'impressions' => isset($impressionsByDayRaw[$date]) ? (int) $impressionsByDayRaw[$date]->impressions : 0,
                'clicks' => isset($clicksByDayRaw[$date]) ? (int) $clicksByDayRaw[$date]->clicks : 0,
            ];
        }

        // --- Fallback: if ad_views log is empty but ads.views has data, distribute evenly ---
        if ($viewsThisWeek === 0 && $totalViews > 0) {
            $dailyAvg = (int) round($totalViews / max($totalAds * 30, 30));
            foreach ($viewsByDay as &$day) {
                $day['views'] = $dailyAvg;
            }
            unset($day);
            $viewsThisWeek = $dailyAvg * 7;
            $viewsLastWeek = $dailyAvg * 7;
        }

        // --- Favorites ---
        $totalFavorites = DB::table('favorites')
            ->whereIn('ad_id', $adIds)
            ->count();

        // --- Credits balance ---
        $creditsBalance = (int) ($user->referral_credits ?? 0);

        // --- Top ads by views ---
        $topAds = DB::table('ads')
            ->where('user_id', $userId)
            ->orderByDesc('views')
            ->limit(5)
            ->get(['id', 'title', 'views', 'price', 'status', 'promoted', 'boost_type', 'boost_expires_at'])
            ->map(function ($ad) use ($adIds) {
                $favCount = DB::table('favorites')->where('ad_id', $ad->id)->count();
                $impressions = DB::table('ad_impressions')->where('ad_id', $ad->id)->count();
                $clicks = DB::table('ad_clicks')->where('ad_id', $ad->id)->count();
                $spend = (float) DB::table('payments')
                    ->where('ad_id', $ad->id)
                    ->whereIn('status', ['paid', 'succeeded', 'approved'])
                    ->whereIn('product_code', ['boost_1_day', 'boost_3_days', 'highlight_7_days', 'featured_7_days', 'featured_30_days', 'top_category_7_days'])
                    ->sum('amount');
                return [
                    'id'        => $ad->id,
                    'title'     => $ad->title,
                    'views'     => (int) $ad->views,
                    'impressions' => $impressions,
                    'clicks'    => $clicks,
                    'ctr'       => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0,
                    'promotion_spend' => $spend,
                    'cost_per_click' => $clicks > 0 ? round($spend / $clicks, 2) : null,
                    'promoted' => $ad->promoted,
                    'boost_type' => $ad->boost_type,
                    'boost_expires_at' => $ad->boost_expires_at,
                    'favorites' => $favCount,
                    'price'     => (float) $ad->price,
                    'status'    => $ad->status,
                ];
            });

        return response()->json([
            'total_ads'       => $totalAds,
            'active_ads'      => $activeAds,
            'total_views'     => $totalViews,
            'total_impressions' => $totalImpressions,
            'total_clicks'    => $totalClicks,
            'ctr'             => $totalImpressions > 0 ? round(($totalClicks / $totalImpressions) * 100, 2) : 0,
            'clicks_by_channel' => $clicksByChannel,
            'promotion_spend' => $promotionSpend,
            'active_promoted_ads' => $activePromotedAds,
            'cost_per_click' => $totalClicks > 0 ? round($promotionSpend / $totalClicks, 2) : null,
            'total_favorites' => $totalFavorites,
            'credits_balance' => $creditsBalance,
            'views_this_week' => $viewsThisWeek,
            'views_last_week' => $viewsLastWeek,
            'top_ads'         => $topAds,
            'views_by_day'    => $viewsByDay,
        ]);
    }
}

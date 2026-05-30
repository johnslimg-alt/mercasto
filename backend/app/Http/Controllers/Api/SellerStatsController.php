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

        // --- Weekly view windows from ad_views log ---
        $now          = Carbon::now();
        $weekStart    = $now->copy()->subDays(7)->startOfDay();
        $prevWeekStart = $now->copy()->subDays(14)->startOfDay();

        $adIds = DB::table('ads')->where('user_id', $userId)->pluck('id');

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

        $viewsByDay = [];
        for ($i = 6; $i >= 0; $i--) {
            $date          = $now->copy()->subDays($i)->format('Y-m-d');
            $viewsByDay[]  = [
                'date'  => $date,
                'views' => isset($viewsByDayRaw[$date]) ? (int) $viewsByDayRaw[$date]->views : 0,
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

        // --- Messages / conversations initiated with this seller ---
        $totalMessages = DB::table('conversations')
            ->where('seller_id', $userId)
            ->count();

        // --- Credits balance ---
        $creditsBalance = (int) ($user->referral_credits ?? 0);

        // --- Top ads by views ---
        $topAds = DB::table('ads')
            ->where('user_id', $userId)
            ->orderByDesc('views')
            ->limit(5)
            ->get(['id', 'title', 'views', 'price', 'status'])
            ->map(function ($ad) use ($adIds) {
                $favCount = DB::table('favorites')->where('ad_id', $ad->id)->count();
                return [
                    'id'        => $ad->id,
                    'title'     => $ad->title,
                    'views'     => (int) $ad->views,
                    'favorites' => $favCount,
                    'price'     => (float) $ad->price,
                    'status'    => $ad->status,
                ];
            });

        return response()->json([
            'total_ads'       => $totalAds,
            'active_ads'      => $activeAds,
            'total_views'     => $totalViews,
            'total_favorites' => $totalFavorites,
            'total_messages'  => $totalMessages,
            'credits_balance' => $creditsBalance,
            'views_this_week' => $viewsThisWeek,
            'views_last_week' => $viewsLastWeek,
            'top_ads'         => $topAds,
            'views_by_day'    => $viewsByDay,
        ]);
    }
}

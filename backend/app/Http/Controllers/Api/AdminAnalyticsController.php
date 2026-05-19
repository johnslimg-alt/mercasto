<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function analytics(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $period = max(1, min(365, (int) $request->get('period', 30)));
        $since  = now()->subDays($period);

        $totalUsers  = DB::table('users')->count();
        $totalAds    = DB::table('ads')->count();
        $activeAds   = DB::table('ads')->where('status', 'active')->count();
        $featuredAds = DB::table('ads')
            ->where('promoted', 'destacado')
            ->count();

        $newUsers    = DB::table('users')->where('created_at', '>=', $since)->count();
        $newAds      = DB::table('ads')->where('created_at', '>=', $since)->count();
        $newMessages = DB::table('messages')->where('created_at', '>=', $since)->count();
        $totalViews  = (int) DB::table('ads')->sum('views');

        $revenuePeriod = (float) DB::table('payments')
            ->where('created_at', '>=', $since)
            ->where('status', 'paid')
            ->sum('amount');

        $revenueTotal = (float) DB::table('payments')
            ->where('status', 'paid')
            ->sum('amount');

        $topCategories = DB::table('ads')
            ->join('categories', 'ads.category', '=', 'categories.slug')
            ->where('ads.status', 'active')
            ->whereNotNull('ads.category')
            ->select(
                'categories.slug',
                DB::raw('count(*) as count')
            )
            ->groupBy('categories.slug')
            ->orderByDesc('count')
            ->limit(8)
            ->get();

        $categoryNames = DB::table('categories')
            ->whereIn('slug', $topCategories->pluck('slug')->filter()->values())
            ->pluck('name', 'slug');

        $topCategories = $topCategories->map(function ($category) use ($categoryNames) {
            $rawName = $categoryNames[$category->slug] ?? null;
            $decodedName = is_string($rawName) ? json_decode($rawName, true) : $rawName;

            if (is_array($decodedName)) {
                $category->name = $decodedName['es'] ?? $decodedName['en'] ?? reset($decodedName) ?: $category->slug;
            } else {
                $category->name = $rawName ?: $category->slug;
            }

            return $category;
        });

        $topStates = DB::table('ads')
            ->where('status', 'active')
            ->whereNotNull('state')
            ->where('state', '!=', '')
            ->select('state', DB::raw('count(*) as count'))
            ->groupBy('state')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        $dailyAds = DB::table('ads')
            ->where('created_at', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $dailyUsers = DB::table('users')
            ->where('created_at', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $phoneVerified = DB::table('users')->where('phone_verified', true)->count();
        $emailVerified = DB::table('users')->whereNotNull('email_verified_at')->count();

        $adsByStatus = DB::table('ads')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $recentUsers = DB::table('users')
            ->orderByDesc('created_at')
            ->limit(5)
            ->select('id', 'name', 'email', 'created_at', 'role')
            ->get();

        return response()->json([
            'total_users'    => $totalUsers,
            'total_ads'      => $totalAds,
            'active_ads'     => $activeAds,
            'featured_ads'   => $featuredAds,
            'new_users'      => $newUsers,
            'new_ads'        => $newAds,
            'new_messages'   => $newMessages,
            'total_views'    => $totalViews,
            'revenue_period' => $revenuePeriod,
            'revenue_total'  => $revenueTotal,
            'daily_ads'      => $dailyAds,
            'daily_users'    => $dailyUsers,
            'top_categories' => $topCategories,
            'top_states'     => $topStates,
            'phone_verified' => $phoneVerified,
            'email_verified' => $emailVerified,
            'ads_by_status'  => $adsByStatus,
            'recent_users'   => $recentUsers,
            'period'         => $period,
            'since'          => $since->toDateString(),
        ]);
    }
}

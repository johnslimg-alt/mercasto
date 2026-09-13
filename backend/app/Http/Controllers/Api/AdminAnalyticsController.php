<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EconomicsMetrics;
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

        // Views are reported from the measurement log (`ad_views`) — the same
        // table behind `genuine_listing_views` in the SEO measurement service —
        // so this KPI has the same provenance as total_impressions/total_clicks.
        //
        // The legacy `ads.views` column is NOT a measurement: bulk demo seeders
        // filled it with rand() and it is off by four orders of magnitude. It is
        // still exposed for transparency under an explicitly unverified key,
        // never as the KPI. See docs/analytics/views-provenance.md.
        $totalViews  = (int) DB::table('ad_views')->count();
        $viewsPeriod = (int) DB::table('ad_views')->where('created_at', '>=', $since)->count();
        $legacyViewsCounter = (int) DB::table('ads')->sum('views');

        $totalImpressions = (int) DB::table('ad_impressions')->count();
        $totalClicks = (int) DB::table('ad_clicks')->count();
        $clicksByChannel = DB::table('ad_clicks')
            ->select('channel', DB::raw('COUNT(*) as count'))
            ->groupBy('channel')
            ->pluck('count', 'channel');

        $revenuePeriod = (float) DB::table('payments')
            ->where('created_at', '>=', $since)
            ->where('status', 'paid')
            ->sum('amount');

        $revenueTotal = (float) DB::table('payments')
            ->where('status', 'paid')
            ->sum('amount');

        $paidStatuses = ['paid', 'succeeded', 'approved'];
        $promotionCodes = ['boost_1_day', 'boost_3_days', 'highlight_7_days', 'featured_7_days', 'featured_30_days', 'top_category_7_days'];
        $promotionRevenuePeriod = (float) DB::table('payments')
            ->where('created_at', '>=', $since)
            ->whereIn('status', $paidStatuses)
            ->whereIn('product_code', $promotionCodes)
            ->sum('amount');
        $promotionRevenueTotal = (float) DB::table('payments')
            ->whereIn('status', $paidStatuses)
            ->whereIn('product_code', $promotionCodes)
            ->sum('amount');
        $activePromotedAds = DB::table('ads')
            ->whereNotNull('promoted')
            ->where(function ($query) {
                $query->whereNull('boost_expires_at')
                    ->orWhere('boost_expires_at', '>', now());
            })
            ->count();

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

        // Seeded catalog filler ads are placeholders, not seller supply. Every
        // headline number above counts them, so conversion metrics silently
        // divide by synthetic inventory unless the split is visible. These
        // fields are additive: existing keys keep their current meaning.
        $realAdsConstraint = function ($query) {
            $query->where('ads.is_catalog_filler', false)
                ->orWhereNull('ads.is_catalog_filler');
        };
        $realAdsColumnConstraint = function ($query) {
            $query->where('is_catalog_filler', false)->orWhereNull('is_catalog_filler');
        };
        $activePromotionConstraint = function ($query) {
            $query->whereNotNull('promoted')
                ->where(function ($inner) {
                    $inner->whereNull('boost_expires_at')
                        ->orWhere('boost_expires_at', '>', now());
                });
        };

        $realActiveAds = DB::table('ads')
            ->where('status', 'active')
            ->where($realAdsColumnConstraint)
            ->count();
        $catalogActiveAds = DB::table('ads')
            ->where('status', 'active')
            ->where('is_catalog_filler', true)
            ->count();

        $realPromotedAds = DB::table('ads')
            ->where($activePromotionConstraint)
            ->where($realAdsColumnConstraint)
            ->count();
        $catalogPromotedAds = DB::table('ads')
            ->where($activePromotionConstraint)
            ->where('is_catalog_filler', true)
            ->count();

        $realImpressions = DB::table('ad_impressions')
            ->join('ads', 'ads.id', '=', 'ad_impressions.ad_id')
            ->where($realAdsConstraint)
            ->count();
        $catalogImpressions = DB::table('ad_impressions')
            ->join('ads', 'ads.id', '=', 'ad_impressions.ad_id')
            ->where('ads.is_catalog_filler', true)
            ->count();

        $realClicks = DB::table('ad_clicks')
            ->join('ads', 'ads.id', '=', 'ad_clicks.ad_id')
            ->where($realAdsConstraint)
            ->count();
        $catalogClicks = DB::table('ad_clicks')
            ->join('ads', 'ads.id', '=', 'ad_clicks.ad_id')
            ->where('ads.is_catalog_filler', true)
            ->count();

        $realAdsByStatus = DB::table('ads')
            ->where($realAdsColumnConstraint)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $lastRealAdCreatedAt = DB::table('ads')
            ->where($realAdsColumnConstraint)
            ->max('created_at');

        return response()->json([
            'total_users'    => $totalUsers,
            'total_ads'      => $totalAds,
            'active_ads'     => $activeAds,
            'featured_ads'   => $featuredAds,
            'new_users'      => $newUsers,
            'new_ads'        => $newAds,
            'new_messages'   => $newMessages,
            'total_views'    => $totalViews,
            'total_views_period' => $viewsPeriod,
            'total_views_source' => 'ad_views',
            'total_views_verified' => true,
            // Deliberately published, deliberately labelled: this is the old
            // sum(ads.views) headline, which is synthetic demo data.
            'total_views_legacy_counter' => $legacyViewsCounter,
            'total_views_legacy_counter_verified' => false,
            'total_views_legacy_counter_note' => 'Contador heredado de ads.views, no verificado: fue poblado con valores aleatorios por seeders de demostración. No usar como KPI.',
            'total_impressions' => $totalImpressions,
            'total_clicks'    => $totalClicks,
            'ctr'             => $totalImpressions > 0 ? round(($totalClicks / $totalImpressions) * 100, 2) : 0,
            'clicks_by_channel' => $clicksByChannel,
            'revenue_period' => $revenuePeriod,
            'revenue_total'  => $revenueTotal,
            'promotion_revenue_period' => $promotionRevenuePeriod,
            'promotion_revenue_total' => $promotionRevenueTotal,
            'active_promoted_ads' => $activePromotedAds,
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
            'inventory_integrity' => [
                'note' => 'active_ads, active_promoted_ads, impressions and clicks include seeded catalog placeholders; use the real_* values for seller conversion metrics.',
                'active_ads_real' => $realActiveAds,
                'active_ads_catalog' => $catalogActiveAds,
                'promoted_ads_real' => $realPromotedAds,
                'promoted_ads_catalog' => $catalogPromotedAds,
                'impressions_real' => $realImpressions,
                'impressions_catalog' => $catalogImpressions,
                'clicks_real' => $realClicks,
                'clicks_catalog' => $catalogClicks,
                'ctr_real' => $realImpressions > 0 ? round(($realClicks / $realImpressions) * 100, 2) : 0,
                'real_ads_by_status' => $realAdsByStatus,
                'last_real_ad_created_at' => $lastRealAdCreatedAt,
            ],
            'economics' => app(EconomicsMetrics::class)->forPeriod($since),
        ]);
    }
}

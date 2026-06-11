<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $days = $request->input('days', 30);
        $startDate = Carbon::now()->subDays($days);

        // Waitlist stats
        $waitlistTotal = DB::table('waitlist_emails')->count();
        $waitlistNew = DB::table('waitlist_emails')
            ->where('created_at', '>=', $startDate)
            ->count();
        $waitlistInvited = DB::table('waitlist_emails')
            ->where('invited', true)
            ->count();
        $waitlistConversion = $waitlistTotal > 0 
            ? round(($waitlistInvited / $waitlistTotal) * 100, 1) 
            : 0;

        // User stats
        $usersTotal = DB::table('users')->count();
        $usersNew = DB::table('users')
            ->where('created_at', '>=', $startDate)
            ->count();
        $usersVerified = DB::table('users')
            ->whereNotNull('email_verified_at')
            ->count();
        $usersActive = DB::table('users')
            ->where('updated_at', '>=', Carbon::now()->subDays(7))
            ->count();

        // Ads stats
        $adsTotal = DB::table('ads')->where('status', 'active')->count();
        $adsNew = DB::table('ads')
            ->where('created_at', '>=', $startDate)
            ->count();

        // Daily growth (last 14 days)
        $dailyWaitlist = DB::table('waitlist_emails')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', Carbon::now()->subDays(14))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $dailyUsers = DB::table('users')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', Carbon::now()->subDays(14))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Referral stats
        $referrals = DB::table('waitlist_emails')
            ->whereNotNull('invited_by')
            ->count();

        // Queue stats
        $failedJobs = DB::table('failed_jobs')->count();

        return response()->json([
            'success' => true,
            'period' => [
                'days' => $days,
                'start' => $startDate->toDateString(),
                'end' => Carbon::now()->toDateString(),
            ],
            'waitlist' => [
                'total' => $waitlistTotal,
                'new' => $waitlistNew,
                'invited' => $waitlistInvited,
                'conversion_rate' => $waitlistConversion,
                'referrals' => $referrals,
            ],
            'users' => [
                'total' => $usersTotal,
                'new' => $usersNew,
                'verified' => $usersVerified,
                'active_last_7d' => $usersActive,
                'verification_rate' => $usersTotal > 0 
                    ? round(($usersVerified / $usersTotal) * 100, 1) 
                    : 0,
            ],
            'ads' => [
                'total' => $adsTotal,
                'new' => $adsNew,
            ],
            'growth' => [
                'waitlist_daily' => $dailyWaitlist,
                'users_daily' => $dailyUsers,
            ],
            'system' => [
                'failed_jobs' => $failedJobs,
            ],
        ]);
    }

    public function realtime(Request $request)
    {
        // Last 24 hours metrics
        $last24h = Carbon::now()->subHours(24);

        return response()->json([
            'success' => true,
            'timestamp' => Carbon::now()->toIso8601String(),
            'metrics' => [
                'waitlist_last_24h' => DB::table('waitlist_emails')
                    ->where('created_at', '>=', $last24h)
                    ->count(),
                'users_last_24h' => DB::table('users')
                    ->where('created_at', '>=', $last24h)
                    ->count(),
                'ads_last_24h' => DB::table('ads')
                    ->where('created_at', '>=', $last24h)
                    ->count(),
                'active_users_now' => DB::table('users')
                    ->where('updated_at', '>=', Carbon::now()->subMinutes(30))
                    ->count(),
            ],
            'queue' => [
                'failed_jobs' => DB::table('failed_jobs')->count(),
            ],
        ]);
    }
}

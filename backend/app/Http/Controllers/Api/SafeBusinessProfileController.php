<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Support\SqlLikePattern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SafeBusinessProfileController extends BusinessProfileController
{
    public function directory(Request $request)
    {
        $query = User::where(function ($q) {
            $q->where('business_profile_enabled', true)
                ->orWhere('role', 'business');
        });

        if ($request->filled('state')) {
            $query->whereRaw(
                SqlLikePattern::clause('business_address LIKE ?'),
                [SqlLikePattern::contains((string) $request->state)],
            );
        }
        if ($request->filled('city')) {
            $query->whereRaw(
                SqlLikePattern::clause('business_address LIKE ?'),
                [SqlLikePattern::contains((string) $request->city)],
            );
        }

        if ($request->filled('search')) {
            $search = SqlLikePattern::contains((string) $request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw(SqlLikePattern::clause('business_name LIKE ?'), [$search])
                    ->orWhereRaw(SqlLikePattern::clause('business_description LIKE ?'), [$search]);
            });
        }

        if ($request->filled('category')) {
            $query->whereRaw(
                SqlLikePattern::clause('business_description LIKE ?'),
                [SqlLikePattern::contains((string) $request->category)],
            );
        }

        $stores = $query->select([
            'id', 'name', 'avatar_url', 'role', 'is_verified', 'created_at',
            'business_name', 'business_logo_url', 'business_banner_url',
            'business_website', 'business_address',
            'business_description', 'business_rfc_verified_at',
        ])->latest()->paginate(24);

        $stores->getCollection()->transform(function ($store) {
            $reviewStats = DB::table('reviews')
                ->where('seller_id', $store->id)
                ->selectRaw('COUNT(*) as count, AVG(rating) as avg')
                ->first();

            $store->rating_count = (int) ($reviewStats->count ?? 0);
            $store->rating_avg = round((float) ($reviewStats->avg ?? 0), 1);
            $store->active_ads_count = DB::table('ads')
                ->where('user_id', $store->id)
                ->where('status', 'active')
                ->count();

            return $store;
        });

        return response()->json($stores);
    }
}

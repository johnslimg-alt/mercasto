<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AccountDeletionController extends Controller
{
    public function delete(Request $request)
    {
        $user = $request->user();

        // Last-admin safety: self-delete must never remove the final platform admin.
        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'No puedes eliminar tu cuenta porque eres el único administrador del sistema.'], 403);
        }

        $ads = Ad::where('user_id', $user->id)->cursor();
        $filesToDelete = [];

        foreach ($ads as $ad) {
            if ($ad->image_url) {
                $images = json_decode($ad->image_url, true);
                if (is_array($images)) {
                    $filesToDelete = array_merge($filesToDelete, $images);
                } elseif (is_string($images)) {
                    $filesToDelete[] = $images;
                }
            }

            if ($ad->video_url) {
                $filesToDelete[] = $ad->video_url;
            }
        }

        if (count($filesToDelete) > 0) {
            Storage::disk('public')->delete($filesToDelete);
        }

        if ($user->avatar_url && !str_starts_with($user->avatar_url, 'http')) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        $adIds = Ad::where('user_id', $user->id)->pluck('id');

        DB::table('reviews')->where('reviewer_id', $user->id)->orWhere('seller_id', $user->id)->delete();
        DB::table('favorites')->where('user_id', $user->id)->delete();
        DB::table('user_notifications')->where('user_id', $user->id)->delete();
        DB::table('ad_clicks')->where('user_id', $user->id)->delete();
        DB::table('ad_views')->where('user_id', $user->id)->delete();
        DB::table('reports')->where('user_id', $user->id)->delete();
        DB::table('user_reports')->where('reporter_id', $user->id)->orWhere('reported_user_id', $user->id)->delete();
        DB::table('push_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('category_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('coupon_user')->where('user_id', $user->id)->delete();

        DB::table('favorites')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_views')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_clicks')->whereIn('ad_id', $adIds)->delete();
        DB::table('reports')->whereIn('ad_id', $adIds)->delete();

        // Financial/audit retention: never physically delete payments during self-delete.
        // Match the admin-delete behavior by unlinking user/ad references only.
        DB::table('payments')->where('user_id', $user->id)->update(['user_id' => null]);
        DB::table('payments')->whereIn('ad_id', $adIds)->update(['ad_id' => null]);

        Ad::where('user_id', $user->id)->delete();

        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Cuenta eliminada exitosamente.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Models\User;
use App\Support\ConsentProofRetention;
use App\Support\DataSubjectAudit;
use App\Support\SensitiveActionReauth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AccountDeletionController extends Controller
{
    public function delete(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'password' => 'nullable|string|max:255',
        ]);

        if (! SensitiveActionReauth::passes($request, $user, $validated['password'] ?? null)) {
            if (SensitiveActionReauth::hasPassword($user)) {
                return response()->json([
                    'message' => 'Confirma tu contraseña actual antes de eliminar tu cuenta.',
                    'code' => 'password_confirmation_required',
                ], 422);
            }

            return response()->json([
                'message' => 'Vuelve a iniciar sesión antes de eliminar tu cuenta.',
                'code' => 'reauthentication_required',
            ], 403);
        }

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

        if ($user->kyc_document_url) {
            Storage::disk('local')->delete($user->kyc_document_url);
            if (config('filesystems.default') !== 'local') {
                Storage::disk(config('filesystems.default'))->delete($user->kyc_document_url);
            }
        }
        if ($user->business_csf_url && ! str_starts_with($user->business_csf_url, 'http')) {
            Storage::disk('local')->delete($user->business_csf_url);
        }

        $adIds = Ad::where('user_id', $user->id)->pluck('id');

        DB::table('reviews')->where('reviewer_id', $user->id)->orWhere('seller_id', $user->id)->delete();
        DB::table('favorites')->where('user_id', $user->id)->delete();
        DB::table('user_notifications')->where('user_id', $user->id)->delete();
        DB::table('ad_clicks')->where('user_id', $user->id)->delete();
        DB::table('ad_views')->where('user_id', $user->id)->delete();
        DB::table('ad_impressions')->where('user_id', $user->id)->delete();
        DB::table('reports')->where('user_id', $user->id)->delete();
        DB::table('user_reports')->where('reporter_id', $user->id)->orWhere('reported_user_id', $user->id)->delete();
        DB::table('push_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('category_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('coupon_user')->where('user_id', $user->id)->delete();
        DB::table('messages')->where('sender_id', $user->id)->orWhere('receiver_id', $user->id)->delete();
        DB::table('conversations')->where('buyer_id', $user->id)->orWhere('seller_id', $user->id)->delete();

        DB::table('favorites')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_views')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_clicks')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_impressions')->whereIn('ad_id', $adIds)->delete();
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

        // LFPDPPP (EG-04): the proof that consent was obtained must survive the erasure.
        // Pseudonymise the consent rows while the user id is still known, in the same
        // transaction as the delete, so an account can never end up half-erased with its
        // consent proof already unlinked.
        $deletedUserId = $user->id;

        $retainedConsentProofs = DB::transaction(function () use ($user): int {
            $retained = ConsentProofRetention::pseudonymiseForDeletedUser(
                $user->id,
                ConsentProofRetention::BASIS_SELF_DELETION,
            );

            $user->tokens()->delete();
            $user->delete();

            return $retained;
        });

        DataSubjectAudit::record('account_erasure_completed', $request, [
            'subject_id' => $deletedUserId,
            'retained_consent_proofs' => $retainedConsentProofs,
            'retention_basis' => ConsentProofRetention::BASIS_SELF_DELETION,
        ]);

        return response()->json(['message' => 'Cuenta eliminada exitosamente.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReferralController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $code = $this->ensureReferralCode($user);
        $referralUrl = 'https://mercasto.com/r/' . $code;

        // Load referrals with referred user info
        $referrals = DB::table('referrals')
            ->join('users', 'users.id', '=', 'referrals.referred_id')
            ->where('referrals.referrer_id', $user->id)
            ->select('users.name', 'referrals.created_at', 'referrals.reward_given_at')
            ->orderByDesc('referrals.created_at')
            ->get();

        $history = $referrals->map(function ($r) {
            $name = $r->name ?? '';
            // Partial name for privacy: "Juan G."
            $parts = explode(' ', trim($name));
            $display = $parts[0] ?? '';
            if (count($parts) > 1) {
                $display .= ' ' . strtoupper(substr($parts[1], 0, 1)) . '.';
            }
            return [
                'name'           => $display,
                'joined_at'      => substr($r->created_at, 0, 10),
                'reward_given_at'=> $r->reward_given_at,
                'status'         => $r->reward_given_at ? 'completed' : 'pending',
            ];
        });

        $pendingRewards = $referrals->whereNull('reward_given_at')->count();
        $earnedCredits  = $referrals->whereNotNull('reward_given_at')->count() * 5;

        return response()->json([
            'code'            => $code,
            'referral_url'    => $referralUrl,
            'total_referrals' => $referrals->count(),
            'pending_rewards' => $pendingRewards,
            'earned_credits'  => $earnedCredits,
            'credits'         => $user->referral_credits,
            'referrals'       => $history->values(),
        ]);
    }

    public function apply(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = Auth::user();
        $code = strtoupper(trim((string) $request->code));

        $result = DB::transaction(function () use ($user, $code) {
            $currentUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($currentUser->referred_by !== null) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'Ya tienes un referido aplicado.']];
            }

            $referrer = User::where('referral_code', $code)->lockForUpdate()->first();

            if (!$referrer) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Código de referido inválido.']];
            }

            if ($referrer->id === $currentUser->id) {
                return ['status' => 400, 'body' => ['success' => false, 'message' => 'No puedes usar tu propio código.']];
            }

            $currentUser->referred_by = $referrer->id;
            $currentUser->save();

            // Create referrals log entry
            DB::table('referrals')->insertOrIgnore([
                'referrer_id' => $referrer->id,
                'referred_id' => $currentUser->id,
                'created_at'  => now(),
            ]);

            return ['status' => 200, 'body' => ['success' => true, 'message' => '¡Código aplicado! Publica tu primer anuncio para que ambos ganen créditos.']];
        });

        return response()->json($result['body'], $result['status']);
    }

    private function ensureReferralCode(User $user): string
    {
        if ($user->referral_code) {
            return $user->referral_code;
        }

        do {
            $code = strtoupper(Str::random(8));
        } while (User::where('referral_code', $code)->exists());

        $user->forceFill(['referral_code' => $code])->save();

        return $code;
    }
}

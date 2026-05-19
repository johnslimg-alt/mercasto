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

        $referred = User::where('referred_by', $user->id)->get();
        $history = $referred->map(function ($u) {
            return [
                'user_name' => $u->name,
                'joined_at' => $u->created_at->toDateString(),
                'credit_earned' => 1,
            ];
        });

        return response()->json([
            'code' => $code,
            'referral_url' => $referralUrl,
            'total_referred' => $referred->count(),
            'credits' => $user->referral_credits,
            'history' => $history,
        ]);
    }

    public function apply(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = Auth::user();
        $code = strtoupper(trim((string) $request->code));

        if ($user->referred_by !== null) {
            return response()->json(['success' => false, 'message' => 'Ya tienes un referido aplicado.'], 400);
        }

        $referrer = User::where('referral_code', $code)->first();

        if (!$referrer) {
            return response()->json(['success' => false, 'message' => 'Código de referido inválido.'], 404);
        }

        if ($referrer->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'No puedes usar tu propio código.'], 400);
        }

        $updated = User::whereKey($user->id)
            ->whereNull('referred_by')
            ->update(['referred_by' => $referrer->id, 'updated_at' => now()]);

        if ($updated !== 1) {
            return response()->json(['success' => false, 'message' => 'Ya tienes un referido aplicado.'], 400);
        }

        DB::table('users')->where('id', $referrer->id)->increment('referral_credits');

        return response()->json(['success' => true, 'message' => '¡Código aplicado! Tu amigo ha ganado 1 crédito destacado.']);
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

<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessReferralRewardJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $referredUserId) {}

    public function handle(): void
    {
        DB::transaction(function () {
            $referral = DB::table('referrals')
                ->where('referred_id', $this->referredUserId)
                ->whereNull('reward_given_at')
                ->lockForUpdate()
                ->first();

            if (!$referral) {
                return; // already rewarded or no referral record
            }

            $referrer = User::find($referral->referrer_id);
            $referred = User::find($referral->referred_id);

            if (!$referrer || !$referred) {
                return;
            }

            // +5 credits to referrer, +2 credits to the new user
            $referrer->increment('referral_credits', 5);
            $referred->increment('referral_credits', 2);

            DB::table('referrals')
                ->where('id', $referral->id)
                ->update(['reward_given_at' => now()]);

            Log::info("Referral reward given: referrer={$referrer->id} (+5), referred={$referred->id} (+2)");
        });
    }
}

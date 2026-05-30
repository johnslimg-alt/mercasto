<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AdExpiryService
{
    /**
     * Mark active ads as expired when their expires_at has passed.
     */
    public function expireOldAds(): int
    {
        $expiredAds = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        if ($expiredAds->isEmpty()) {
            return 0;
        }

        $count = 0;
        foreach ($expiredAds as $ad) {
            DB::table('ads')->where('id', $ad->id)->update(['status' => 'expired']);

            DB::table('user_notifications')->insert([
                'user_id'    => $ad->user_id,
                'title'      => 'Tu anuncio expiró',
                'message'    => "Tu anuncio \"{$ad->title}\" expiró. ¡Renuévalo para seguir recibiendo compradores!",
                'is_read'    => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($ad->user && $ad->user->email) {
                try {
                    Mail::raw(
                        "Hola {$ad->user->name},\n\nTu anuncio \"{$ad->title}\" en Mercasto ha expirado.\n\nRenuévalo desde tu perfil para volver a recibir compradores.\n\n¡Gracias por vender en Mercasto!\nhttps://mercasto.com",
                        function ($message) use ($ad) {
                            $message->to($ad->user->email)
                                    ->subject("Tu anuncio \"{$ad->title}\" expiró — renuévalo ahora");
                        }
                    );
                } catch (\Exception $e) {
                    Log::warning("AdExpiryService: email failed for ad #{$ad->id}: " . $e->getMessage());
                }
            }

            $count++;
        }

        $this->bustCaches();
        return $count;
    }

    /**
     * Send expiry reminder notifications for ads expiring within 3 days.
     * Skips ads where reminder_sent_at is already set.
     */
    public function sendExpiryReminders(): int
    {
        $ads = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->whereNull('reminder_sent_at')
            ->whereBetween('expires_at', [now(), now()->addDays(3)])
            ->get();

        if ($ads->isEmpty()) {
            return 0;
        }

        $count = 0;
        foreach ($ads as $ad) {
            $hoursLeft = now()->diffInHours($ad->expires_at);
            $daysLeft  = max(1, (int) ceil($hoursLeft / 24));
            $dayWord   = $daysLeft === 1 ? 'día' : 'días';

            DB::table('user_notifications')->insert([
                'user_id'    => $ad->user_id,
                'title'      => 'Tu anuncio está por expirar',
                'message'    => "Tu anuncio '{$ad->title}' expira en {$daysLeft} {$dayWord}. ¡Renuévalo para seguir recibiendo compradores!",
                'is_read'    => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($ad->user && $ad->user->email) {
                try {
                    Mail::raw(
                        "Hola {$ad->user->name},\n\nTu anuncio \"{$ad->title}\" expira en {$daysLeft} {$dayWord}.\n\nRenuévalo ahora desde tu perfil para seguir recibiendo compradores.\n\nhttps://mercasto.com",
                        function ($message) use ($ad, $daysLeft, $dayWord) {
                            $message->to($ad->user->email)
                                    ->subject("Tu anuncio \"{$ad->title}\" expira en {$daysLeft} {$dayWord}");
                        }
                    );
                } catch (\Exception $e) {
                    Log::warning("AdExpiryService: reminder email failed for ad #{$ad->id}: " . $e->getMessage());
                }
            }

            DB::table('ads')->where('id', $ad->id)->update(['reminder_sent_at' => now()]);
            $count++;
        }

        return $count;
    }

    private function bustCaches(): void
    {
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use App\Models\Ad;

class ExpireAds extends Command
{
    protected $signature = 'ads:expire';
    protected $description = 'Mark active ads as expired when their expires_at date has passed and notify owners.';

    public function handle(): int
    {
        $expiredAds = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        if ($expiredAds->isEmpty()) {
            $this->info('No ads to expire.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($expiredAds as $ad) {
            DB::table('ads')->where('id', $ad->id)->update(['status' => 'expired']);

            // In-app notification
            $notificationData = [
                'user_id' => $ad->user_id,
                'title'   => 'Tu anuncio expiró',
                'message' => 'Tu anuncio "' . $ad->title . '" expiró. ¡Repúblicalo gratis y sigue vendiendo!',
                'is_read'     => false,
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
            DB::table('user_notifications')->insert($notificationData);

            // Email notification (fire-and-forget, don't crash the command on mail failure)
            if ($ad->user && $ad->user->email) {
                try {
                    Mail::raw(
                        "Hola {$ad->user->name},\n\nTu anuncio \"{$ad->title}\" en Mercasto ha expirado.\n\nRepúblicalo gratis (hasta 3 veces) entrando a tu perfil y haciendo clic en \"Republicar\".\n\n¡Gracias por vender en Mercasto!\nhttps://mercasto.com",
                        function ($message) use ($ad) {
                            $message->to($ad->user->email)
                                    ->subject("Tu anuncio \"{$ad->title}\" expiró — repúblicalo gratis");
                        }
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("ExpireAds: could not send email for ad #{$ad->id}: " . $e->getMessage());
                }
            }

            $count++;
        }

        // Bust caches
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        $this->info("Expired {$count} ads.");
        return self::SUCCESS;
    }
}

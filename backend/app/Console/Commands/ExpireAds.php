<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ExpireAds extends Command
{
    protected $signature = 'ads:expire';
    protected $description = 'Mark active ads as expired when their expires_at date has passed and notify owners.';

    public function handle(): int
    {
        $expiredAds = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->get();

        if ($expiredAds->isEmpty()) {
            $this->info('No ads to expire.');
            return self::SUCCESS;
        }

        $amount = (float) config('marketplace.ad_renewal_price_mxn', 49);
        $days = (int) config('marketplace.ad_renewal_days', 7);
        $count = 0;

        foreach ($expiredAds as $ad) {
            DB::table('ads')->where('id', $ad->id)->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

            $notificationData = [
                'user_id' => $ad->user_id,
                'title' => 'Tu anuncio expiró',
                'message' => "Tu anuncio \"{$ad->title}\" expiró. Renuévalo por {$days} días por $" . number_format($amount, 0) . ' MXN o elimínalo sin costo.',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            DB::table('user_notifications')->insert($notificationData);

            if ($ad->user && $ad->user->email) {
                try {
                    Mail::raw(
                        "Hola {$ad->user->name},\n\nTu anuncio \"{$ad->title}\" en Mercasto ha expirado.\n\nPuedes renovarlo por {$days} días pagando $" . number_format($amount, 0) . " MXN desde tu perfil, o eliminarlo sin costo.\n\nhttps://mercasto.com/profile",
                        function ($message) use ($ad) {
                            $message->to($ad->user->email)
                                ->subject("Tu anuncio \"{$ad->title}\" expiró");
                        }
                    );
                } catch (\Throwable $error) {
                    \Illuminate\Support\Facades\Log::warning(
                        "ExpireAds: could not send email for ad #{$ad->id}: " . $error->getMessage()
                    );
                }
            }

            $count++;
        }

        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }

        $this->info("Expired {$count} ads.");
        return self::SUCCESS;
    }
}

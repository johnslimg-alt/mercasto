<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ExpireAds extends Command
{
    protected $signature = 'ads:expire';
    protected $description = 'Warn sellers before expiry, expire due ads, and send lifecycle conversion notifications.';

    public function handle(): int
    {
        $amount = (float) config('marketplace.ad_renewal_price_mxn', 49);
        $renewalDays = (int) config('marketplace.ad_renewal_days', 7);
        $warningCount = $this->sendExpiryWarnings($amount, $renewalDays);

        $expiredAds = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->get();

        $expiredCount = 0;
        foreach ($expiredAds as $ad) {
            DB::table('ads')->where('id', $ad->id)->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

            $this->notifySeller(
                $ad,
                'expired',
                'Tu anuncio dejó de mostrarse',
                "Tu anuncio \"{$ad->title}\" ya no está visible. Renuévalo ahora por {$renewalDays} días por $" . number_format($amount, 0) . ' MXN para recuperar visitas y contactos.',
                "Tu anuncio \"{$ad->title}\" dejó de mostrarse — recupéralo hoy"
            );

            $expiredCount++;
        }

        if ($expiredCount > 0) {
            Cache::forget('sitemap_xml');
            Cache::forget('google_merchant_xml');
            Cache::forget('ads_featured_block');
            for ($page = 1; $page <= 10; $page++) {
                Cache::forget("ads_index_page_{$page}");
            }
        }

        $this->info("Warnings sent: {$warningCount}. Expired ads: {$expiredCount}.");
        return self::SUCCESS;
    }

    private function sendExpiryWarnings(float $amount, int $renewalDays): int
    {
        $ads = Ad::with('user:id,name,email')
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(3))
            ->get();

        $sent = 0;
        foreach ($ads as $ad) {
            $hours = max(1, now()->diffInHours($ad->expires_at, false));
            $stage = $hours <= 24 ? '24h' : '72h';
            $cacheKey = "seller_lifecycle:ad:{$ad->id}:{$stage}:" . $ad->expires_at->timestamp;

            if (! Cache::add($cacheKey, true, now()->addDays(14))) {
                continue;
            }

            if ($stage === '24h') {
                $title = 'Últimas horas para mantener tu anuncio visible';
                $message = "Tu anuncio \"{$ad->title}\" vence en menos de 24 horas. Renuévalo por $" . number_format($amount, 0) . " MXN y conserva tus visitas, favoritos y oportunidades de contacto.";
                $subject = "Últimas horas: tu anuncio \"{$ad->title}\" está por vencer";
            } else {
                $title = 'Tu anuncio vence pronto';
                $message = "A tu anuncio \"{$ad->title}\" le quedan menos de 3 días. Renuévalo por {$renewalDays} días por $" . number_format($amount, 0) . ' MXN para seguir apareciendo ante compradores.';
                $subject = "Tu anuncio \"{$ad->title}\" vence en 3 días";
            }

            $this->notifySeller($ad, $stage, $title, $message, $subject);
            $sent++;
        }

        return $sent;
    }

    private function notifySeller(Ad $ad, string $stage, string $title, string $message, string $subject): void
    {
        DB::table('user_notifications')->insert([
            'user_id' => $ad->user_id,
            'title' => $title,
            'message' => $message . ' Abre tu perfil y pulsa “Renovar”.',
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! $ad->user?->email) {
            return;
        }

        try {
            Mail::raw(
                "Hola {$ad->user->name},\n\n{$message}\n\nRenueva desde tu perfil:\nhttps://mercasto.com/profile\n\nConsejo Mercasto: los anuncios activos y actualizados reciben más oportunidades de contacto.\n\nEquipo Mercasto",
                function ($mail) use ($ad, $subject) {
                    $mail->to($ad->user->email)->subject($subject);
                }
            );
        } catch (\Throwable $error) {
            Log::warning('Seller lifecycle email failed', [
                'ad_id' => $ad->id,
                'stage' => $stage,
                'error' => $error->getMessage(),
            ]);
        }
    }
}

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Database backups are handled by the dedicated docker-compose `db-backup`
// service, which uses the matching PostgreSQL/pgvector client image.
// Keep `db:backup` manual-only so the backend container does not need pg_dump.

// Финансовый контроль (The Eternal VIP Fix): Ежечасно снимаем продвижение с просроченных объявлений
Schedule::call(function () {
    $expiredPromotions = DB::table('ad_promotions')
        ->where('expires_at', '<', now())
        ->pluck('ad_id');

    if ($expiredPromotions->isNotEmpty()) {
        DB::table('ads')
            ->whereIn('id', $expiredPromotions)
            ->update([
                'promoted' => null,
                'boost_type' => null,
                'boost_expires_at' => null,
                'updated_at' => now(),
            ]);

        DB::table('ad_promotions')->whereIn('ad_id', $expiredPromotions)->delete();

        // Сбрасываем кэши, чтобы снять бейджи "Top seller" на фронтенде
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) { Cache::forget("ads_index_page_{$i}"); }
        \Illuminate\Support\Facades\Log::info("Revoked VIP status for " . $expiredPromotions->count() . " ads.");
    }
})->hourly();

// Process the oldest moderation submissions first. The command only dispatches jobs,
// so the scheduler stays responsive even when image analysis is slow.
Schedule::command('ads:moderate-pending --limit=100')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Expire ads that passed their expires_at date, notify owners
Schedule::command('ads:expire')->daily();
Schedule::command('ads:process-expiry')->dailyAt('08:00')->timezone('America/Mexico_City')->withoutOverlapping();

// Weekly digest email — every Monday at 08:00 Mexico City time
Schedule::command('digest:weekly')
    ->weeklyOn(1, '08:00')
    ->timezone('America/Mexico_City')
    ->withoutOverlapping()
    ->runInBackground();

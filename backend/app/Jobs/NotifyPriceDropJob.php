<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use App\Events\NewNotification;

class NotifyPriceDropJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly int $adId,
        public readonly float $oldPrice,
        public readonly float $newPrice,
    ) {}

    public function handle(): void
    {
        $ad = DB::table('ads')->where('id', $this->adId)->first();
        if (!$ad) return;

        // Find all users who favorited this ad
        $userIds = DB::table('favorites')
            ->where('ad_id', $this->adId)
            ->pluck('user_id');

        if ($userIds->isEmpty()) return;

        $savingsPercent = $this->oldPrice > 0
            ? round((($this->oldPrice - $this->newPrice) / $this->oldPrice) * 100, 1)
            : 0;

        $adUrl = '/?ad=' . $this->adId;
        $now   = now();

        foreach ($userIds as $userId) {
            $data = [
                'type'            => 'price_drop',
                'ad_id'           => $this->adId,
                'ad_title'        => $ad->title,
                'old_price'       => $this->oldPrice,
                'new_price'       => $this->newPrice,
                'savings_percent' => $savingsPercent,
                'ad_url'          => $adUrl,
            ];

            $oldFmt = number_format($this->oldPrice, 2);
            $newFmt = number_format($this->newPrice, 2);
            $title = 'Bajó de precio: ' . $ad->title;
            $message = "Antes \${$oldFmt}, Ahora \${$newFmt} (ahorra {$savingsPercent}%)";

            $notifId = DB::table('user_notifications')->insertGetId([
                'user_id'    => $userId,
                'title'      => $title,
                'message'    => $message,
                'is_read'    => false,
                'type'       => 'price_drop',
                'data'       => json_encode($data),
                'link'       => $adUrl,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Broadcast real-time event (optional — don't fail if it errors)
            try {
                broadcast(new NewNotification((int) $userId, [
                    'id'         => $notifId,
                    'user_id'    => $userId,
                    'title'      => $title,
                    'message'    => $message,
                    'is_read'    => false,
                    'type'       => 'price_drop',
                    'data'       => $data,
                    'link'       => $adUrl,
                    'created_at' => $now->toISOString(),
                    'updated_at' => $now->toISOString(),
                ]))->toOthers();
            } catch (\Throwable $e) {
                // ignore
            }
        }
    }
}

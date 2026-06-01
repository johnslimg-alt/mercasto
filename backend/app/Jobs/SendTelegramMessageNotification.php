<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendTelegramMessageNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public readonly int $recipientId,
        public readonly int $senderId,
        public readonly string $senderName,
        public readonly string $messagePreview,
        public readonly ?string $adTitle = null,
    ) {}

    public function handle(): void
    {
        $botToken = config('services.telegram.bot_token');
        if (! $botToken) {
            return;
        }

        $recipient = User::find($this->recipientId);
        if (! $recipient || ! $recipient->telegram_id) {
            return;
        }

        $prefs = is_string($recipient->notification_preferences)
            ? json_decode($recipient->notification_preferences, true)
            : ($recipient->notification_preferences ?? []);

        if (isset($prefs['telegram_alerts']) && $prefs['telegram_alerts'] === false) {
            return;
        }

        $preview = mb_substr(trim(preg_replace('/\s+/', ' ', $this->messagePreview)), 0, 100);
        $adLine = $this->adTitle ? "\nAnuncio: " . mb_substr($this->adTitle, 0, 80) : '';
        $text = "Nuevo mensaje en Mercasto{$adLine}\n\nDe: {$this->senderName}\n{$preview}\n\nVer mensajes: https://mercasto.com/mensajes";

        $response = Http::timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $recipient->telegram_id,
            'text' => $text,
        ]);

        if (! $response->successful()) {
            Log::warning('Telegram notification failed', [
                'recipient_id' => $this->recipientId,
                'telegram_id'  => $recipient->telegram_id,
                'response'     => $response->body(),
            ]);
        }
    }
}

<?php

namespace App\Jobs;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class SendWebPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [10, 60, 300];

    public function __construct(
        public int $userId,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    public function handle(): void
    {
        $preferences = User::find($this->userId)?->notification_preferences ?? [];
        if (($preferences['push_notifications'] ?? true) === false) {
            return;
        }

        $publicKey = trim((string) config('services.webpush.vapid_public_key'));
        $privateKey = trim((string) config('services.webpush.vapid_private_key'));
        if ($publicKey === '' || $privateKey === '') {
            return;
        }

        $subscriptions = PushSubscription::where('user_id', $this->userId)->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => 'mailto:hello@mercasto.com',
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
        $url = (string) ($this->data['url'] ?? '/');

        foreach ($subscriptions as $stored) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => $stored->endpoint,
                    'publicKey' => $stored->public_key,
                    'authToken' => $stored->auth_token,
                ]);
                $report = $webPush->sendOneNotification(
                    $subscription,
                    json_encode([
                        'title' => $this->title,
                        'body' => $this->body,
                        'url' => $url,
                    ], JSON_THROW_ON_ERROR),
                );

                if ($report->isSuccess()) {
                    continue;
                }
                $reason = (string) $report->getReason();
                if (str_contains($reason, '404') || str_contains($reason, '410')) {
                    $stored->delete();
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}

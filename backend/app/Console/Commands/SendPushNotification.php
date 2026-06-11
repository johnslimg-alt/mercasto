<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use Illuminate\Console\Command;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use Illuminate\Support\Facades\Log;

class SendPushNotification extends Command
{
    protected $signature = 'push:send 
                            {--title= : Notification title}
                            {--body= : Notification body}
                            {--url=/ : URL to open on click}
                            {--user= : Send to specific user ID}
                            {--all : Send to all subscribed users}
                            {--icon=/icon-192x192.png : Notification icon}';

    protected $description = 'Send push notifications to subscribed users';

    public function handle()
    {
        $title = $this->option('title') ?? 'Mercasto';
        $body = $this->option('body') ?? 'Tienes una nueva notificación';
        $url = $this->option('url');
        $userId = $this->option('user');
        $sendAll = $this->option('all');
        $icon = $this->option('icon');

        if (!$sendAll && !$userId) {
            $this->error('Please specify --all or --user=<id>');
            return 1;
        }

        // Get subscriptions
        $query = PushSubscription::query();
        if ($userId) {
            $query->where('user_id', $userId);
        }

        $subscriptions = $query->get();

        if ($subscriptions->isEmpty()) {
            $this->warn('No push subscriptions found');
            return 0;
        }

        $this->info("Found {$subscriptions->count()} subscription(s)");

        // Configure WebPush
        $auth = [
            'VAPID' => [
                'subject' => 'mailto:hello@mercasto.com',
                'publicKey' => env('VAPID_PUBLIC_KEY'),
                'privateKey' => env('VAPID_PRIVATE_KEY'),
            ],
        ];

        $webPush = new WebPush($auth);
        $sent = 0;
        $failed = 0;
        $removed = 0;

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => $icon,
            'badge' => $icon,
            'data' => ['url' => $url],
        ]);

        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->public_key,
                    'authToken' => $sub->auth_token,
                ]);

                $report = $webPush->sendOneNotification($subscription, $payload);

                if ($report->isSuccess()) {
                    $sent++;
                    $this->line("✓ Sent to user {$sub->user_id}");
                } else {
                    $failed++;
                    $reason = $report->getReason();
                    $this->warn("✗ Failed for user {$sub->user_id}: {$reason}");

                    // Remove invalid subscriptions (410 Gone, 404 Not Found)
                    if (strpos($reason, '410') !== false || strpos($reason, '404') !== false) {
                        $sub->delete();
                        $removed++;
                        $this->line("  → Removed invalid subscription");
                    }
                }
            } catch (\Exception $e) {
                $failed++;
                Log::error("Push send error for user {$sub->user_id}: " . $e->getMessage());
                $this->error("✗ Exception for user {$sub->user_id}: " . $e->getMessage());
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->line("  Sent: {$sent}");
        $this->line("  Failed: {$failed}");
        $this->line("  Removed: {$removed}");

        return 0;
    }
}

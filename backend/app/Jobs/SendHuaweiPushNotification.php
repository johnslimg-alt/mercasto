<?php

namespace App\Jobs;

use App\Services\HuaweiPushMessaging;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendHuaweiPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [10, 60, 300];

    public function __construct(
        public int $userId,
        public string $title,
        public string $body,
        public array $data = []
    ) {
    }

    public function handle(HuaweiPushMessaging $messaging): void
    {
        $messaging->sendToUser(
            $this->userId,
            $this->title,
            $this->body,
            $this->data
        );
    }
}

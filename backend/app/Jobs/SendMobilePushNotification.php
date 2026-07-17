<?php

namespace App\Jobs;

use App\Services\FirebaseCloudMessaging;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendMobilePushNotification implements ShouldQueue
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

    public function handle(FirebaseCloudMessaging $messaging): void
    {
        $messaging->sendToUser(
            $this->userId,
            $this->title,
            $this->body,
            $this->data
        );
    }
}

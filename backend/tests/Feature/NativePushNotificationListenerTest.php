<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Jobs\SendHuaweiPushNotification;
use App\Jobs\SendMobilePushNotification;
use App\Jobs\SendWebPushNotification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NativePushNotificationListenerTest extends TestCase
{
    public function test_in_app_notification_dispatches_all_push_providers(): void
    {
        Queue::fake();

        event(new NewNotification(42, [
            'title' => 'Precio actualizado',
            'message' => 'Un anuncio guardado cambió de precio.',
            'type' => 'price_drop',
            'data' => json_encode(['ad_id' => 123], JSON_THROW_ON_ERROR),
            'link' => '/?ad=123',
        ]));

        foreach ([SendMobilePushNotification::class, SendHuaweiPushNotification::class, SendWebPushNotification::class] as $jobClass) {
            Queue::assertPushed($jobClass, fn ($job) =>
                $job->userId === 42
                && $job->title === 'Precio actualizado'
                && ($job->data['type'] ?? null) === 'price_drop'
                && ($job->data['ad_id'] ?? null) === 123
                && ($job->data['listing_id'] ?? null) === 123
                && ($job->data['url'] ?? null) === '/?ad=123'
            );
        }
    }
}

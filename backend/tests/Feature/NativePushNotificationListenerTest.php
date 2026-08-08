<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Jobs\SendHuaweiPushNotification;
use App\Jobs\SendMobilePushNotification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NativePushNotificationListenerTest extends TestCase
{
    public function test_in_app_notification_dispatches_both_native_push_providers(): void
    {
        Queue::fake();

        event(new NewNotification(42, [
            'title' => 'Precio actualizado',
            'message' => 'Un anuncio guardado cambió de precio.',
            'type' => 'price_drop',
            'data' => json_encode(['ad_id' => 123], JSON_THROW_ON_ERROR),
        ]));

        foreach ([SendMobilePushNotification::class, SendHuaweiPushNotification::class] as $jobClass) {
            Queue::assertPushed($jobClass, fn ($job) =>
                $job->userId === 42
                && $job->title === 'Precio actualizado'
                && ($job->data['type'] ?? null) === 'price_drop'
                && ($job->data['ad_id'] ?? null) === 123
                && ($job->data['listing_id'] ?? null) === 123
            );
        }
    }
}

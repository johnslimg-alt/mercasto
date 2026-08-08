<?php

namespace App\Listeners;

use App\Events\NewNotification;
use App\Jobs\SendHuaweiPushNotification;
use App\Jobs\SendMobilePushNotification;

class DispatchNativePushFromNotification
{
    public function handle(NewNotification $event): void
    {
        $notification = $event->notification;
        $data = $this->normalizeData($notification['data'] ?? []);

        foreach (['listing_id', 'ad_id'] as $key) {
            if (isset($notification[$key]) && ! isset($data[$key])) {
                $data[$key] = $notification[$key];
            }
        }

        if (isset($data['ad_id']) && ! isset($data['listing_id'])) {
            $data['listing_id'] = $data['ad_id'];
        }
        $data['type'] = (string) ($notification['type'] ?? $data['type'] ?? 'notification');

        $title = (string) ($notification['title'] ?? 'Mercasto');
        $body = (string) ($notification['message'] ?? $notification['body'] ?? '');

        SendMobilePushNotification::dispatch(
            $event->userId(),
            $title,
            $body,
            $data,
        );
        SendHuaweiPushNotification::dispatch(
            $event->userId(),
            $title,
            $body,
            $data,
        );
    }

    private function normalizeData(mixed $raw): array
    {
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }

        if (! is_array($raw)) {
            return [];
        }

        return array_filter(
            $raw,
            static fn ($value): bool => is_scalar($value) || $value === null,
        );
    }
}

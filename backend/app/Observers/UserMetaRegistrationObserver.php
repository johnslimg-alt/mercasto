<?php

namespace App\Observers;

use App\Models\User;
use App\Services\MetaCapiService;
use App\Services\TikTokEventsApiService;
use Illuminate\Support\Facades\Log;

class UserMetaRegistrationObserver
{
    public function created(User $user): void
    {
        $request = request();

        // Only the standard email/password registration flow supplies this id.
        // Other user creation paths must not emit CompleteRegistration implicitly.
        if (! $request->is('api/register')) {
            return;
        }

        $eventId = trim((string) $request->input('meta_event_id', ''));

        if ($eventId === '') {
            return;
        }

        if (! preg_match('/^[A-Za-z0-9._:-]{1,120}$/', $eventId)) {
            Log::warning('Registration conversion skipped: invalid event id', [
                'event_id_length' => strlen($eventId),
            ]);
            return;
        }

        $eventSourceUrl = $request->headers->get('referer');

        app(MetaCapiService::class)->send(
            'CompleteRegistration',
            $request,
            $user,
            [],
            $eventId,
            $eventSourceUrl
        );

        app(TikTokEventsApiService::class)->send(
            'CompleteRegistration',
            $request,
            $user,
            [
                'content_type' => 'product',
                'content_ids' => ['mercasto_account'],
                'contents' => [[
                    'content_id' => 'mercasto_account',
                    'content_type' => 'product',
                    'content_name' => 'Mercasto account registration',
                    'quantity' => 1,
                ]],
                'status' => 'completed',
            ],
            $eventId,
            $eventSourceUrl
        );
    }
}

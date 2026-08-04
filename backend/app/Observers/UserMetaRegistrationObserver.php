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

        $registrationPaths = [
            'api/register',
            'api/auth/phone/verify',
            'api/auth/telegram/callback',
            'api/auth/*/callback',
        ];
        if (! collect($registrationPaths)->contains(fn (string $path) => $request->is($path))) {
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
        $registrationMethod = $this->registrationMethod($request);

        app(MetaCapiService::class)->send(
            'CompleteRegistration',
            $request,
            $user,
            ['registration_method' => $registrationMethod],
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
                'registration_method' => $registrationMethod,
            ],
            $eventId,
            $eventSourceUrl
        );
    }
    private function registrationMethod($request): string
    {
        if ($request->is('api/auth/phone/verify')) {
            return 'phone';
        }
        if ($request->is('api/auth/telegram/callback')) {
            return 'telegram';
        }
        if ($request->is('api/auth/*/callback')) {
            return (string) $request->route('provider', 'oauth');
        }

        return (string) $request->input('registration_method', 'email');
    }
}

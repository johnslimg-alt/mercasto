<?php

namespace App\Observers;

use App\Models\User;
use App\Services\MetaCapiService;
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
            Log::warning('Meta CompleteRegistration skipped: invalid event id', [
                'event_id_length' => strlen($eventId),
            ]);
            return;
        }

        app(MetaCapiService::class)->send(
            'CompleteRegistration',
            $request,
            $user,
            [],
            $eventId,
            $request->headers->get('referer')
        );
    }
}

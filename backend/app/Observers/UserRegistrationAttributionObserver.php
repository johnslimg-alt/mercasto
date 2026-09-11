<?php

namespace App\Observers;

use App\Models\User;
use App\Models\UserRegistrationAttribution;
use App\Support\RegistrationAttribution;
use Illuminate\Support\Facades\Log;

/**
 * Persists the campaign attribution of a newly created account.
 *
 * Runs for every registration channel (email/password, phone, Telegram, OAuth)
 * because each of them creates the user through a registration request path.
 * The request body carries the attribution slice; for OAuth the controller
 * merges it out of the cached one-time consent state before the user is created.
 *
 * A failure here must never break registration, so storage errors are logged and
 * swallowed.
 */
class UserRegistrationAttributionObserver
{
    public function created(User $user): void
    {
        try {
            $request = request();
            if (! $request || ! RegistrationAttribution::isRegistrationRequest($request)) {
                return;
            }

            $record = RegistrationAttribution::fromRequest($request);
            $method = RegistrationAttribution::methodFor($request);

            // A registration with no attribution still records how the account
            // was created, which keeps the conversion denominator explicit.
            UserRegistrationAttribution::updateOrCreate(
                ['user_id' => $user->id],
                [...$record, 'registration_method' => $method],
            );
        } catch (\Throwable $e) {
            Log::warning('Could not persist registration attribution', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

<?php

namespace App\Support;

use App\Models\User;

final class AnalyticsTrackingConsent
{
    public static function current(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $preferences = $user->notification_preferences ?? [];
        if (is_string($preferences)) {
            $preferences = json_decode($preferences, true) ?: [];
        }

        return ($preferences['analytics_tracking_consent'] ?? false) === true;
    }

    public static function persist(User $user, bool $allowed): void
    {
        $preferences = $user->notification_preferences ?? [];
        if (is_string($preferences)) {
            $preferences = json_decode($preferences, true) ?: [];
        }

        $user->notification_preferences = array_merge($preferences, [
            'analytics_tracking_consent' => $allowed,
            'analytics_tracking_consent_updated_at' => now()->toIso8601String(),
        ]);
        $user->save();
    }
}

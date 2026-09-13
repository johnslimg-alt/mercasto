<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

final class AnalyticsTrackingConsent
{
    /**
     * Explicit browser signal that vendor (Meta / TikTok / GA4) measurement may
     * receive this event. Mercasto's server cannot read localStorage, so the
     * browser has to state its decision on every request that may cause an onward
     * transfer to a third party.
     */
    public const VENDOR_SIGNAL = 'analytics_tracking_consent';

    /**
     * Explicit browser signal for OpenAI Ads measurement. Kept vendor scoped
     * because the OpenAI path already shipped with its own signal.
     */
    public const OPENAI_SIGNAL = 'openai_measurement_consent';

    /**
     * Server-side egress gate for Meta, TikTok and GA4.
     *
     * Two factors, and deliberately not the same predicate as the OpenAI path:
     *  1. the browser must have sent an explicit affirmative signal on this request;
     *     an absent, empty or malformed signal is never consent, and
     *  2. when the caller is an authenticated account, the persisted account
     *     preference must also allow measurement, so a withdrawal recorded on the
     *     account is honoured even if the browser still advertises consent.
     *
     * Anonymous callers (the public contact relay) have no account record to
     * consult. There the explicit per-request affirmative is the consent record —
     * this keeps measurement working for consenting signed-out visitors instead of
     * going dark for everyone. Anonymous egress still requires the signal: absence
     * is never treated as consent.
     *
     * Mexican framing (LFPDPPP): first-party receipt by Mercasto's own server is
     * lawful once disclosed. What this gate governs is the onward transfer to a
     * third party, which must not happen until the aviso discloses the transfer and
     * the titular expressly accepts it.
     */
    public static function allowsVendorEgress(Request $request, ?User $user): bool
    {
        if (! self::signalGranted($request, self::VENDOR_SIGNAL)) {
            return false;
        }

        return $user === null || self::current($user);
    }

    /**
     * Server-side egress gate for OpenAI Ads. Unchanged two-factor predicate: the
     * OpenAI signal plus the account preference. The public contact relay is
     * intentionally not an OpenAI lead conversion, so a null user stays blocked.
     */
    public static function allowsOpenAiEgress(Request $request, ?User $user): bool
    {
        return self::signalGranted($request, self::OPENAI_SIGNAL) && self::current($user);
    }

    /**
     * Egress gate for vendor events triggered by a server-to-server callback (the
     * Clip webhook). The callback carries no browser signal, so the decision
     * captured explicitly at checkout time is used instead — and it is still
     * re-verified against the paying account before anything leaves the server.
     *
     * Fail closed: only a strict boolean true counts. Anything else — a missing
     * cache entry, a value minted before the decision was captured, or a
     * non-boolean — blocks the onward transfer.
     */
    public static function allowsDeferredVendorEgress(mixed $checkoutSignal, ?User $user): bool
    {
        return $checkoutSignal === true && self::current($user);
    }

    /**
     * Reads the explicit browser signal. Only an affirmative value ("1", 1, true,
     * "true", "on", "yes") counts: an absent, empty or malformed value is not
     * consent. There is deliberately no configuration switch anywhere in this
     * class that could re-enable pre-consent egress.
     */
    public static function signalGranted(Request $request, string $signal): bool
    {
        return $request->boolean($signal);
    }

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

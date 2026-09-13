<?php

namespace App\Support;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use Carbon\Carbon;

/**
 * Durable provenance for the publication lifetime an OPERATOR command granted.
 *
 * Why this exists: `ads:correct-activation-lifetime` must be able to answer "is the
 * `expires_at` on this row still the one the operator's bulk activation stamped, or did
 * something else write it since?" — because a lifetime that came from the seller (a paid
 * renewal, a credited renewal, a republish) must never be extended or resurrected.
 *
 * Comparing `status` and `republished_at` alone is NOT sufficient to answer that, and the
 * gap is real, not theoretical: `AdController::renew` (the referral-credit renewal) writes
 * `status = 'active'` and `expires_at = Ad::freshExpiry()` and nothing else — no `payments`
 * row, no `republished_at`, no `republish_count`. A guard built only on those signals would
 * silently overwrite a seller's own renewal.
 *
 * So the operator's own write records the exact instant it stamped, inside the
 * `ad_moderation_decisions` row the activation already creates. The column is the audit
 * trail of operator actions, so this adds no new table and no new concept: it makes the
 * existing record carry the one fact that makes the correction provable.
 *
 * The comparison is on the exact instant rather than on `status` or `updated_at` for a
 * specific reason: every expiry path (`ads:expire`, `ads:process-expiry`,
 * EnforcePaidAdRenewal::expireDueAds) flips `status` to `expired` and leaves `expires_at`
 * untouched. Equality on `expires_at` therefore survives the natural end of the granted
 * lifetime — which is the exact case the correction exists to repair — while every
 * re-stamp path changes it.
 */
final class ActivationLifetimeProvenance
{
    /**
     * The command whose activation grants a lifetime in bulk. Stored under
     * `metadata.reconciliation.command`, where the activation already records itself.
     */
    public const RECONCILE_COMMAND = 'ads:reconcile-moderation-visibility';

    /** This correction command, recorded under `metadata.lifetime_correction.command`. */
    public const CORRECTION_COMMAND = 'ads:correct-activation-lifetime';

    /** Exact instant an activation stamped, under `metadata.reconciliation`. */
    public const GRANTED_EXPIRES_AT = 'granted_expires_at';

    /** Exact instant a correction stamped, under `metadata.lifetime_correction`. */
    public const CORRECTED_EXPIRES_AT = 'corrected_expires_at';

    /**
     * Slack allowed when matching a recorded instant against the stored column.
     *
     * The recorded value is written as an ISO-8601 string and the column stores whole
     * seconds; a driver that rounds rather than truncates can land one second away from the
     * recorded instant. One second is far below the shortest interval any re-stamp can
     * produce (the shortest lifetime is one day), so the tolerance cannot hide a
     * third-party write — it only absorbs column rounding.
     */
    public const MATCH_TOLERANCE_SECONDS = 1;

    /**
     * The lifetime an activation is about to grant, recorded on the decision it creates.
     *
     * @return array<string, string|int> Keys merged into the decision's `reconciliation` metadata.
     */
    public static function activationGrant(Carbon $expiresAt): array
    {
        return [
            self::GRANTED_EXPIRES_AT => $expiresAt->toIso8601String(),
            'granted_lifetime_days' => Ad::lifetimeDays(),
        ];
    }

    /**
     * The lifetime a correction granted, recorded so a later correction can recognise the
     * value it wrote instead of mistaking it for a third-party re-stamp.
     *
     * @return array<string, string|int|null>
     */
    public static function correctionGrant(Carbon $expiresAt, ?Carbon $previousExpiresAt, Carbon $anchor): array
    {
        return [
            'command' => self::CORRECTION_COMMAND,
            self::CORRECTED_EXPIRES_AT => $expiresAt->toIso8601String(),
            'previous_expires_at' => $previousExpiresAt?->toIso8601String(),
            'activation_anchor' => $anchor->toIso8601String(),
            'lifetime_days' => Ad::lifetimeDays(),
        ];
    }

    /**
     * True when this decision records an operator-granted lifetime, i.e. it is a fact written
     * by one of the two operator commands rather than by the moderation pipeline.
     */
    public static function isOperatorGrant(AdModerationDecision $decision): bool
    {
        return self::grantedExpiresAt($decision) !== null;
    }

    /**
     * The instant an operator command stamped, or null when this decision records none
     * (a pipeline decision, or an activation performed by a build older than this class).
     */
    public static function grantedExpiresAt(AdModerationDecision $decision): ?Carbon
    {
        $metadata = $decision->metadata;
        if (! is_array($metadata)) {
            return null;
        }

        $recorded = data_get($metadata, 'reconciliation.'.self::GRANTED_EXPIRES_AT)
            ?? data_get($metadata, 'lifetime_correction.'.self::CORRECTED_EXPIRES_AT);

        if (! is_string($recorded) || $recorded === '') {
            return null;
        }

        try {
            return Carbon::parse($recorded);
        } catch (\Throwable) {
            // A malformed record must never be read as "no third party wrote this": the
            // caller treats null as unverifiable and skips the row.
            return null;
        }
    }

    /**
     * True when the activation that granted this row's lifetime is recorded as having come
     * from the bulk reconciliation command.
     */
    public static function isBulkActivation(AdModerationDecision $decision): bool
    {
        return data_get($decision->metadata, 'reconciliation.command') === self::RECONCILE_COMMAND;
    }

    /**
     * Whether the stored column still holds exactly the recorded instant.
     */
    public static function matches(?Carbon $stored, ?Carbon $recorded): bool
    {
        if ($stored === null || $recorded === null) {
            return false;
        }

        return abs($stored->getTimestamp() - $recorded->getTimestamp()) <= self::MATCH_TOLERANCE_SECONDS;
    }
}

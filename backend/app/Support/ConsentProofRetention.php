<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * EG-04 — retention of demonstrable consent proof after erasure.
 *
 * When a data subject exercises cancellation we must satisfy two duties at once:
 *
 *   a) the privacy notice promises the personal data is deleted; and
 *   b) LFPDPPP obliges the controller to be able to *demonstrate* that consent for the
 *      processing that already happened was lawfully obtained.
 *
 * The resolution implemented here is to sever the linkage instead of keeping the person:
 * the consent row survives, `user_id` is set to NULL, and only a keyed pseudonym
 * (`subject_ref`) and the consent facts (type, document version, timestamp, source)
 * remain. The row is therefore not attributable to an identifiable individual from the
 * database alone, which is what makes retaining it compatible with the erasure promise.
 *
 * `subject_ref` is an HMAC peppered with the application key rather than a bare hash
 * because a plain SHA-256 of a sequential user id is reversible by enumeration in
 * seconds. It still cannot be recomputed for a candidate id unless the attacker also
 * holds APP_KEY, and after erasure there is no user id left to compare against.
 */
final class ConsentProofRetention
{
    /** A self-service cancellation under LFPDPPP art. 28 (derecho de cancelación). */
    public const BASIS_SELF_DELETION = 'lfpdppp_cancellation_self';

    /** An administrator-driven removal (abuse, legal order, inactive account). */
    public const BASIS_ADMIN_DELETION = 'lfpdppp_cancellation_admin';

    /**
     * Consent proof is kept for as long as the records it justifies can be audited.
     * Payments are retained five years under CFF art. 30, so the evidence that the
     * processing had a lawful basis is retained for the same window and no longer.
     */
    public const RETENTION_MONTHS = 60;

    /**
     * Pseudonymise every live consent row for a user that is about to be erased.
     *
     * Must be called *before* the user row is deleted, while `user_id` is still known.
     *
     * @return int number of consent rows retained as pseudonymised proof
     */
    public static function pseudonymiseForDeletedUser(int $userId, string $basis): int
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('user_consents')) {
            return 0;
        }

        $now = Carbon::now();

        $update = [
            'user_id' => null,
            'retention_basis' => $basis,
            'retained_at' => $now,
            'updated_at' => $now,
        ];

        if (\Illuminate\Support\Facades\Schema::hasColumn('user_consents', 'subject_ref')) {
            $update['subject_ref'] = self::subjectRef($userId);
        }

        if (\Illuminate\Support\Facades\Schema::hasColumn('user_consents', 'retention_expires_at')) {
            $update['retention_expires_at'] = $now->copy()->addMonths(self::RETENTION_MONTHS);
        }

        return DB::table('user_consents')
            ->where('user_id', $userId)
            ->update($update);
    }

    /**
     * Keyed, domain-separated pseudonym for an erased subject.
     */
    public static function subjectRef(int $userId): string
    {
        return hash_hmac(
            'sha256',
            'mercasto:consent-subject:v1:'.$userId,
            (string) config('app.key'),
        );
    }

    /**
     * Delete pseudonymised consent proofs whose documented retention window has closed.
     *
     * @return int number of rows purged
     */
    public static function purgeExpired(): int
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('user_consents')) {
            return 0;
        }

        if (! \Illuminate\Support\Facades\Schema::hasColumn('user_consents', 'retention_expires_at')) {
            return 0;
        }

        return DB::table('user_consents')
            ->whereNull('user_id')
            ->whereNotNull('retention_expires_at')
            ->where('retention_expires_at', '<=', Carbon::now())
            ->delete();
    }
}

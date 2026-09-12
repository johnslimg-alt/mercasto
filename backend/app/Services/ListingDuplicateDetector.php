<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Collection;

/**
 * Detects content-identical resubmissions from the same seller.
 *
 * This deliberately SURFACES duplicates instead of judging them: the pipeline
 * routes a suspected duplicate to human review and records the evidence, but it
 * never rejects automatically. A dealer may legitimately post several identical
 * units, and this platform has already been burned by automation silently
 * choosing a policy, so the policy decision belongs to an operator.
 *
 * Identity key (all four components must match exactly):
 *   seller id + normalized title + normalized price + normalized description
 *
 * Normalization is intentionally conservative — lowercase and collapse internal
 * whitespace only. There is NO fuzzy matching, stemming, accent folding or
 * punctuation stripping, so a real listing is never accused because it merely
 * looks similar. Precision is chosen over recall on purpose: a false positive
 * costs a human review of legitimate inventory, which is the failure mode this
 * design most wants to avoid.
 *
 * The check is cheap: one query against the seller's own earlier ads filtered by
 * price, ordered by id so the earliest ad is the stable "original". The
 * compared-ads count is returned so the cost and any truncation stay measurable.
 */
class ListingDuplicateDetector
{
    /**
     * Upper bound on how many of the seller's ads are compared for one submission.
     */
    public const MAX_CANDIDATES = 500;

    /**
     * Marker placed in ai_moderation_reason so the admin queue shows the
     * suspicion without any UI change.
     */
    public const REASON_MARKER = 'Posible duplicado';

    /**
     * Human-readable description of the ordering key that decides which submission
     * is the original. Surfaced by the resolution command so an operator can see
     * exactly what "earliest" means before approving a run.
     */
    public const ORDER_DESCRIPTION = 'submission order (created_at, then id as tiebreaker)';

    /**
     * The components that must all match for two submissions to be the same content.
     * Single-sourced so the pipeline, the resolution command and the admin payload
     * cannot describe one signal in two different shapes.
     */
    public const MATCHED_ON = ['seller_id', 'title', 'price', 'description'];

    /**
     * Build the structured duplicate evidence stored on a moderation decision.
     *
     * Single-sourced so any writer — the AI job or the resolution command — records
     * the same shape that AdminAdModerationController::presentDuplicate() reads.
     * Without this the command's own audit row would become the newest decision and
     * silently clear the marker for exactly the rows it just routed to review.
     *
     * @return array{
     *     is_duplicate: bool,
     *     duplicate_of_ad_id: int|null,
     *     fingerprint: string,
     *     candidate_count: int|null,
     *     candidates_truncated: bool,
     *     matched_on: array<int, string>
     * }
     */
    public function evidenceFor(
        int $originalAdId,
        string $fingerprint,
        ?int $candidateCount = null,
        bool $candidatesTruncated = false,
    ): array {
        return [
            'is_duplicate' => true,
            'duplicate_of_ad_id' => $originalAdId,
            'fingerprint' => $fingerprint,
            'candidate_count' => $candidateCount,
            'candidates_truncated' => $candidatesTruncated,
            'matched_on' => self::MATCHED_ON,
        ];
    }

    /**
     * @return array{
     *     is_duplicate: bool,
     *     fingerprint: string,
     *     duplicate_of_ad_id: int|null,
     *     candidate_count: int,
     *     candidates_truncated: bool,
     *     matched_on: array<int, string>
     * }
     */
    public function detect(Ad $ad): array
    {
        $fingerprint = $this->fingerprint($ad);

        $candidates = Ad::query()
            ->where('user_id', $ad->user_id)
            // Only strictly earlier SUBMISSIONS can be the original. Without this the
            // earliest ad of a group matches a later copy and the two accuse each
            // other, which would route an established listing to review as if it were
            // the duplicate and make the duplicate count unstable.
            //
            // Submission order is keyed on created_at with id as a deterministic
            // tiebreaker. Ad id is an insertion counter, which is NOT the same concept
            // as submission time: a row restored, imported or backfilled with an
            // explicit created_at can carry an id that disagrees with when it was
            // submitted. In this codebase those paths do not exist today (every ad
            // goes through Ad::create(), created_at is not fillable, and no write sets
            // created_at or an explicit id), so the two orders currently agree
            // exactly - but created_at alone is not a total order (seconds tie), and
            // relying on that alignment would be an unexamined assumption.
            ->where(function ($query) use ($ad): void {
                if ($ad->created_at === null) {
                    // Defensive: with no submission timestamp, fall back to insertion
                    // order so an original is still deterministic.
                    $query->where('id', '<', $ad->getKey());

                    return;
                }

                $query->where('created_at', '<', $ad->created_at)
                    ->orWhere(function ($tie) use ($ad): void {
                        $tie->where('created_at', $ad->created_at)
                            ->where('id', '<', $ad->getKey());
                    });
            })
            ->where('price', $ad->price)
            // A catalog placeholder is editorial content, not a submission, so it can
            // never make a real listing look like a duplicate.
            ->where('is_catalog_filler', false)
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit(self::MAX_CANDIDATES + 1)
            ->get(['id', 'user_id', 'title', 'price', 'description', 'created_at']);

        $truncated = $candidates->count() > self::MAX_CANDIDATES;
        $candidates = $candidates->take(self::MAX_CANDIDATES);

        $match = $candidates->first(
            fn (Ad $candidate): bool => $this->fingerprint($candidate) === $fingerprint
        );

        return [
            'is_duplicate' => $match !== null,
            'fingerprint' => $fingerprint,
            'duplicate_of_ad_id' => $match?->id,
            'candidate_count' => $candidates->count(),
            'candidates_truncated' => $truncated,
            'matched_on' => self::MATCHED_ON,
        ];
    }

    /**
     * Sort ads into submission order: created_at first, id as a deterministic
     * tiebreaker (created_at is only second-granular, so ties are common in a burst).
     *
     * Shared so the detector's notion of "the original" and the resolution command's
     * --keep=earliest|latest can never disagree about ordering.
     *
     * @param  Collection<int, Ad>  $ads
     * @return Collection<int, Ad>
     */
    public function sortBySubmissionOrder(Collection $ads): Collection
    {
        return $ads
            ->sort(fn (Ad $a, Ad $b): int => ($a->created_at <=> $b->created_at) ?: ($a->id <=> $b->id))
            ->values();
    }

    /**
     * Stable content fingerprint for an ad.
     */
    public function fingerprint(Ad $ad): string
    {
        return $this->fingerprintFor(
            $ad->user_id,
            $ad->title,
            $ad->price,
            $ad->description,
        );
    }

    public function fingerprintFor(mixed $userId, mixed $title, mixed $price, mixed $description): string
    {
        return hash('sha256', implode("\n", [
            (string) $userId,
            $this->normalizeText($title),
            $this->normalizePrice($price),
            $this->normalizeText($description),
        ]));
    }

    /**
     * Lowercase and collapse whitespace. Deliberately not fuzzy.
     */
    public function normalizeText(mixed $value): string
    {
        $collapsed = preg_replace('/\s+/u', ' ', mb_strtolower(trim((string) $value)));

        return trim((string) $collapsed);
    }

    /**
     * Normalize a price so 320000, 320000.0 and "320000.00" are the same value.
     */
    public function normalizePrice(mixed $price): string
    {
        return is_numeric($price) ? number_format((float) $price, 2, '.', '') : '';
    }

    /**
     * Human-readable reason fragment for the admin queue.
     */
    public function reasonFor(array $signal): string
    {
        return $this->reasonForId((int) $signal['duplicate_of_ad_id']);
    }

    /**
     * Same marker format, addressed to the kept original. Shared so the moderation
     * pipeline and the duplicate-resolution command cannot drift apart, and so the
     * existing admin UI renders both without any change.
     */
    public function reasonForId(int $originalAdId): string
    {
        return sprintf(
            '%s del anuncio #%d ya enviado por el mismo vendedor. Se requiere revisión humana para decidir la política de duplicados.',
            self::REASON_MARKER,
            $originalAdId,
        );
    }

    /**
     * Fail-closed reason for an inconclusive scan.
     *
     * A truncated candidate window means the absence of a match proves nothing, so a
     * negative result must not be reported as "unique" — a high-volume seller could
     * otherwise push the real original past the cap and have copies auto-published.
     */
    public function truncatedReason(): string
    {
        return 'No se pudo completar la verificación de duplicados: el vendedor tiene más anuncios con el mismo precio que el límite de comparación. Se requiere revisión humana.';
    }

    /**
     * True when the scan was inconclusive, i.e. the ad must not be treated as unique.
     */
    public function isInconclusive(array $signal): bool
    {
        return ($signal['candidates_truncated'] ?? false) === true
            && ($signal['is_duplicate'] ?? false) !== true;
    }
}

<?php

namespace App\Services;

use App\Models\Ad;

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
            // Only strictly earlier submissions can be the original. Without this the
            // earliest ad of a group matches a later copy and the two accuse each
            // other, which would route an established listing to review as if it were
            // the duplicate and make the duplicate count unstable.
            ->where('id', '<', $ad->getKey())
            ->where('price', $ad->price)
            // A catalog placeholder is editorial content, not a submission, so it can
            // never make a real listing look like a duplicate.
            ->where('is_catalog_filler', false)
            ->orderBy('id')
            ->limit(self::MAX_CANDIDATES + 1)
            ->get(['id', 'user_id', 'title', 'price', 'description']);

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
            'matched_on' => ['seller_id', 'title', 'price', 'description'],
        ];
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
        return sprintf(
            '%s del anuncio #%d ya enviado por el mismo vendedor. Se requiere revisión humana para decidir la política de duplicados.',
            self::REASON_MARKER,
            (int) $signal['duplicate_of_ad_id'],
        );
    }
}

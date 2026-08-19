<?php

namespace App\Services;

use Illuminate\Support\Str;

class ListingPolicySignalService
{
    private array $termsByPolicy;

    public function __construct(
        private readonly ListingPolicyMatrixService $matrix,
        ?array $termsByPolicy = null,
    ) {
        $this->termsByPolicy = $termsByPolicy ?? (array) config('listing_policy_terms', []);
    }

    public function assessListing(array $listing): array
    {
        $text = $this->normalizeText(
            trim((string) ($listing['title'] ?? '')) . ' ' . trim((string) ($listing['description'] ?? '')),
        );

        if ($text === '') {
            return $this->matrix->assessment([]);
        }

        $signals = [];
        foreach ($this->termsByPolicy as $policyId => $terms) {
            if ($this->containsAnyPhrase($text, (array) $terms)) {
                $policy = $this->matrix->policy((string) $policyId);
                if (! $policy) {
                    continue;
                }

                $signals = array_merge($signals, (array) ($policy['automated_signals'] ?? []));
            }
        }

        return $this->matrix->assessment(array_values(array_unique($signals)));
    }

    private function containsAnyPhrase(string $normalizedText, array $terms): bool
    {
        $haystack = ' ' . $normalizedText . ' ';

        foreach ($terms as $term) {
            $needle = $this->normalizeText((string) $term);
            if ($needle !== '' && str_contains($haystack, ' ' . $needle . ' ')) {
                return true;
            }
        }

        return false;
    }

    private function normalizeText(string $value): string
    {
        $value = Str::lower(Str::ascii(strip_tags($value)));
        $value = preg_replace('/[^a-z0-9]+/', ' ', $value) ?? '';
        return trim(preg_replace('/\s+/', ' ', $value) ?? '');
    }
}

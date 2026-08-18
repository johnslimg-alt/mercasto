<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Str;

class ListingDuplicateRiskService
{
    private const CANDIDATE_LIMIT = 50;

    public function hasRisk(int $userId, array $listing, ?int $excludeAdId = null): bool
    {
        $title = $this->normalized((string) ($listing['title'] ?? ''));
        $category = Str::lower(trim((string) ($listing['category'] ?? '')));
        $location = $this->normalizedLocation($listing);

        if ($title === '' || $category === '' || $location === '') {
            return false;
        }

        $query = Ad::query()
            ->where('user_id', $userId)
            ->where('category', $category)
            ->whereIn('status', ['pending', 'active'])
            ->latest('id')
            ->limit(self::CANDIDATE_LIMIT);

        if ($excludeAdId !== null) {
            $query->where('id', '!=', $excludeAdId);
        }

        return $query->get(['id', 'title', 'location', 'city', 'state'])->contains(
            fn (Ad $candidate) => $this->normalized((string) $candidate->title) === $title
                && $this->normalizedLocation($candidate->toArray()) === $location,
        );
    }

    private function normalizedLocation(array $listing): string
    {
        $city = $this->normalized((string) ($listing['city'] ?? ''));
        $state = $this->normalized((string) ($listing['state'] ?? ''));
        if ($city !== '' || $state !== '') {
            return trim($city . '|' . $state, '|');
        }

        return $this->normalized((string) ($listing['location'] ?? ''));
    }

    private function normalized(string $value): string
    {
        $value = Str::lower(Str::ascii(trim(strip_tags($value))));
        return preg_replace('/[^\\pL\\pN]+/u', '', $value) ?? '';
    }
}

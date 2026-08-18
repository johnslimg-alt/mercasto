<?php

namespace App\Services;

use Illuminate\Support\Str;

class ListingQualityPreflightService
{
    private const PHOTO_RECOMMENDED_CATEGORIES = [
        'productos', 'autos', 'inmuebles',
    ];

    public function evaluate(array $listing): array
    {
        $title = trim(strip_tags((string) ($listing['title'] ?? '')));
        $description = trim(strip_tags((string) ($listing['description'] ?? '')));
        $category = Str::lower(trim((string) ($listing['category'] ?? '')));
        $price = is_numeric($listing['price'] ?? null) ? (float) $listing['price'] : null;
        $photoCount = max(0, (int) ($listing['photo_count'] ?? 0));

        $errors = [];
        $warnings = [];

        if (mb_strlen($title) < 3) {
            $errors[] = 'title_too_short';
        }
        if (mb_strlen($description) < 10) {
            $errors[] = 'description_too_short';
        }
        if ($price !== null && $price < 0) {
            $errors[] = 'price_negative';
        } elseif ($price !== null && $price == 0.0) {
            $warnings[] = 'price_zero';
        }

        $combined = trim($title . ' ' . $description);
        if ($this->containsContactData($combined)) {
            $warnings[] = 'contact_data_in_copy';
        }
        if ($this->looksKeywordStuffed($combined)) {
            $warnings[] = 'keyword_stuffing';
        }
        if ($title !== '' && $description !== '' && $this->normalized($title) === $this->normalized($description)) {
            $warnings[] = 'title_repeated_as_description';
        }
        if (in_array($category, self::PHOTO_RECOMMENDED_CATEGORIES, true) && $photoCount === 0) {
            $warnings[] = 'photo_recommended';
        }

        return [
            'passes_hard_validation' => $errors === [],
            'errors' => array_values(array_unique($errors)),
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    private function containsContactData(string $text): bool
    {
        return preg_match('/https?:\/\/|www\./iu', $text) === 1
            || preg_match('/[\pL\pN._%+\-]+@[\pL\pN.\-]+\.[\pL]{2,}/iu', $text) === 1
            || preg_match('/(?<!\d)(?:\+?52[\s.\-]?)?(?:\d[\s.\-]?){10}(?!\d)/u', $text) === 1;
    }

    private function looksKeywordStuffed(string $text): bool
    {
        $tokens = preg_split('/[^\pL\pN]+/u', Str::lower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $tokens = array_values(array_filter($tokens, fn ($token) => mb_strlen($token) >= 3));
        if (count($tokens) < 8) {
            return false;
        }

        $counts = array_count_values($tokens);
        return max($counts ?: [0]) >= 5;
    }

    private function normalized(string $text): string
    {
        return preg_replace('/[^\pL\pN]+/u', '', Str::lower($text)) ?? '';
    }
}

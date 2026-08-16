<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class AuditActiveContentQuality extends Command
{
    protected $signature = 'ads:audit-active-content-quality {--limit-groups=12 : Maximum diagnostic groups to print}';
    protected $description = 'Report active listing quality issues without changing production data.';

    public function handle(): int
    {
        $limitGroups = max(1, min(50, (int) $this->option('limit-groups')));
        $ads = Ad::query()
            ->with('user:id,whatsapp,telegram_username,business_whatsapp')
            ->where('status', 'active')
            ->get([
                'id', 'user_id', 'title', 'description', 'price', 'location', 'state', 'city',
                'category', 'image_url', 'generated_cover', 'is_catalog_filler', 'ai_moderation_status',
            ]);

        $summary = [
            'active' => $ads->count(),
            'genuine' => 0,
            'catalog_refs' => 0,
            'moderation_not_approved' => 0,
            'missing_title' => 0,
            'missing_description' => 0,
            'short_description_lt_60' => 0,
            'nonpositive_price' => 0,
            'missing_primary_image' => 0,
            'generated_cover' => 0,
            'missing_location' => 0,
            'missing_state_or_city' => 0,
            'no_external_contact' => 0,
            'genuine_no_external_contact' => 0,
            'catalog_refs_no_external_contact' => 0,
            'orphan_user' => 0,
            'unsplash_primary_image' => 0,
        ];

        $categories = [];
        $images = [];
        $fingerprints = [];
        $missingGeoLocations = [];

        foreach ($ads as $ad) {
            $category = trim((string) $ad->category) ?: '(none)';
            $categories[$category] ??= [
                'active' => 0,
                'not_approved' => 0,
                'weak_description' => 0,
                'missing_image' => 0,
                'unsplash_image' => 0,
            ];
            $categories[$category]['active']++;

            if ($ad->is_catalog_filler) $summary['catalog_refs']++;
            else $summary['genuine']++;

            if ($ad->ai_moderation_status !== 'approved') {
                $summary['moderation_not_approved']++;
                $categories[$category]['not_approved']++;
            }

            $title = trim(strip_tags((string) $ad->title));
            $description = trim(strip_tags((string) $ad->description));
            if ($title === '') $summary['missing_title']++;
            if ($description === '') $summary['missing_description']++;
            if (mb_strlen($description) < 60) {
                $summary['short_description_lt_60']++;
                $categories[$category]['weak_description']++;
            }
            if ((float) $ad->price <= 0) $summary['nonpositive_price']++;
            if ($ad->generated_cover) $summary['generated_cover']++;

            $location = trim((string) $ad->location);
            $state = trim((string) $ad->state);
            $city = trim((string) $ad->city);
            if ($location === '' && $state === '' && $city === '') $summary['missing_location']++;
            if ($state === '' || $city === '') {
                $summary['missing_state_or_city']++;
                $locationKey = $location !== '' ? $location : '(empty location)';
                $missingGeoLocations[$locationKey] = ($missingGeoLocations[$locationKey] ?? 0) + 1;
            }

            if (! $ad->user) {
                $summary['orphan_user']++;
            } elseif (! $this->hasExternalContact($ad->user)) {
                $summary['no_external_contact']++;
                if ($ad->is_catalog_filler) {
                    $summary['catalog_refs_no_external_contact']++;
                } else {
                    $summary['genuine_no_external_contact']++;
                }
            }

            $primary = $this->primaryImage($ad->image_url);
            $normalizedImage = $this->normalizeImage($primary);
            if ($normalizedImage === '') {
                $summary['missing_primary_image']++;
                $categories[$category]['missing_image']++;
            } else {
                $images[$normalizedImage][] = $ad->id;
                if (str_contains(Str::lower($normalizedImage), 'images.unsplash.com/')) {
                    $summary['unsplash_primary_image']++;
                    $categories[$category]['unsplash_image']++;
                }
            }

            $fingerprint = $this->contentFingerprint($ad);
            if ($fingerprint !== '') $fingerprints[$fingerprint][] = $ad->id;
        }

        ksort($categories);
        arsort($missingGeoLocations);
        $duplicateImages = $this->duplicateGroups($images);
        $duplicateContent = $this->duplicateGroups($fingerprints);

        $this->table(['metric', 'count'], collect($summary)->map(fn ($count, $metric) => [$metric, $count])->values()->all());
        $this->table(
            ['category', 'active', 'not approved', 'weak description', 'missing image', 'Unsplash image'],
            collect($categories)->map(fn ($row, $category) => [
                $category, $row['active'], $row['not_approved'], $row['weak_description'], $row['missing_image'], $row['unsplash_image'],
            ])->values()->all()
        );

        $this->line('missing_geo_location_groups=' . count($missingGeoLocations));
        foreach (array_slice($missingGeoLocations, 0, $limitGroups, true) as $location => $count) {
            $this->line('missing geo location=' . $location . ' count=' . $count);
        }

        $this->line('duplicate_primary_image_groups=' . count($duplicateImages));
        $this->line('duplicate_primary_image_ads=' . array_sum(array_map('count', $duplicateImages)));
        $this->printGroups('duplicate image', $duplicateImages, $limitGroups);

        $this->line('duplicate_content_groups=' . count($duplicateContent));
        $this->line('duplicate_content_ads=' . array_sum(array_map('count', $duplicateContent)));
        $this->printGroups('duplicate content', $duplicateContent, $limitGroups);

        $this->info('Active content quality audit completed in read-only mode.');
        return self::SUCCESS;
    }

    private function hasExternalContact(object $user): bool
    {
        return trim((string) ($user->whatsapp ?? '')) !== ''
            || trim((string) ($user->business_whatsapp ?? '')) !== ''
            || trim((string) ($user->telegram_username ?? '')) !== '';
    }

    private function primaryImage(mixed $value): string
    {
        if (is_array($value)) return trim((string) ($value[0] ?? ''));
        if (! is_string($value) || trim($value) === '') return '';
        $decoded = json_decode($value, true);
        if (is_array($decoded)) return trim((string) ($decoded[0] ?? ''));
        return trim($value);
    }

    private function normalizeImage(string $image): string
    {
        if ($image === '') return '';
        return trim((string) (preg_replace('/[?#].*$/', '', $image) ?? $image));
    }

    private function contentFingerprint(Ad $ad): string
    {
        $title = Str::lower(Str::squish(strip_tags((string) $ad->title)));
        $description = Str::lower(Str::squish(strip_tags((string) $ad->description)));
        if ($title === '' && $description === '') return '';

        return hash('sha256', implode('|', [
            $title,
            $description,
            number_format((float) $ad->price, 2, '.', ''),
            Str::lower(trim((string) $ad->category)),
            Str::lower(trim((string) $ad->state)),
            Str::lower(trim((string) $ad->city)),
        ]));
    }

    private function duplicateGroups(array $groups): array
    {
        return array_values(array_filter($groups, fn (array $ids) => count($ids) > 1));
    }

    private function printGroups(string $label, array $groups, int $limit): void
    {
        foreach (array_slice($groups, 0, $limit) as $ids) {
            $this->line($label . ' ids=' . implode(',', array_slice($ids, 0, 25)) . (count($ids) > 25 ? ',…' : ''));
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class RestoreCatalogFillerImages extends Command
{
    protected $signature = 'ads:restore-catalog-filler-images
        {--mapping= : TSV file containing ad_id and public-disk image path}
        {--apply : Apply the validated mapping; without this flag the command is read-only}';

    protected $description = 'Restore catalog filler photos from a validated local mapping without touching genuine listings.';

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function handle(): int
    {
        try {
            $mapping = $this->readMapping((string) $this->option('mapping'));
            $this->validateCurrentState($mapping, false);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        $this->info('Validated catalog image mapping: ' . count($mapping) . ' active filler(s).');

        if (! $this->option('apply')) {
            $this->comment('Dry run only. No database rows changed. Pass --apply after reviewing the validated mapping.');
            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($mapping): void {
                $ads = $this->validateCurrentState($mapping, true);
                foreach ($mapping as $id => $path) {
                    /** @var Ad $ad */
                    $ad = $ads->get($id);
                    $ad->timestamps = false;
                    $ad->forceFill([
                        'image_url' => json_encode([$path], JSON_UNESCAPED_SLASHES),
                        'generated_cover' => false,
                    ])->saveQuietly();
                }
            });

            $this->verifyAppliedState($mapping);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        $this->info('CATALOG_IMAGE_RECOVERY=PASS restored=' . count($mapping) . ' reference_rows=0');
        return self::SUCCESS;
    }

    /** @return array<int,string> */
    private function readMapping(string $mappingPath): array
    {
        $mappingPath = trim($mappingPath);
        if ($mappingPath === '' || ! is_file($mappingPath) || ! is_readable($mappingPath)) {
            throw new RuntimeException('A readable --mapping TSV file is required.');
        }

        $mapping = [];
        $handle = fopen($mappingPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Unable to open mapping file.');
        }

        try {
            $lineNumber = 0;
            while (($line = fgets($handle)) !== false) {
                $lineNumber++;
                $line = rtrim($line, "\r\n");
                if ($line === '') {
                    continue;
                }
                $parts = explode("\t", $line);
                if (count($parts) !== 2) {
                    throw new RuntimeException("Invalid mapping row {$lineNumber}; expected ad_id<TAB>path.");
                }
                [$rawId, $rawPath] = $parts;
                if (! ctype_digit($rawId) || (int) $rawId < 1) {
                    throw new RuntimeException("Invalid ad id on mapping row {$lineNumber}.");
                }
                $id = (int) $rawId;
                if (isset($mapping[$id])) {
                    throw new RuntimeException("Duplicate ad id {$id} in mapping.");
                }

                $path = ltrim(trim($rawPath), '/');
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                if (! str_starts_with($path, 'ads/')
                    || str_contains($path, '..')
                    || ! preg_match('#^[A-Za-z0-9._/\-]+$#', $path)
                    || ! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
                    throw new RuntimeException("Unsafe image path for ad {$id}: {$path}");
                }
                if (! Storage::disk('public')->exists($path)) {
                    throw new RuntimeException("Mapped image is missing on the public disk for ad {$id}: {$path}");
                }
                $mapping[$id] = $path;
            }
        } finally {
            fclose($handle);
        }

        if ($mapping === []) {
            throw new RuntimeException('Mapping file is empty.');
        }

        return $mapping;
    }

    private function validateCurrentState(array $mapping, bool $lock)
    {
        $query = Ad::query()->whereIn('id', array_keys($mapping));
        if ($lock) {
            $query->lockForUpdate();
        }
        $ads = $query->get(['id', 'status', 'is_catalog_filler', 'image_url', 'generated_cover'])->keyBy('id');
        if ($ads->count() !== count($mapping)) {
            throw new RuntimeException('Mapping does not match the current catalog row set.');
        }

        foreach ($mapping as $id => $_path) {
            /** @var Ad|null $ad */
            $ad = $ads->get($id);
            if (! $ad || ! $ad->is_catalog_filler || $ad->status !== 'active') {
                throw new RuntimeException("Ad {$id} is not an active catalog filler; refusing recovery.");
            }
            $images = json_decode((string) $ad->getRawOriginal('image_url'), true);
            $current = is_array($images) ? (string) ($images[0] ?? '') : '';
            $expected = 'ads/catalog/reference-' . $id . '.svg';
            if ($current !== $expected) {
                throw new RuntimeException("Ad {$id} changed since the recovery mapping was prepared; expected {$expected}, got {$current}.");
            }
        }

        return $ads;
    }

    private function verifyAppliedState(array $mapping): void
    {
        $ads = Ad::query()->whereIn('id', array_keys($mapping))
            ->get(['id', 'status', 'is_catalog_filler', 'image_url', 'generated_cover'])
            ->keyBy('id');

        if ($ads->count() !== count($mapping)) {
            throw new RuntimeException('Post-recovery row-count verification failed.');
        }

        foreach ($mapping as $id => $path) {
            /** @var Ad|null $ad */
            $ad = $ads->get($id);
            $images = $ad ? json_decode((string) $ad->getRawOriginal('image_url'), true) : null;
            $current = is_array($images) ? (string) ($images[0] ?? '') : '';
            if (! $ad || ! $ad->is_catalog_filler || $ad->status !== 'active' || $current !== $path || $ad->generated_cover) {
                throw new RuntimeException("Post-recovery verification failed for ad {$id}.");
            }
        }
    }
}

<?php

/**
 * eng12 evidence script: measure what the composited share previews actually are.
 *
 * Runs the real OgPreviewComposer over every input case (extremely tall, extremely
 * wide, exactly 1200x630, missing, corrupt) and prints, for each:
 *   - the dimensions read back OUT OF THE PRODUCED BYTES (not from the call);
 *   - the sha256 of the stored upload before and after generation;
 *   - the wall-clock cost of a cold render vs a warm cache hit.
 *
 * Writes only inside this worktree's storage/app. Never touches production.
 *
 * Usage: php scripts/og-preview-evidence.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ad;
use App\Services\OgPreviewComposer;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

$disk = Storage::disk('public');
$manager = ImageManager::usingDriver(Driver::class);
$composer = $app->make(OgPreviewComposer::class);

$targetAspect = 1200 / 630; // 1.9047619 - the cross-platform og:image crop

/** A photo with saturated left/right bands: a crop of either edge is detectable. */
function photoBytes(int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);
    $redWidth = (int) round($width * 0.3);
    imagefilledrectangle($image, 0, 0, $width, $height, imagecolorallocate($image, 240, 240, 240));
    imagefilledrectangle($image, 0, 0, $redWidth, $height, imagecolorallocate($image, 220, 20, 20));
    imagefilledrectangle($image, $width - $redWidth, 0, $width, $height, imagecolorallocate($image, 20, 20, 220));
    ob_start();
    imagejpeg($image, null, 92);
    $bytes = (string) ob_get_clean();
    imagedestroy($image);

    return $bytes;
}

/**
 * What a platform's 1.9048:1 centre crop would keep from this source.
 *
 * @return array{0:int,1:int,2:float,3:float,4:float}
 */
function platformCrop(int $width, int $height, float $targetAspect): array
{
    if ($width / $height > $targetAspect) {
        $visibleWidth = (int) round($height * $targetAspect);
        $visibleHeight = $height;
    } else {
        $visibleWidth = $width;
        $visibleHeight = (int) round($width / $targetAspect);
    }

    return [
        $visibleWidth,
        $visibleHeight,
        100 * $visibleWidth / $width,
        100 * $visibleHeight / $height,
        100 * ($visibleWidth * $visibleHeight) / ($width * $height),
    ];
}

function ad(int $id, ?string $imageUrl): Ad
{
    $model = new Ad([
        'title' => 'Evidencia OG',
        'price' => 1000,
        'category' => 'autos',
        'status' => 'active',
        'image_url' => $imageUrl === null ? null : json_encode([$imageUrl]),
    ]);
    $model->id = $id;
    $model->exists = true;

    return $model;
}

$cases = [
    ['extremely tall', 'ads/evidence/tall.jpg', 1200, 1800],
    ['extremely wide', 'ads/evidence/wide.jpg', 1600, 1067],
    ['exactly 1200x630', 'ads/evidence/exact.jpg', 1200, 630],
    ['very extreme portrait', 'ads/evidence/strip.jpg', 400, 2000],
];

foreach ($cases as [$label, $path, $width, $height]) {
    $disk->put($path, photoBytes($width, $height));
}

// --- 1. The defect, measured ------------------------------------------------
echo "=== 1. Current defect: what a platform crop keeps from the RAW og:image ===\n";
printf("platform crop frame: 1200x630 = %.4f:1\n\n", $targetAspect);
foreach ($cases as [$label, $path, $width, $height]) {
    [$vw, $vh, $wp, $hp, $ap] = platformCrop($width, $height, $targetAspect);
    printf(
        "  %-22s %4dx%-5d aspect %.3f -> visible %4dx%-4d  width %5.1f%%  height %5.1f%%  area %5.1f%%\n",
        $label,
        $width,
        $height,
        $width / $height,
        $vw,
        $vh,
        $wp,
        $hp,
        $ap
    );
}

// --- 2. The fix, measured from the produced bytes ---------------------------
echo "\n=== 2. Composited preview: dimensions read back from the produced bytes ===\n";
$outputDirectory = storage_path('app/evidence');
@mkdir($outputDirectory, 0775, true);

$missing = ad(9001, 'ads/evidence/not-here.jpg');
$disk->delete('ads/evidence/not-here.jpg');

$disk->put('ads/evidence/corrupt.jpg', 'this is not a jpeg at all');
$corrupt = ad(9002, 'ads/evidence/corrupt.jpg');

$noPhoto = ad(9003, null);

$rows = [];
foreach ($cases as $index => [$label, $path, $width, $height]) {
    $before = hash('sha256', (string) $disk->get($path));
    $start = microtime(true);
    $result = $composer->composeFor(ad(9100 + $index, $path));
    $coldMs = (microtime(true) - $start) * 1000;

    $start = microtime(true);
    $warm = $composer->composeFor(ad(9100 + $index, $path));
    $warmMs = (microtime(true) - $start) * 1000;

    $after = hash('sha256', (string) $disk->get($path));

    $info = getimagesizefromstring($result->jpeg);
    $file = $outputDirectory . '/preview-' . $index . '.jpg';
    file_put_contents($file, $result->jpeg);

    $rows[] = [
        'label' => $label,
        'source' => "{$width}x{$height}",
        'bytes_dims' => $info[0] . 'x' . $info[1],
        'mime' => $info['mime'],
        'size' => strlen($result->jpeg),
        'placed' => $result->photoRect
            ? sprintf('%dx%d at (%d,%d)', $result->photoRect['width'], $result->photoRect['height'], $result->photoRect['x'], $result->photoRect['y'])
            : 'n/a (branded card)',
        'visible' => $result->photoIsFullyVisible() ? 'YES (nothing cropped)' : 'NO',
        'aspect_kept' => $result->photoAspectPreserved() ? 'yes' : 'NO',
        'upload_unchanged' => $before === $after ? 'yes' : 'NO (' . substr($before, 0, 12) . ' -> ' . substr($after, 0, 12) . ')',
        'cold_ms' => $coldMs,
        'warm_ms' => $warmMs,
        'same_bytes' => $result->jpeg === $warm->jpeg ? 'yes' : 'no',
    ];
}

foreach ([['missing photo file', $missing], ['corrupt photo file', $corrupt], ['no photo at all', $noPhoto]] as [$label, $model]) {
    $result = $composer->composeFor($model);
    $info = getimagesizefromstring($result->jpeg);
    $file = $outputDirectory . '/preview-fallback-' . $result->variant . '-' . substr(sha1($label), 0, 6) . '.jpg';
    file_put_contents($file, $result->jpeg);

    $rows[] = [
        'label' => $label,
        'source' => '-',
        'bytes_dims' => $info[0] . 'x' . $info[1],
        'mime' => $info['mime'],
        'size' => strlen($result->jpeg),
        'placed' => 'n/a (branded card)',
        'visible' => 'n/a',
        'aspect_kept' => 'n/a',
        'upload_unchanged' => 'n/a',
        'cold_ms' => 0.0,
        'warm_ms' => 0.0,
        'same_bytes' => 'n/a',
    ];
}

printf(
    "%-22s %-11s %-11s %-6s %-8s %-22s %-6s %-7s %-9s %8s %8s\n",
    'case',
    'source',
    'BYTES dims',
    'mime',
    'bytes',
    'photo placed',
    'visib',
    'aspect',
    'warm=same',
    'cold ms',
    'warm ms'
);
foreach ($rows as $row) {
    printf(
        "%-22s %-11s %-11s %-6s %-8d %-22s %-6s %-7s %-9s %8.1f %8.2f\n",
        $row['label'],
        $row['source'],
        $row['bytes_dims'],
        str_replace('image/', '', $row['mime']),
        $row['size'],
        $row['placed'],
        $row['visible'] === 'YES (nothing cropped)' ? 'YES' : $row['visible'],
        $row['aspect_kept'],
        $row['same_bytes'],
        $row['cold_ms'],
        $row['warm_ms']
    );
}

// --- 3. Stored upload integrity --------------------------------------------
echo "\n=== 3. Stored upload integrity (sha256 before vs after) ===\n";
foreach ($cases as $index => [$label, $path, $width, $height]) {
    $dimensions = getimagesize($disk->path($path));
    printf(
        "  %-22s unchanged=%s   still %dx%d on disk   %s\n",
        $label,
        $rows[$index]['upload_unchanged'],
        $dimensions[0],
        $dimensions[1],
        $path
    );
}

echo "\n=== 4. Preview cache ===\n";
$cached = Storage::disk((string) config('og.cache.disk'))->files((string) config('og.cache.path'));
printf("  cached preview files : %d (bound: %d, ttl: %d days)\n", count($cached), config('og.cache.max_files'), config('og.cache.ttl_days'));
printf("  cache location       : %s disk -> %s\n", config('og.cache.disk'), config('og.cache.path'));

echo "\nProduced previews written to: {$outputDirectory}\n";

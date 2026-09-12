<?php
/**
 * eng12 evidence script: measure the real og:image crop loss on live listings.
 *
 * GET-only against production. Reads og:image URLs from the live /share/ads/{id}
 * cards, downloads the referenced photo bytes, and measures the true pixel
 * dimensions from those bytes (getimagesizefromstring), then reports how much of
 * the photo survives a 1200x630 (1.9048:1) social crop.
 *
 * Usage: php scripts/og-crop-measurement.php [sampleSize]
 */

$sampleSize = (int) ($argv[1] ?? 40);
$origin = getenv('MERCASTO_ORIGIN') ?: 'https://mercasto.com';
$targetAspect = 1200 / 630; // 1.9047619 — Facebook/X/LinkedIn og:image crop

/**
 * Polite GET: production is shared and rate-limited, so back off on 429 and
 * cache bodies on disk in /tmp. Re-runs then cost production nothing.
 */
function httpGet(string $url, int $timeout = 20, bool $cache = true): ?string
{
    $cacheFile = '/tmp/eng12-og-cache/' . sha1($url);
    if ($cache && is_file($cacheFile)) {
        return file_get_contents($cacheFile);
    }

    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_USERAGENT => 'MercastoOgCropAudit/1.0 (+https://mercasto.com)',
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body !== false && $code >= 200 && $code < 300) {
            if ($cache) {
                @mkdir(dirname($cacheFile), 0775, true);
                @file_put_contents($cacheFile, $body);
            }
            usleep(350000); // pacing: ~3 req/s ceiling
            return $body;
        }
        if ($code === 429) {
            $wait = 35 * $attempt;
            fwrite(STDERR, "429 rate limited; sleeping {$wait}s\n");
            sleep($wait);
            continue;
        }
        usleep(350000);
        return null;
    }
    return null;
}

// ---- 1. Collect live active ad ids from the public read-only API -------------
$ids = [];
$page = 1;
while (count($ids) < $sampleSize && $page <= 6) {
    $json = httpGet("$origin/api/ads?limit=20&page=$page");
    if ($json === null) {
        break;
    }
    $payload = json_decode($json, true);
    $rows = $payload['data'] ?? [];
    if (!$rows) {
        break;
    }
    foreach ($rows as $row) {
        if (isset($row['id'])) {
            $ids[] = (int) $row['id'];
        }
    }
    $page++;
}
$ids = array_slice(array_values(array_unique($ids)), 0, $sampleSize);
printf("Sampled %d live active ads from %s\n\n", count($ids), $origin);

// ---- 2. Walk each share card -> og:image -> real bytes -> real dimensions ----
$withImage = 0;
$withoutImage = 0;
$unreadable = 0;
$aspects = [];

foreach ($ids as $id) {
    $html = httpGet("$origin/share/ads/$id");
    if ($html === null) {
        continue;
    }
    if (!preg_match('/<meta property="og:image" content="([^"]+)"/i', $html, $m)) {
        continue;
    }
    $imageUrl = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5);

    // Fallback markers: the icon / the branded default card are not listing photos.
    $isFallback = (bool) preg_match('#icon-\d+x\d+\.png|og-default-#i', $imageUrl);
    $bytes = httpGet($imageUrl, 30);
    if ($bytes === null) {
        $unreadable++;
        continue;
    }
    $info = @getimagesizefromstring($bytes);
    if (!$info || !$info[0] || !$info[1]) {
        $unreadable++;
        continue;
    }
    if ($isFallback) {
        $withoutImage++;
        continue;
    }
    $withImage++;

    $w = (int) $info[0];
    $h = (int) $info[1];
    $aspect = $w / $h;

    // How a platform's 1.9048:1 center crop treats this photo.
    if ($aspect > $targetAspect) {
        // Wider than the frame -> full height kept, width trimmed.
        $visibleW = (int) round($h * $targetAspect);
        $visibleH = $h;
    } else {
        // Taller than the frame -> full width kept, height trimmed.
        $visibleW = $w;
        $visibleH = (int) round($w / $targetAspect);
    }
    $visibleWidthPct = 100 * $visibleW / $w;
    $visibleHeightPct = 100 * $visibleH / $h;
    $visibleAreaPct = 100 * ($visibleW * $visibleH) / ($w * $h);

    $key = $w . 'x' . $h;
    $aspects[$key] = ($aspects[$key] ?? 0) + 1;

    printf(
        "ad %-6d %-11s aspect %.3f -> visible %dx%d  width %5.1f%%  height %5.1f%%  area %5.1f%%\n",
        $id,
        $key,
        $aspect,
        $visibleW,
        $visibleH,
        $visibleWidthPct,
        $visibleHeightPct,
        $visibleAreaPct
    );
}

echo "\n=== Summary ===\n";
printf("ads with a real listing photo : %d\n", $withImage);
printf("ads serving a fallback asset   : %d\n", $withoutImage);
printf("images unreadable              : %d\n", $unreadable);
echo "distinct photo dimensions in live use:\n";
arsort($aspects);
foreach ($aspects as $dim => $n) {
    [$w, $h] = array_map('intval', explode('x', $dim));
    printf("  %-11s aspect %.3f  seen %dx\n", $dim, $w / $h, $n);
}
printf("\nplatform crop frame: 1200x630 = %.4f:1\n", $targetAspect);

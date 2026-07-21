<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

function imageEntries(mixed $value): array
{
    if (is_array($value)) {
        $entries = [];
        array_walk_recursive($value, static function ($item) use (&$entries): void {
            if (is_string($item) && trim($item) !== '') {
                $entries[] = trim($item);
            }
        });
        return array_values(array_unique($entries));
    }

    if (! is_string($value) || trim($value) === '') {
        return [];
    }

    $value = trim($value);
    $decoded = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && $decoded !== $value) {
        return imageEntries($decoded);
    }

    return [$value];
}

function classifyImage(string $entry): array
{
    $entry = trim($entry);
    if ($entry === '') {
        return ['type' => 'invalid', 'value' => $entry];
    }

    if (preg_match('#^data:image/#i', $entry)) {
        return ['type' => 'inline', 'value' => $entry];
    }

    if (preg_match('#^https?://#i', $entry)) {
        $parts = parse_url($entry);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $path = rawurldecode((string) ($parts['path'] ?? ''));
        if (in_array($host, ['mercasto.com', 'www.mercasto.com'], true)
            && str_starts_with($path, '/storage/')) {
            return ['type' => 'storage', 'value' => ltrim(substr($path, strlen('/storage/')), '/')];
        }
        return ['type' => 'remote', 'value' => $entry];
    }

    $path = preg_replace('~[?#].*$~', '', $entry) ?? $entry;
    $path = rawurldecode($path);
    if (str_starts_with($path, '/storage/')) {
        return ['type' => 'storage', 'value' => ltrim(substr($path, strlen('/storage/')), '/')];
    }
    if (str_starts_with($path, 'storage/')) {
        return ['type' => 'storage', 'value' => ltrim(substr($path, strlen('storage/')), '/')];
    }
    if (str_starts_with($path, '/')) {
        return ['type' => 'public', 'value' => ltrim($path, '/')];
    }

    return ['type' => 'storage', 'value' => ltrim($path, '/')];
}

function probeRemoteBatch(array $urls, bool $head): array
{
    $results = [];
    foreach (array_chunk($urls, 60) as $chunk) {
        $multi = curl_multi_init();
        $handles = [];

        foreach ($chunk as $url) {
            $handle = curl_init($url);
            $options = [
                CURLOPT_NOBODY => $head,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_USERAGENT => 'MercastoImageAudit/1.1',
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_RETURNTRANSFER => true,
            ];
            if (! $head) {
                $options[CURLOPT_RANGE] = '0-2047';
            }
            curl_setopt_array($handle, $options);
            curl_multi_add_handle($multi, $handle);
            $handles[(int) $handle] = [$handle, $url];
        }

        do {
            $status = curl_multi_exec($multi, $active);
            if ($active) {
                curl_multi_select($multi, 1.0);
            }
        } while ($active && $status === CURLM_OK);

        foreach ($handles as [$handle, $url]) {
            $http = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            $contentType = strtolower((string) curl_getinfo($handle, CURLINFO_CONTENT_TYPE));
            $downloaded = (float) curl_getinfo($handle, CURLINFO_SIZE_DOWNLOAD);
            $error = curl_error($handle);
            $ok = $http >= 200 && $http < 400 && ($head || $downloaded > 0 || $http === 204);
            $results[$url] = [
                'ok' => $ok,
                'method' => $head ? 'HEAD' : 'GET_RANGE',
                'http' => $http,
                'content_type' => $contentType,
                'downloaded_bytes' => $downloaded,
                'error' => $error,
            ];
            curl_multi_remove_handle($multi, $handle);
            curl_close($handle);
        }

        curl_multi_close($multi);
    }

    return $results;
}

function probeRemoteUrls(array $urls): array
{
    $headResults = probeRemoteBatch($urls, true);
    $retryUrls = array_keys(array_filter($headResults, static fn (array $result): bool => ! $result['ok']));
    if ($retryUrls === []) {
        return $headResults;
    }

    $getResults = probeRemoteBatch($retryUrls, false);
    foreach ($getResults as $url => $result) {
        $headResults[$url] = $result;
    }

    return $headResults;
}

$ads = DB::table('ads')
    ->select(['id', 'title', 'status', 'is_catalog_filler', 'generated_cover', 'image_url', 'user_id'])
    ->orderBy('id')
    ->get();

$records = [];
$remoteUrls = [];
$entryStats = [
    'storage_ok' => 0,
    'storage_missing' => 0,
    'public_ok' => 0,
    'public_missing' => 0,
    'remote' => 0,
    'inline' => 0,
    'invalid' => 0,
];

foreach ($ads as $ad) {
    $classified = [];
    foreach (imageEntries($ad->image_url) as $entry) {
        $item = classifyImage($entry);
        $item['original'] = $entry;

        if ($item['type'] === 'storage') {
            try {
                $item['ok'] = Storage::disk('public')->exists($item['value'])
                    && Storage::disk('public')->size($item['value']) > 0;
            } catch (Throwable $error) {
                $item['ok'] = false;
                $item['error'] = $error->getMessage();
            }
            $entryStats[$item['ok'] ? 'storage_ok' : 'storage_missing']++;
        } elseif ($item['type'] === 'public') {
            $fullPath = public_path($item['value']);
            $item['ok'] = is_file($fullPath) && filesize($fullPath) > 0;
            $entryStats[$item['ok'] ? 'public_ok' : 'public_missing']++;
        } elseif ($item['type'] === 'inline') {
            $item['ok'] = strlen($item['value']) > 64;
            $entryStats['inline']++;
        } elseif ($item['type'] === 'remote') {
            $item['ok'] = null;
            $remoteUrls[$item['value']] = true;
            $entryStats['remote']++;
        } else {
            $item['ok'] = false;
            $entryStats['invalid']++;
        }

        $classified[] = $item;
    }

    $records[(int) $ad->id] = [
        'id' => (int) $ad->id,
        'title' => $ad->title,
        'status' => (string) $ad->status,
        'user_id' => (int) $ad->user_id,
        'is_catalog_filler' => (bool) $ad->is_catalog_filler,
        'generated_cover' => (bool) $ad->generated_cover,
        'entries' => $classified,
    ];
}

$remoteResults = probeRemoteUrls(array_keys($remoteUrls));
foreach ($records as &$record) {
    foreach ($record['entries'] as &$entry) {
        if ($entry['type'] !== 'remote') {
            continue;
        }
        $probe = $remoteResults[$entry['value']] ?? [
            'ok' => false,
            'method' => 'NONE',
            'http' => 0,
            'error' => 'not_checked',
        ];
        $entry = array_merge($entry, $probe);
    }
    unset($entry);
}
unset($record);

$summary = [
    'total_ads' => count($records),
    'active_ads' => 0,
    'catalog_ads' => 0,
    'ads_with_usable_image' => 0,
    'ads_without_entries' => 0,
    'ads_all_images_broken' => 0,
    'ads_with_partially_broken_images' => 0,
    'active_without_usable_image' => 0,
    'catalog_without_usable_image' => 0,
    'generated_covers' => 0,
    'unique_remote_urls' => count($remoteResults),
    'remote_urls_ok' => count(array_filter($remoteResults, static fn (array $result): bool => $result['ok'])),
    'remote_urls_failed' => count(array_filter($remoteResults, static fn (array $result): bool => ! $result['ok'])),
];
$byStatus = [];
$issues = [];

foreach ($records as $record) {
    $status = $record['status'];
    $byStatus[$status] ??= ['total' => 0, 'without_usable_image' => 0, 'without_entries' => 0];
    $byStatus[$status]['total']++;

    if ($status === 'active') {
        $summary['active_ads']++;
    }
    if ($record['is_catalog_filler']) {
        $summary['catalog_ads']++;
    }
    if ($record['generated_cover']) {
        $summary['generated_covers']++;
    }

    $usable = count(array_filter($record['entries'], static fn (array $entry): bool => ($entry['ok'] ?? false) === true));
    $broken = count(array_filter($record['entries'], static fn (array $entry): bool => ($entry['ok'] ?? false) === false));
    $entryCount = count($record['entries']);

    if ($usable > 0) {
        $summary['ads_with_usable_image']++;
        if ($broken > 0) {
            $summary['ads_with_partially_broken_images']++;
            $issues[] = $record + ['issue' => 'partially_broken', 'usable_count' => $usable, 'broken_count' => $broken];
        }
        continue;
    }

    $byStatus[$status]['without_usable_image']++;
    if ($entryCount === 0) {
        $summary['ads_without_entries']++;
        $byStatus[$status]['without_entries']++;
        $issue = 'no_image_entries';
    } else {
        $summary['ads_all_images_broken']++;
        $issue = 'all_images_broken';
    }

    if ($status === 'active') {
        $summary['active_without_usable_image']++;
    }
    if ($record['is_catalog_filler']) {
        $summary['catalog_without_usable_image']++;
    }

    $issues[] = $record + ['issue' => $issue, 'usable_count' => 0, 'broken_count' => $broken];
}

ksort($byStatus);

$result = [
    'generated_at' => now()->toIso8601String(),
    'summary' => $summary,
    'entry_stats' => $entryStats,
    'by_status' => $byStatus,
    'issues' => $issues,
    'remote_failures' => array_filter($remoteResults, static fn (array $result): bool => ! $result['ok']),
];

echo json_encode(
    $result,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
), PHP_EOL;

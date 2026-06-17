<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ShareAdController extends Controller
{
    public function __invoke(int $id): Response
    {
        $ad = Ad::query()
            ->where('status', 'active')
            ->findOrFail($id);

        $title = Str::limit($ad->title ?: 'Anuncio en Mercasto', 80, '');
        $description = Str::limit(trim(strip_tags((string) $ad->description)) ?: 'Mira este anuncio en Mercasto, marketplace de clasificados para México.', 180, '');
        $canonicalUrl = url('/ads/' . $ad->id);
        $shareUrl = url('/share/ads/' . $ad->id);
        $imageUrl = $this->resolveImage($ad);
        $price = $ad->price ? '$' . number_format((float) $ad->price, 0, '.', ',') . ' MXN' : 'Precio en Mercasto';
        $pageTitle = e($title . ' | ' . $price . ' | Mercasto');
        $escapedDescription = e($description);
        $escapedImage = e($imageUrl);
        $escapedCanonical = e($canonicalUrl);
        $escapedShare = e($shareUrl);

        $html = <<<HTML
<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$pageTitle}</title>
  <meta name="description" content="{$escapedDescription}">
  <link rel="canonical" href="{$escapedCanonical}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Mercasto">
  <meta property="og:title" content="{$pageTitle}">
  <meta property="og:description" content="{$escapedDescription}">
  <meta property="og:url" content="{$escapedShare}">
  <meta property="og:image" content="{$escapedImage}">
  <meta property="og:locale" content="es_MX">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{$pageTitle}">
  <meta name="twitter:description" content="{$escapedDescription}">
  <meta name="twitter:image" content="{$escapedImage}">
  <meta http-equiv="refresh" content="0; url={$escapedCanonical}">
  <script>location.replace({$this->json($canonicalUrl)});</script>
</head>
<body>
  <main style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:32px;max-width:720px;margin:auto">
    <h1>{$pageTitle}</h1>
    <p>{$escapedDescription}</p>
    <p><a href="{$escapedCanonical}">Ver anuncio en Mercasto</a></p>
  </main>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function json(string $value): string
    {
        return json_encode($value, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
    }

    /**
     * image_url / image may be stored as a JSON array string, a full URL, or a
     * storage-relative path. Resolve to a single absolute image URL for og:image.
     */
    private function resolveImage(Ad $ad): string
    {
        $candidate = $this->firstImageCandidate($ad->image_url)
            ?? $this->firstImageCandidate($ad->image);

        if (!$candidate) {
            return url('/icon-512x512.png');
        }

        if (preg_match('#^https?://#i', $candidate)) {
            return $candidate;
        }

        $candidate = ltrim($candidate, '/');

        if (str_starts_with($candidate, 'storage/')) {
            return url('/' . $candidate);
        }

        return url('/storage/' . $candidate);
    }

    private function firstImageCandidate($raw): ?string
    {
        if (is_array($raw)) {
            $first = $raw[0] ?? null;
            return is_string($first) && $first !== '' ? trim($first) : null;
        }

        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }

        $trimmed = trim($raw);

        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded) && !empty($decoded) && is_string($decoded[0])) {
                return trim($decoded[0]);
            }
            return null;
        }

        return $trimmed;
    }
}

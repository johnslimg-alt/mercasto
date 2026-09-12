<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Crawler-readable share card for one listing.
 *
 * Shared links are built by src/utils/shareLinks.js as
 * `/share/ads/{id}?utm_source=…&utm_medium=…&utm_campaign=…&utm_content=…&utm_term=…`.
 * Crawlers (WhatsApp, Facebook, X, Telegram, email clients) never execute the SPA, so this
 * route must return the preview tags itself. Humans are then sent to the canonical listing
 * (`/ads/{id}`) with the attribution query string preserved so src/utils/campaignAttribution.js
 * can still attribute the visit.
 */
class ShareAdController extends Controller
{
    /**
     * Branded 1200x630 card used when a listing has no usable photo. Lives in the
     * frontend's public/ (shipped to the static document root by the Dockerfile) and
     * is the single source of truth for the served URL. Artwork and regeneration
     * steps: design/og/README.md.
     */
    private const DEFAULT_SHARE_IMAGE = 'og-default-1200x630.jpg';

    /**
     * Declared size of DEFAULT_SHARE_IMAGE. Constants rather than a runtime
     * getimagesize() call because the frontend's public/ directory is not present in
     * the backend container at runtime - only the file's known size is available here.
     *
     * This is not a guess: the asset is version-controlled, produced deterministically
     * from design/og/og-default-1200x630.svg, and ShareAdCardTest asserts that the
     * committed file really is this size. Replace the artwork at a different size and
     * update these two numbers in the same commit, or that test fails.
     */
    private const DEFAULT_SHARE_IMAGE_WIDTH = 1200;
    private const DEFAULT_SHARE_IMAGE_HEIGHT = 630;

    /**
     * Query parameters forwarded to the canonical listing. Exactly the attribution keys
     * campaignAttribution.js reads, so the redirect never reflects arbitrary query input.
     */
    private const FORWARDED_QUERY_PARAMS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
        'ttclid',
        'gclid',
        'msclkid',
    ];

    public function __invoke(Request $request, int $id): Response
    {
        $ad = Ad::query()
            ->where('status', 'active')
            ->findOrFail($id);

        $title = $this->summarize($this->localized($ad->title) ?: 'Anuncio en Mercasto', 80);
        $description = $this->summarize(
            trim(strip_tags($this->localized($ad->description))) ?: 'Mira este anuncio en Mercasto, marketplace de clasificados para México.',
            180,
        );
        $canonicalUrl = url('/ads/' . $ad->id);
        $redirectUrl = $canonicalUrl . $this->forwardedQueryString($request);
        $imageUrl = $this->resolveImage($ad);
        $imageSize = $this->resolveImageSize($imageUrl);
        $price = $ad->price ? '$' . number_format((float) $ad->price, 0, '.', ',') . ' MXN' : 'Precio en Mercasto';
        $pageTitle = e($title . ' | ' . $price . ' | Mercasto');
        $escapedDescription = e($description);
        $escapedImage = e($imageUrl);
        $escapedImageAlt = e($title);
        $escapedCanonical = e($canonicalUrl);
        $escapedRedirect = e($redirectUrl);
        $dimensionTags = $imageSize
            ? "\n  <meta property=\"og:image:width\" content=\"{$imageSize[0]}\">\n  <meta property=\"og:image:height\" content=\"{$imageSize[1]}\">"
            : '';

        $html = <<<HTML
<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$pageTitle}</title>
  <meta name="description" content="{$escapedDescription}">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="{$escapedCanonical}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Mercasto">
  <meta property="og:title" content="{$pageTitle}">
  <meta property="og:description" content="{$escapedDescription}">
  <meta property="og:url" content="{$escapedCanonical}">
  <meta property="og:image" content="{$escapedImage}">{$dimensionTags}
  <meta property="og:image:alt" content="{$escapedImageAlt}">
  <meta property="og:locale" content="es_MX">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{$pageTitle}">
  <meta name="twitter:description" content="{$escapedDescription}">
  <meta name="twitter:image" content="{$escapedImage}">
  <meta name="twitter:image:alt" content="{$escapedImageAlt}">
  <meta http-equiv="refresh" content="0; url={$escapedRedirect}">
  <script>location.replace({$this->json($redirectUrl)});</script>
</head>
<body>
  <main style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:32px;max-width:720px;margin:auto">
    <h1>{$pageTitle}</h1>
    <p>{$escapedDescription}</p>
    <p><a href="{$escapedRedirect}">Ver anuncio en Mercasto</a></p>
  </main>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Attribution query string for the canonical listing (empty string when absent),
     * so the redirect keeps `?utm_*` intact for real users.
     */
    private function forwardedQueryString(Request $request): string
    {
        $forwarded = [];

        foreach (self::FORWARDED_QUERY_PARAMS as $param) {
            $value = $request->query($param);
            if (is_string($value) && trim($value) !== '') {
                $forwarded[$param] = $value;
            }
        }

        return $forwarded === [] ? '' : '?' . http_build_query($forwarded, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Word-safe summary. The previous Str::limit() cut mid-word ("del desgaste diar").
     */
    private function summarize(string $text, int $limit): string
    {
        $normalized = trim((string) preg_replace('/\s+/u', ' ', $text));

        if ($normalized === '' || mb_strlen($normalized) <= $limit) {
            return $normalized;
        }

        $cut = mb_substr($normalized, 0, $limit);
        $lastSpace = mb_strrpos($cut, ' ');

        if ($lastSpace !== false && $lastSpace > (int) ($limit * 0.5)) {
            $cut = mb_substr($cut, 0, $lastSpace);
        }

        return rtrim($cut, " \t\n\r\0\x0B.,;:!?-") . '…';
    }

    private function json(string $value): string
    {
        return json_encode($value, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
    }

    /**
     * Dimensions of the image we actually serve, so og:image:width/height are only
     * emitted when they are real (never guessed). Remote/CDN images are skipped, and
     * only two path shapes are inspected (no traversal):
     *
     *   storage/...        an uploaded listing photo, measured from disk
     *   <default card>     the branded fallback, whose size is a known constant
     *
     * The path is compared against an allowlist rather than pattern-matched, so no
     * other public asset can have its size advertised as a preview size. That also
     * closes off the soft-404 trap: an unknown root path returns the SPA shell with
     * HTTP 200, which would otherwise look like a valid image to a naive check.
     *
     * @return array{0:int,1:int}|null
     */
    private function resolveImageSize(string $imageUrl): ?array
    {
        $path = parse_url($imageUrl, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return null;
        }

        $relative = ltrim($path, '/');

        if ($relative === '' || str_contains($relative, '..')) {
            return null;
        }

        // The bundled card ships with the static frontend, so the backend container
        // cannot stat it. Its size is asserted against the committed file by test.
        if ($relative === self::DEFAULT_SHARE_IMAGE) {
            return [self::DEFAULT_SHARE_IMAGE_WIDTH, self::DEFAULT_SHARE_IMAGE_HEIGHT];
        }

        if (! preg_match('#^storage/[A-Za-z0-9][A-Za-z0-9._/-]*$#', $relative)) {
            return null;
        }

        $absolute = public_path($relative);

        if (! is_file($absolute)) {
            return null;
        }

        $size = @getimagesize($absolute);

        if (! is_array($size) || empty($size[0]) || empty($size[1])) {
            return null;
        }

        return [(int) $size[0], (int) $size[1]];
    }

    /**
     * Some fields (title/description) may be stored as a multilingual object or a
     * JSON string like {"es":"...","en":"..."}. Return a plain localized string
     * (es preferred, then en, then any) so OG/meta never expose raw JSON.
     * Plain strings pass through unchanged.
     */
    private function localized($value): string
    {
        if (is_array($value)) {
            return $this->pickLocale($value);
        }
        if (! is_string($value) || $value === '') {
            return $value === null ? '' : (string) $value;
        }
        $trimmed = trim($value);
        if (str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return $this->pickLocale($decoded);
            }
        }
        return $value;
    }

    private function pickLocale(array $obj): string
    {
        foreach (['es', 'en'] as $key) {
            if (! empty($obj[$key]) && is_string($obj[$key])) {
                return $obj[$key];
            }
        }
        foreach ($obj as $v) {
            if (is_string($v) && trim($v) !== '') {
                return $v;
            }
        }
        return '';
    }

    /**
     * image_url / image may be stored as a JSON array string, a full URL, or a
     * storage-relative path. Resolve to a single absolute image URL for og:image.
     *
     * When the listing has no usable photo at all we fall back to the branded
     * 1200x630 share card, never to the square app icon: a 512x512 icon is below
     * every platform's large-preview minimum, so it renders as a small or
     * centre-cropped card. The dimensions of this file are reported truthfully
     * because it is listed in resolveImageSize().
     */
    private function resolveImage(Ad $ad): string
    {
        $candidate = $this->firstImageCandidate($ad->image_url)
            ?? $this->firstImageCandidate($ad->image);

        if (!$candidate) {
            return url('/' . self::DEFAULT_SHARE_IMAGE);
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

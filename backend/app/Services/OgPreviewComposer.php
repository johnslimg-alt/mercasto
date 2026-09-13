<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Format;
use Intervention\Image\Geometry\Factories\RectangleFactory;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;
use Intervention\Image\Interfaces\ImageManagerInterface;
use Intervention\Image\Typography\FontFactory;
use Throwable;

/**
 * Builds 1200x630 social share previews for listings.
 *
 * Why this exists: platforms crop og:image to ~1.905:1 before rendering a large
 * preview. Live listings use exactly two photo sizes - 1200x1800 (aspect 0.667)
 * and 1600x1067 (aspect 1.500) - and both are taller than that frame, so the
 * platform crop discards 65.0% and 21.3% of the photo height respectively. The
 * raw upload must NOT be padded or cropped to fix that: the same stored asset
 * feeds the ad detail page, where the portrait aspect is correct. So the preview
 * is composited here instead, and the upload is only ever read.
 *
 * Fill strategy (both inputs land fully visible):
 *  - the photo is scaled to fit a 1120x534 content box and centred, so nothing
 *    is cropped in either axis;
 *  - the letterbox area is filled with a blurred, darkened "cover" copy of the
 *    same photo at 45% opacity over the navy base, so the frame reads as a
 *    designed card rather than as broken padding.
 *  - a 0.667 portrait therefore renders 356x534 and a 1.500 landscape 759x506 -
 *    identical 534px (85% of frame height) on both, which keeps the feed grid
 *    visually consistent.
 *
 * Generation is on demand and cached on a private disk, bounded by
 * og.cache.max_files / og.cache.ttl_days.
 */
class OgPreviewComposer
{
    /** Bump to invalidate every cached preview after a geometry/style change. */
    public const CACHE_VERSION = 'v1';

    /** Same whitelist as ImageController: only formats GD can decode. */
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    private ?ImageManagerInterface $manager = null;

    /**
     * Absolute og:image URL for this listing, or null when this composer cannot
     * help and the caller must keep its current URL.
     *
     * The URL carries a `v` token derived from the source file's identity. The
     * path alone is stable for the life of a listing, so an edge cache that
     * already holds `/share/ads/{id}/og.jpg` (platforms and CDNs keep it for
     * days) would keep showing the previous product photo after the seller
     * replaces it. A changed token is a different URL, so the stale entry is
     * never consulted. The token is advisory: the controller always renders the
     * current photo and ignores it.
     *
     * Null is returned only for a photo hosted outside Mercasto: proxying a
     * third-party host from a crawler-facing endpoint would add an unbounded
     * external fetch to the request path. Every listing sampled in production
     * stores a storage-relative path, so this is an edge case.
     */
    public function urlFor(Ad $ad): ?string
    {
        if (! $this->canCompose($ad)) {
            return null;
        }

        return route('share.og-image', ['id' => $ad->id, 'v' => $this->versionToken($ad)]);
    }

    /**
     * Short token that changes whenever the listing photo changes. `brand` when
     * there is no readable local photo, because the branded card is deterministic
     * for every such listing.
     */
    public function versionToken(Ad $ad): string
    {
        $relative = $this->sourceRelativePath($ad);
        if ($relative === null) {
            return 'brand';
        }

        $source = $this->sourceAbsolutePath($relative);
        if ($source === null) {
            return 'brand';
        }

        return substr(sha1(implode('|', [
            $relative,
            (string) @filesize($source),
            (string) @filemtime($source),
        ])), 0, 12);
    }

    /**
     * True when the listing's first photo is a locally readable file. Listings
     * without a usable photo still get a valid 1200x630 branded card, so they
     * are composable too; only a foreign-hosted photo is not.
     */
    public function canCompose(Ad $ad): bool
    {
        $candidate = $this->firstImageCandidate($ad->image_url)
            ?? $this->firstImageCandidate($ad->image);

        if ($candidate === null) {
            return true; // no photo at all -> branded card
        }

        if (preg_match('#^https?://#i', $candidate) === 1) {
            return $this->isSameHost($candidate);
        }

        return true;
    }

    /**
     * Cache-first preview for a listing. Falls back to the branded card when the
     * listing has no photo, or when its photo is missing/corrupt on disk.
     *
     * @throws Throwable only if even the branded card cannot be produced.
     */
    public function composeFor(Ad $ad): OgPreviewResult
    {
        $relative = $this->sourceRelativePath($ad);
        if ($relative === null) {
            return $this->cachedBrandCard();
        }

        $source = $this->sourceAbsolutePath($relative);
        if ($source === null) {
            return $this->cachedBrandCard();
        }

        // Header-only read: cheap, and false for missing or corrupt files.
        $dimensions = @getimagesize($source);
        if ($dimensions === false || (int) $dimensions[0] < 1 || (int) $dimensions[1] < 1) {
            return $this->cachedBrandCard();
        }

        $sourceWidth = (int) $dimensions[0];
        $sourceHeight = (int) $dimensions[1];
        $plan = $this->planForSource($sourceWidth, $sourceHeight);

        $cachePath = $this->cachePath($ad, $relative, $source);
        if ($cachePath !== null && $this->cacheDisk()->exists($cachePath)) {
            $cached = (string) $this->cacheDisk()->get($cachePath);
            if ($this->isValidPreview($cached)) {
                return $this->photoResult($cached, $relative, $sourceWidth, $sourceHeight, $plan);
            }
            // Truncated or stale-dimension entry: rebuild rather than serve it.
            $this->cacheDisk()->delete($cachePath);
        }

        $bytes = $this->renderPhoto($source, $plan);

        if ($cachePath !== null) {
            $this->cacheDisk()->put($cachePath, $bytes);
            $this->pruneIfOversized();
        }

        return $this->photoResult($bytes, $relative, $sourceWidth, $sourceHeight, $plan);
    }

    /**
     * Branded, photo-less 1200x630 card, served from the private cache when
     * possible. Without this, every crawler hit on a listing that has no photo -
     * or whose referenced file is missing - would re-encode the same card with
     * GD on each request.
     */
    public function cachedBrandCard(): OgPreviewResult
    {
        $cachePath = $this->brandCachePath();

        if ($cachePath !== null && $this->cacheDisk()->exists($cachePath)) {
            $cached = (string) $this->cacheDisk()->get($cachePath);
            $cacheMime = self::detectMime($cached);
            if ($cacheMime !== null && $this->isValidPreview($cached)) {
                return OgPreviewResult::brand($cached, $this->frameWidth(), $this->frameHeight(), $cacheMime);
            }
            $this->cacheDisk()->delete($cachePath);
        }

        $result = $this->brandCard();

        if ($cachePath !== null) {
            $this->cacheDisk()->put($cachePath, $result->bytes);
            $this->pruneIfOversized();
        }

        return $result;
    }

    /**
     * Branded, photo-less 1200x630 card. Prefers a statically deployed card when
     * the backend can read it and it is genuinely the frame size, otherwise
     * composes an equivalent one.
     */
    public function brandCard(): OgPreviewResult
    {
        $static = $this->staticBrandCard();
        if ($static !== null) {
            return $static;
        }

        $width = $this->frameWidth();
        $height = $this->frameHeight();

        $canvas = $this->manager()->createImage($width, $height)->fill($this->color('base'));
        $this->drawBrandFrame($canvas);
        $this->drawText(
            $canvas,
            (string) config('og.preview.tagline', ''),
            $this->sidePadding(),
            (int) round($height * 0.5),
            (float) config('og.preview.tagline_size', 20) * 1.6,
            $this->color('muted')
        );

        return OgPreviewResult::brand(
            (string) $canvas->encodeUsingFormat(Format::JPEG, quality: $this->quality()),
            $width,
            $height
        );
    }

    /**
     * Storage-relative path of the listing's first photo, or null when there is
     * none or it is not a locally readable storage path.
     */
    public function sourceRelativePath(Ad $ad): ?string
    {
        $candidate = $this->firstImageCandidate($ad->image_url)
            ?? $this->firstImageCandidate($ad->image);

        if ($candidate === null) {
            return null;
        }

        if (preg_match('#^https?://#i', $candidate) === 1) {
            if (! $this->isSameHost($candidate)) {
                return null;
            }
            $candidate = (string) parse_url($candidate, PHP_URL_PATH);
        }

        $candidate = (string) preg_replace('~[?#].*$~', '', $candidate);
        $candidate = ltrim(rawurldecode($candidate), '/');

        if (str_starts_with($candidate, 'storage/')) {
            $candidate = substr($candidate, strlen('storage/'));
        }

        if ($candidate === '' || str_contains($candidate, '..')) {
            return null;
        }

        // Same character whitelist as ImageController: no traversal, no scheme.
        if (preg_match('#^[A-Za-z0-9._/\-]+$#', $candidate) !== 1) {
            return null;
        }

        $extension = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));
        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return null;
        }

        return $candidate;
    }

    /**
     * Cache path for a listing preview, fingerprinted on the source file so a
     * re-photographed listing regenerates instead of serving a stale card.
     */
    public function cachePath(Ad $ad, string $relative, string $source): ?string
    {
        $directory = trim((string) config('og.cache.path', 'og-previews'), '/');
        if ($directory === '') {
            return null;
        }

        $fingerprint = sha1(implode('|', [
            self::CACHE_VERSION,
            $relative,
            (string) @filesize($source),
            (string) @filemtime($source),
            (string) $this->frameWidth(),
            (string) $this->frameHeight(),
            (string) $this->quality(),
        ]));

        return $directory . '/ad-' . $ad->id . '-' . $fingerprint . '.jpg';
    }

    /**
     * Cache path for the branded, photo-less card. Deliberately extension-less:
     * the payload may be a statically deployed JPEG or PNG, so the name must be
     * derivable from the inputs alone while the MIME is detected from the bytes.
     */
    public function brandCachePath(): ?string
    {
        $directory = trim((string) config('og.cache.path', 'og-previews'), '/');
        if ($directory === '') {
            return null;
        }

        $fingerprint = sha1(implode('|', [
            self::CACHE_VERSION,
            'brand',
            (string) $this->frameWidth(),
            (string) $this->frameHeight(),
            (string) $this->quality(),
            implode(',', $this->staticCardCandidates()),
            // Identity of the deployed card, so replacing it at the same path
            // regenerates instead of serving the previous artwork.
            $this->staticCardIdentity(),
        ]));

        return $directory . '/brand-' . $fingerprint;
    }

    /**
     * size:mtime of the first readable static card, or 'composed' when the card
     * is generated in-service.
     */
    private function staticCardIdentity(): string
    {
        foreach ($this->staticCardCandidates() as $path) {
            if (is_file($path)) {
                return $path . ':' . (string) @filesize($path) . ':' . (string) @filemtime($path);
            }
        }

        return 'composed';
    }

    /**
     * Enforce the cache bound: drop expired entries, then the oldest entries
     * beyond og.cache.max_files. Returns the number of files deleted.
     */
    public function pruneCache(): int
    {
        $disk = $this->cacheDisk();
        $directory = trim((string) config('og.cache.path', 'og-previews'), '/');
        $ttl = max(0, (int) config('og.cache.ttl_days', 45)) * 86400;
        $max = max(0, (int) config('og.cache.max_files', 1200));
        $now = time();
        $deleted = 0;
        $kept = [];

        foreach ($disk->files($directory) as $file) {
            $modified = (int) $disk->lastModified($file);

            if ($ttl > 0 && $modified > 0 && ($now - $modified) > $ttl) {
                $disk->delete($file);
                $deleted++;
                continue;
            }

            $kept[] = ['path' => $file, 'modified' => $modified];
        }

        if ($max > 0 && count($kept) > $max) {
            usort($kept, static fn (array $a, array $b): int => $a['modified'] <=> $b['modified']);

            foreach (array_slice($kept, 0, count($kept) - $max) as $entry) {
                $disk->delete($entry['path']);
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Cheap guard on the write path: one directory listing, and the full
     * TTL+trim prune only once the directory is actually over its bound.
     */
    private function pruneIfOversized(): void
    {
        $max = max(0, (int) config('og.cache.max_files', 1200));
        if ($max === 0) {
            return;
        }

        $directory = trim((string) config('og.cache.path', 'og-previews'), '/');
        if (count($this->cacheDisk()->files($directory)) > $max) {
            $this->pruneCache();
        }
    }

    /**
     * Containment math: scale the photo to fit the content box and centre it.
     * Both axes are bounded, so no pixel of the product is ever cut off.
     *
     * @return array{x:int,y:int,width:int,height:int,scale:float}
     */
    private function planForSource(int $sourceWidth, int $sourceHeight): array
    {
        $box = $this->contentBox();
        $scale = min($box['width'] / $sourceWidth, $box['height'] / $sourceHeight);
        $width = max(1, (int) round($sourceWidth * $scale));
        $height = max(1, (int) round($sourceHeight * $scale));

        return [
            'x' => $box['x'] + (int) round(($box['width'] - $width) / 2),
            'y' => $box['y'] + (int) round(($box['height'] - $height) / 2),
            'width' => $width,
            'height' => $height,
            'scale' => $scale,
        ];
    }

    /**
     * @param  array{x:int,y:int,width:int,height:int,scale:float}  $plan
     */
    private function renderPhoto(string $source, array $plan): string
    {
        $binary = (string) file_get_contents($source);
        $manager = $this->manager();
        $width = $this->frameWidth();
        $height = $this->frameHeight();

        $canvas = $manager->createImage($width, $height)->fill($this->color('base'));

        // Backdrop: blurred proxy -> upscale, so the gaussian cost stays flat
        // instead of scaling with the frame area and blur level.
        $proxyWidth = max(24, min($width, (int) config('og.preview.backdrop_proxy_width', 120)));
        $proxyHeight = max(1, (int) round($proxyWidth * $height / $width));
        $backdrop = $manager->decodeBinary($binary)
            ->cover($proxyWidth, $proxyHeight)
            ->blur(max(0, (int) config('og.preview.backdrop_blur', 8)))
            ->brightness((int) config('og.preview.backdrop_brightness', -18))
            ->cover($width, $height);

        $canvas->insert($backdrop, 0, 0, 'top-left', (float) config('og.preview.backdrop_opacity', 0.45));

        // Foreground: the whole photo, scaled to fit and centred.
        $foreground = $manager->decodeBinary($binary)->resize($plan['width'], $plan['height']);
        $canvas->insert($foreground, $plan['x'], $plan['y'], 'top-left');

        $canvas->drawRectangle(fn (RectangleFactory $rectangle) => $rectangle
            ->at($plan['x'] - 1, $plan['y'] - 1)
            ->size($plan['width'] + 2, $plan['height'] + 2)
            ->border($this->color('keyline'), 1));

        $this->drawBrandFrame($canvas);

        return (string) $canvas->encodeUsingFormat(Format::JPEG, quality: $this->quality());
    }

    /**
     * The shared branded frame: full-bleed lime rail on top, opaque brand bar
     * with the wordmark along the bottom. Drawn on every card - photo or
     * fallback - so a shared listing always carries the brand.
     */
    private function drawBrandFrame(ImageInterface $canvas): void
    {
        $width = $this->frameWidth();
        $height = $this->frameHeight();
        $rail = max(0, (int) config('og.preview.top_rail', 8));
        $bar = $this->bottomBar();

        if ($rail > 0) {
            $canvas->drawRectangle(fn (RectangleFactory $rectangle) => $rectangle
                ->at(0, 0)
                ->size($width, $rail)
                ->background($this->color('rail')));
        }

        $canvas->drawRectangle(fn (RectangleFactory $rectangle) => $rectangle
            ->at(0, $height - $bar)
            ->size($width, $bar)
            ->background($this->color('bar')));

        if ($rail > 0) {
            $canvas->drawRectangle(fn (RectangleFactory $rectangle) => $rectangle
                ->at(0, $height - $bar)
                ->size($width, 3)
                ->background($this->color('rail')));
        }

        $this->drawText(
            $canvas,
            (string) config('og.preview.wordmark', 'mercasto'),
            $this->sidePadding(),
            $height - $bar + 42,
            (float) config('og.preview.wordmark_size', 30),
            $this->color('text')
        );
    }

    /**
     * Text is decoration: a missing or unreadable font must never break a share
     * preview, so failures are swallowed.
     */
    private function drawText(
        ImageInterface $canvas,
        string $text,
        int $x,
        int $y,
        float $size,
        string $color
    ): void {
        $font = $this->fontPath();
        if ($text === '' || $font === null) {
            return;
        }

        try {
            $canvas->text($text, $x, $y, function (FontFactory $fontFactory) use ($font, $size, $color): void {
                $fontFactory->file($font);
                $fontFactory->size($size);
                $fontFactory->color($color);
            });
        } catch (Throwable) {
            // Missing glyphs or an unsupported font must not fail the preview.
        }
    }

    /**
     * A statically deployed branded card, when the backend process can actually
     * read one.
     *
     * Deployment reality (verified, not assumed): Laravel's `public_path()` is
     * the BACKEND document root (`backend/public` in the repo, `/var/www/public`
     * in the container, mounted read-only from `./backend`). The Designer's card
     * added by PR #1143 lands in the *frontend* `public/` directory, which is
     * baked into the separate nginx image and is NOT on the backend filesystem -
     * so this probe will not find it in production. The in-service composed card
     * is therefore the effective fallback, and an operator who wants the
     * designed card read by the backend must place it under `backend/public/`
     * or point `og.preview.static_card` at it. Nothing is duplicated into the
     * repo for this.
     */
    public function staticBrandCard(): ?OgPreviewResult
    {
        foreach ($this->staticCardCandidates() as $path) {
            if (! is_file($path)) {
                continue;
            }

            $bytes = @file_get_contents($path);
            if (! is_string($bytes)) {
                continue;
            }

            $mime = self::detectMime($bytes);
            $dimensions = @getimagesizefromstring($bytes);
            if ($mime === null || $dimensions === false) {
                continue;
            }

            if ((int) $dimensions[0] === $this->frameWidth() && (int) $dimensions[1] === $this->frameHeight()) {
                return OgPreviewResult::brand($bytes, $this->frameWidth(), $this->frameHeight(), $mime);
            }
        }

        return null;
    }

    /**
     * Paths a statically deployed card may live at, most specific first.
     *
     * @return list<string>
     */
    public function staticCardCandidates(): array
    {
        $configured = config('og.preview.static_card');

        return array_values(array_filter(array_merge(
            is_string($configured) && $configured !== ''
                ? [str_starts_with($configured, '/') ? $configured : public_path($configured)]
                : [],
            [
                public_path('og-default-1200x630.jpg'),
                public_path('og-default-1200x630.png'),
            ],
        )));
    }

    /**
     * MIME type of an image payload, or null when it is not a decodable image.
     * Read from the bytes so a payload is never mislabelled: responses carry
     * `X-Content-Type-Options: nosniff`.
     */
    public static function detectMime(string $bytes): ?string
    {
        $dimensions = @getimagesizefromstring($bytes);

        if ($dimensions === false || ! is_string($dimensions['mime'] ?? null)) {
            return null;
        }

        return $dimensions['mime'];
    }

    private function photoResult(
        string $bytes,
        string $relative,
        int $sourceWidth,
        int $sourceHeight,
        array $plan
    ): OgPreviewResult {
        return OgPreviewResult::photo(
            bytes: $bytes,
            sourcePath: $relative,
            sourceWidth: $sourceWidth,
            sourceHeight: $sourceHeight,
            photoRect: [
                'x' => $plan['x'],
                'y' => $plan['y'],
                'width' => $plan['width'],
                'height' => $plan['height'],
            ],
            contentBox: $this->contentBox(),
            width: $this->frameWidth(),
            height: $this->frameHeight(),
        );
    }

    /**
     * Bytes must decode as a real image at exactly the frame size, otherwise a
     * crawler would cache a broken card.
     */
    private function isValidPreview(string $bytes): bool
    {
        $dimensions = @getimagesizefromstring($bytes);
        if ($dimensions === false) {
            return false;
        }

        return (int) $dimensions[0] === $this->frameWidth()
            && (int) $dimensions[1] === $this->frameHeight();
    }

    /**
     * @return array{x:int,y:int,width:int,height:int}
     */
    private function contentBox(): array
    {
        $side = $this->sidePadding();
        $top = $this->frameTopPadding();
        $width = max(1, $this->frameWidth() - 2 * $side);
        $height = max(1, $this->frameHeight() - $top - $this->bottomBar() - $this->verticalPadding());

        return ['x' => $side, 'y' => $top, 'width' => $width, 'height' => $height];
    }

    /**
     * Absolute filesystem path of a storage-relative listing photo, or null when
     * it is not readable. Public so the controller's last-resort path can serve
     * the untouched original without re-resolving it.
     */
    public function sourceAbsolutePath(string $relative): ?string
    {
        $disk = Storage::disk('public');
        try {
            if ($disk->exists($relative)) {
                return $disk->path($relative);
            }
        } catch (Throwable) {
            // fall through to the public path probe
        }

        $public = public_path($relative);

        return is_file($public) ? $public : null;
    }

    private function isSameHost(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        $candidates = [strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST))];
        if (function_exists('request') && app()->bound('request')) {
            $candidates[] = strtolower((string) request()->getHost());
        }

        return in_array($host, array_filter($candidates), true);
    }

    /**
     * image_url / image may be a JSON array string, an array, a full URL or a
     * storage-relative path. Only the first entry is used for the preview.
     */
    private function firstImageCandidate(mixed $raw): ?string
    {
        if (is_array($raw)) {
            $first = $raw[0] ?? null;

            return is_string($first) && trim($first) !== '' ? trim($first) : null;
        }

        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $trimmed = trim($raw);

        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded) && isset($decoded[0]) && is_string($decoded[0])) {
                return trim($decoded[0]) !== '' ? trim($decoded[0]) : null;
            }

            return null;
        }

        return $trimmed;
    }

    private function manager(): ImageManagerInterface
    {
        return $this->manager ??= ImageManager::usingDriver(Driver::class);
    }

    private function cacheDisk(): \Illuminate\Contracts\Filesystem\Filesystem
    {
        return Storage::disk((string) config('og.cache.disk', 'local'));
    }

    private function fontPath(): ?string
    {
        $configured = config('og.preview.font');
        if (is_string($configured) && $configured !== '' && is_file($configured)) {
            return $configured;
        }

        // Ships with dompdf, which is already a production dependency.
        $bundled = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans-Bold.ttf');

        return is_file($bundled) ? $bundled : null;
    }

    private function frameWidth(): int
    {
        return max(1, (int) config('og.preview.width', 1200));
    }

    private function frameHeight(): int
    {
        return max(1, (int) config('og.preview.height', 630));
    }

    private function quality(): int
    {
        return max(1, min(100, (int) config('og.preview.quality', 82)));
    }

    private function sidePadding(): int
    {
        return max(0, (int) config('og.preview.side_padding', 40));
    }

    private function verticalPadding(): int
    {
        return max(0, (int) config('og.preview.vertical_padding', 24));
    }

    private function frameTopPadding(): int
    {
        return max(0, (int) config('og.preview.top_rail', 8)) + $this->verticalPadding();
    }

    private function bottomBar(): int
    {
        return max(0, (int) config('og.preview.bottom_bar', 64));
    }

    private function color(string $key): string
    {
        return (string) config('og.preview.colors.' . $key, '#0F172A');
    }
}

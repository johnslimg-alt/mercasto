<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

/**
 * On-the-fly thumbnail endpoint: GET /api/img?path=<storage-relative>&w=<width>
 *
 * Serves a width-constrained WebP version of an image stored on the public disk.
 * Used by list/card thumbnails (see src/utils/imageHelpers.js -> sizedImage) so the
 * homepage no longer ships full-resolution uploads. Detail pages keep originals.
 *
 * Safety:
 *  - strict path whitelist (no traversal, only files under storage/app/public);
 *  - only jpg/png/webp sources;
 *  - width clamped 80..1280;
 *  - generated thumbs are cached on disk (cache/thumbs/) and reused;
 *  - on ANY processing failure it falls back to the original bytes — never breaks
 *    the image on the page.
 */
class ImageController extends Controller
{
    private const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];

    public function __invoke(Request $request)
    {
        $path = ltrim((string) $request->query('path', ''), '/');
        $w = (int) $request->query('w', 520);
        $w = max(80, min(1280, $w));

        if ($path === '' || str_contains($path, '..') || ! preg_match('#^[A-Za-z0-9._/\-]+$#', $path)) {
            abort(404);
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($ext, self::ALLOWED_EXT, true)) {
            abort(404);
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            abort(404);
        }

        $cacheKey = 'cache/thumbs/' . sha1($path . '|' . $w) . '.webp';

        if (! $disk->exists($cacheKey)) {
            try {
                $img = ImageManager::usingDriver(Driver::class)->read($disk->path($path));
                $img->scaleDown(width: $w);
                $disk->put($cacheKey, (string) $img->encodeUsingFileExtension('webp', quality: 60));
            } catch (\Throwable $e) {
                // Never break the image: serve the original on failure.
                return response($disk->get($path), 200, [
                    'Content-Type' => $disk->mimeType($path) ?: 'image/jpeg',
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
        }

        return response($disk->get($cacheKey), 200, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}

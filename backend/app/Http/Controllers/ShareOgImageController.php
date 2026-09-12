<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use App\Services\OgPreviewComposer;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

/**
 * Serves the composited 1200x630 social preview for a listing: GET /share/ads/{id}/og.jpg
 *
 * This is the URL handed to crawlers as og:image. It is deliberately its own
 * route and controller so it never touches the share-card HTML owned by PR #1138;
 * wiring it in is a one-line change in ShareAdController (see the PR body).
 *
 * Crawler safety:
 *  - a 304 with an ETag is returned when nothing changed, so re-crawls are cheap;
 *  - a missing ad is a 404, but a present ad ALWAYS returns a usable image - a
 *    broken or absent photo degrades to the branded card, never to a 5xx, so a
 *    platform cannot cache an error page as a preview;
 *  - only local files are read: no network fetch sits in the request path.
 */
class ShareOgImageController extends Controller
{
    public function __construct(private readonly OgPreviewComposer $composer)
    {
    }

    public function __invoke(Request $request, int $id): Response
    {
        $ad = Ad::query()
            ->where('status', 'active')
            ->find($id);

        if ($ad === null) {
            abort(404);
        }

        $preview = $this->previewFor($ad);
        $etag = '"' . sha1($preview['bytes']) . '"';

        if ($this->etagMatches($request, $etag)) {
            return response('', 304, [
                'Cache-Control' => (string) config('og.cache_control'),
                'ETag' => $etag,
            ]);
        }

        return response($preview['bytes'], 200, [
            'Content-Type' => $preview['content_type'],
            'Content-Length' => (string) strlen($preview['bytes']),
            'Cache-Control' => (string) config('og.cache_control'),
            'ETag' => $etag,
            'Last-Modified' => gmdate('D, d M Y H:i:s', $ad->updated_at?->getTimestamp() ?: time()) . ' GMT',
            // The image URL should never compete with the listing itself in search.
            'X-Robots-Tag' => 'noindex, max-image-preview:large',
            'X-Og-Preview-Variant' => $preview['variant'],
        ]);
    }

    /**
     * Degradation chain. Any failure returns a usable image rather than an error,
     * because platforms cache whatever they get on the first fetch.
     *
     * The content type always comes from the payload's own bytes, never from an
     * assumption: these responses carry `X-Content-Type-Options: nosniff`, so a
     * mislabelled payload is rejected by the client rather than sniffed.
     *
     * @return array{bytes:string, variant:string, content_type:string}
     */
    private function previewFor(Ad $ad): array
    {
        try {
            $result = $this->composer->composeFor($ad);

            return [
                'bytes' => $result->bytes,
                'variant' => $result->variant,
                'content_type' => $result->mimeType,
            ];
        } catch (Throwable $exception) {
            report($exception);
        }

        try {
            $result = $this->composer->brandCard();

            return [
                'bytes' => $result->bytes,
                'variant' => 'brand',
                'content_type' => $result->mimeType,
            ];
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->lastResort($ad);
    }

    /**
     * GD/Intervention unavailable - the one scenario where nothing can be drawn.
     *
     * First choice is the stored photo, served byte-for-byte untouched. That needs
     * no image extension at all and is exactly what this endpoint replaced, so a
     * listing with a real photo still gets a usable (if uncropped-by-us) preview
     * instead of a 404 that a platform would cache as "no image".
     *
     * A statically deployed branded card is preferred next, but only from a path
     * the backend can actually read: the Designer's card lives in the frontend
     * image, not on the backend filesystem, so it is not normally present here.
     *
     * @return array{bytes:string, variant:string, content_type:string}
     */
    private function lastResort(Ad $ad): array
    {
        $relative = $this->composer->sourceRelativePath($ad);

        if ($relative !== null) {
            $path = $this->composer->sourceAbsolutePath($relative);
            $bytes = $path !== null ? @file_get_contents($path) : false;
            $mime = is_string($bytes) ? OgPreviewComposer::detectMime($bytes) : null;

            if (is_string($bytes) && $mime !== null) {
                return [
                    'bytes' => $bytes,
                    'variant' => 'original',
                    'content_type' => $mime,
                ];
            }
        }

        $static = $this->composer->staticBrandCard();

        if ($static !== null) {
            return [
                'bytes' => $static->bytes,
                'variant' => 'static',
                'content_type' => $static->mimeType,
            ];
        }

        // Nothing readable remains: no photo, and no card deployed where the
        // backend can read it. A 404 is honest here - there is no image to serve.
        abort(404);
    }

    private function etagMatches(Request $request, string $etag): bool
    {
        $header = trim((string) $request->headers->get('If-None-Match', ''));
        if ($header === '') {
            return false;
        }

        if ($header === '*') {
            return true;
        }

        foreach (explode(',', $header) as $candidate) {
            if (trim($candidate) === $etag) {
                return true;
            }
        }

        return false;
    }
}

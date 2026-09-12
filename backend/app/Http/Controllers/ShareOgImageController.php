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
     * @return array{bytes:string, variant:string, content_type:string}
     */
    private function previewFor(Ad $ad): array
    {
        try {
            $result = $this->composer->composeFor($ad);

            return [
                'bytes' => $result->jpeg,
                'variant' => $result->variant,
                'content_type' => 'image/jpeg',
            ];
        } catch (Throwable $exception) {
            report($exception);
        }

        try {
            $result = $this->composer->brandCard();

            return [
                'bytes' => $result->jpeg,
                'variant' => 'brand',
                'content_type' => 'image/jpeg',
            ];
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->lastResort();
    }

    /**
     * GD/Intervention unavailable: fall back to a static branded asset, then to
     * the legacy icon, so og:image is never an HTTP error.
     *
     * @return array{bytes:string, variant:string, content_type:string}
     */
    private function lastResort(): array
    {
        foreach ([
            'og-default-1200x630.jpg' => 'image/jpeg',
            'og-default-1200x630.png' => 'image/png',
            'icon-512x512.png' => 'image/png',
        ] as $name => $contentType) {
            $path = public_path($name);
            if (is_file($path)) {
                return [
                    'bytes' => (string) file_get_contents($path),
                    'variant' => 'static',
                    'content_type' => $contentType,
                ];
            }
        }

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

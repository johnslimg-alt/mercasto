<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RejectUnsafeXmlUpload
{
    private const SCAN_CHUNK_BYTES = 8192;

    private const OVERLAP_BYTES = 32;

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is('api/ads/bulk-upload') || ! $request->hasFile('file')) {
            return $next($request);
        }

        $file = $request->file('file');
        if ($file === null || strtolower($file->getClientOriginalExtension()) !== 'xml') {
            return $next($request);
        }

        $path = $file->getRealPath();
        if ($path === false || $this->containsUnsafeDeclaration($path)) {
            return new JsonResponse([
                'error' => 'El XML contiene declaraciones no permitidas.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $next($request);
    }

    private function containsUnsafeDeclaration(string $path): bool
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return true;
        }

        $tail = '';

        try {
            while (! feof($handle)) {
                $chunk = fread($handle, self::SCAN_CHUNK_BYTES);
                if ($chunk === false) {
                    return true;
                }

                $window = $tail.$chunk;
                if (stripos($window, '<!DOCTYPE') !== false || stripos($window, '<!ENTITY') !== false) {
                    return true;
                }

                $tail = substr($window, -self::OVERLAP_BYTES);
            }
        } finally {
            fclose($handle);
        }

        return false;
    }
}

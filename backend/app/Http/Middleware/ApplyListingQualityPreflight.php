<?php

namespace App\Http\Middleware;

use App\Services\ListingQualityPreflightService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplyListingQualityPreflight
{
    public function __construct(private ListingQualityPreflightService $preflight)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $path = trim($request->path(), '/');
        $isCreate = $request->isMethod('post') && $path === 'api/ads';
        $isUpdate = $request->isMethod('post') && preg_match('#^api/ads/[0-9]+$#', $path) === 1;

        if ((! $isCreate && ! $isUpdate) || ! $request->user('sanctum')) {
            return $next($request);
        }

        // Let the canonical controller validator own missing/ill-typed required fields.
        // This layer only evaluates quality once the structural payload is present.
        if (! $request->filled('title')
            || ! $request->filled('description')
            || ! $request->has('price')
            || ! $request->filled('category')) {
            return $next($request);
        }

        $existingImages = array_values(array_filter(
            (array) $request->input('existing_images', []),
            fn ($path) => is_string($path) && str_starts_with($path, 'ads/'),
        ));
        $newImages = $request->hasFile('images') ? count((array) $request->file('images')) : 0;

        $result = $this->preflight->evaluate([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'price' => $request->input('price'),
            'category' => $request->input('category'),
            'photo_count' => count($existingImages) + $newImages,
        ]);

        if (! $result['passes_hard_validation']) {
            return response()->json([
                'message' => 'Listing quality preflight failed.',
                'quality_preflight' => $result,
            ], 422);
        }

        $response = $next($request);

        if ($response instanceof JsonResponse && $response->isSuccessful()) {
            $payload = $response->getData(true);
            if (is_array($payload)) {
                $payload['quality_preflight'] = $result;
                $response->setData($payload);
            }
        }

        return $response;
    }
}

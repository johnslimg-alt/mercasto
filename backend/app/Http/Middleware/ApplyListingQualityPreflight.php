<?php

namespace App\Http\Middleware;

use App\Services\ListingDuplicateRiskService;
use App\Services\ListingQualityPreflightService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplyListingQualityPreflight
{
    private const PREVIEW_HEADER = 'X-Mercasto-Quality-Preflight';

    public function __construct(
        private ListingQualityPreflightService $preflight,
        private ListingDuplicateRiskService $duplicateRisk,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $path = trim($request->path(), '/');
        $isCreate = $request->isMethod('post') && $path === 'api/ads';
        $isUpdate = $request->isMethod('post') && preg_match('#^api/ads/[0-9]+$#', $path) === 1;
        $isPreview = strtolower(trim((string) $request->header(self::PREVIEW_HEADER))) === 'preview';

        if ((! $isCreate && ! $isUpdate) || ! $request->user('sanctum')) {
            return $next($request);
        }

        // Let the canonical controller validator own missing/ill-typed required fields for real writes.
        // Preview requests must never fall through to the controller because preview is non-mutating by contract.
        if (! $request->filled('title')
            || ! $request->filled('description')
            || ! $request->has('price')
            || ! $request->filled('category')) {
            if ($isPreview) {
                return response()->json([
                    'message' => 'Listing quality preview requires the complete structural payload.',
                    'quality_preflight' => [
                        'passes_hard_validation' => false,
                        'errors' => ['incomplete_preview_payload'],
                        'warnings' => [],
                    ],
                ], 422);
            }

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

        $userId = (int) $request->user('sanctum')->getAuthIdentifier();
        $excludeAdId = $isUpdate ? (int) basename($path) : null;
        if ($this->duplicateRisk->hasRisk($userId, [
            'title' => $request->input('title'),
            'category' => $request->input('category'),
            'location' => $request->input('location'),
            'city' => $request->input('city'),
            'state' => $request->input('state'),
        ], $excludeAdId)) {
            $result['warnings'][] = 'duplicate_listing_risk';
            $result['warnings'] = array_values(array_unique($result['warnings']));
        }

        if (! $result['passes_hard_validation']) {
            return response()->json([
                'message' => 'Listing quality preflight failed.',
                'quality_preflight' => $result,
            ], 422);
        }

        if ($isPreview) {
            return response()->json([
                'quality_preflight' => $result,
            ]);
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

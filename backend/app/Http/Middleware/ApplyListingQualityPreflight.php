<?php

namespace App\Http\Middleware;

use App\Models\Ad;
use App\Services\ListingDuplicateRiskService;
use App\Services\ListingQualityPreflightService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ApplyListingQualityPreflight
{
    private const PREVIEW_HEADER = 'X-Mercasto-Quality-Preflight';
    private const BULK_TEXT_ERRORS = [
        'title_too_short',
        'title_missing_letters',
        'description_too_short',
        'description_missing_letters',
    ];

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
        $isBulkUpload = $request->isMethod('post') && $path === 'api/ads/bulk-upload';
        $isPreview = strtolower(trim((string) $request->header(self::PREVIEW_HEADER))) === 'preview';
        $user = $request->user('sanctum');

        if (! $user) {
            return $next($request);
        }

        if ($isBulkUpload) {
            return $this->guardBulkUpload($request, $next, (int) $user->getAuthIdentifier());
        }

        if (! $isCreate && ! $isUpdate) {
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

        $userId = (int) $user->getAuthIdentifier();
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

    /**
     * Bulk import uses batched Ad::insert(), so model events cannot enforce the
     * same text-quality contract as the ordinary write endpoint. Keep the whole
     * controller write inside a transaction and lazily inspect rows created by
     * this request. The first invalid text row fails the batch closed and rolls
     * the transaction back, without materializing a large import in PHP memory.
     */
    private function guardBulkUpload(Request $request, Closure $next, int $userId): Response
    {
        DB::beginTransaction();

        try {
            $baselineId = (int) (Ad::query()->max('id') ?? 0);
            $response = $next($request);

            if (! $response->isSuccessful()) {
                DB::rollBack();
                return $response;
            }

            $violation = null;
            foreach (Ad::query()
                ->where('id', '>', $baselineId)
                ->where('user_id', $userId)
                ->select(['id', 'title', 'description', 'price', 'category'])
                ->lazyById(500, 'id') as $ad) {
                $result = $this->preflight->evaluate([
                    'title' => $ad->title,
                    'description' => $ad->description,
                    'price' => $ad->price,
                    'category' => $ad->category,
                    'photo_count' => 0,
                ]);
                $rowErrors = array_values(array_intersect(
                    (array) ($result['errors'] ?? []),
                    self::BULK_TEXT_ERRORS,
                ));

                if ($rowErrors !== []) {
                    $violation = [
                        'ad_id' => $ad->id,
                        'errors' => $rowErrors,
                    ];
                    break;
                }
            }

            if ($violation !== null) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Bulk upload failed listing quality validation.',
                    'quality_preflight' => [
                        'passes_hard_validation' => false,
                        'errors' => $violation['errors'],
                        'warnings' => [],
                    ],
                    'bulk_quality_preflight' => [
                        'rejected_rows' => [$violation],
                    ],
                ], 422);
            }

            DB::commit();
            return $response;
        } catch (Throwable $error) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            throw $error;
        }
    }
}

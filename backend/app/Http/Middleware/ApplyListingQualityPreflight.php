<?php

namespace App\Http\Middleware;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Services\ListingDuplicateRiskService;
use App\Services\ListingPolicySignalService;
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
        private ListingPolicySignalService $policySignals,
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

        // Product-policy signals are review routing only. They never make an
        // automatic legal/moderation decision and therefore do not change hard
        // validation by themselves.
        $policyReview = $this->policySignals->assessListing([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
        ]);
        $result['policy_review'] = [
            'required' => (bool) ($policyReview['requires_manual_review'] ?? false),
            'policy_ids' => array_values((array) ($policyReview['policy_ids'] ?? [])),
            'human_authoritative' => (bool) ($policyReview['human_authoritative'] ?? true),
            'authoritative_action' => null,
        ];
        if ($result['policy_review']['required']) {
            $result['warnings'][] = 'policy_manual_review';
            $result['warnings'] = array_values(array_unique($result['warnings']));
        }

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

        // A policy-matching edit must invalidate any earlier approval even when
        // the controller would otherwise preserve an archived/paused approval.
        // This closes the paused -> edit -> activate bypass: before the response
        // leaves the write request, the listing is back in the moderation queue.
        if ($isUpdate
            && $excludeAdId
            && $result['policy_review']['required']
            && $response->isSuccessful()) {
            $ad = Ad::query()->find($excludeAdId);
            $alreadyQueued = $ad
                && $ad->status === 'pending'
                && $ad->ai_moderation_status === 'queued';

            if ($ad && ! $alreadyQueued) {
                $ad->forceFill([
                    'status' => 'pending',
                    'expires_at' => null,
                    'reminder_sent_at' => null,
                    'moderation_submitted_at' => now(),
                    'ai_moderation_status' => 'queued',
                    'ai_moderation_reason' => null,
                    'ai_moderation_confidence' => null,
                    'ai_moderated_at' => null,
                ])->saveQuietly();

                ModerateAdWithAI::dispatch($ad->id);
            }
        }

        if ($response instanceof JsonResponse && $response->isSuccessful()) {
            $payload = $response->getData(true);
            if (is_array($payload)) {
                $payload['quality_preflight'] = $result;
                if ($isUpdate && $result['policy_review']['required']) {
                    $payload['moderation_status'] = 'queued';
                    $payload['status'] = 'pending';
                }
                $response->setData($payload);
            }
        }

        return $response;
    }
}

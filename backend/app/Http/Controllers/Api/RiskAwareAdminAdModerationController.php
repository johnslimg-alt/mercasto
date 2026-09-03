<?php

namespace App\Http\Controllers\Api;

use App\Jobs\ScoreFraudRiskBatch;
use App\Models\Ad;
use App\Services\AI\FraudDetectionService;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiskAwareAdminAdModerationController extends AdminAdModerationController
{
    public function __construct(private FraudDetectionService $fraudDetection)
    {
    }

    public function index(Request $request, AdIllustrativeCoverService $covers): JsonResponse
    {
        if ($request->query('mode') !== 'risk') {
            return parent::index($request, $covers);
        }

        $this->authorizeRiskAdmin($request);
        $perPage = max(1, min(100, (int) $request->integer(
            'per_page',
            $request->integer('limit', 50),
        )));
        $requestedPage = max(1, (int) $request->integer('page', 1));
        $threshold = (int) config('fraud_risk.thresholds.review', 40);

        $query = Ad::query()
            ->with('user:id,name,is_verified')
            ->where('fraud_score', '>=', $threshold)
            ->whereIn('status', ['active', 'pending', 'under_review', 'archived']);
        $total = (clone $query)->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($requestedPage, $lastPage);

        $ads = $query
            ->orderByDesc('fraud_score')
            ->orderByDesc('last_fraud_check_at')
            ->forPage($page, $perPage)
            ->get([
                'id',
                'user_id',
                'title',
                'status',
                'price',
                'category',
                'state',
                'city',
                'fraud_score',
                'fraud_flags',
                'last_fraud_check_at',
                'created_at',
            ]);

        return response()->json([
            'data' => $ads,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'review_threshold' => $threshold,
            'mode' => 'shadow_assist',
            'authoritative' => false,
        ]);
    }

    public function retry(Request $request, Ad $ad): JsonResponse
    {
        if ($request->input('mode') !== 'risk') {
            return parent::retry($request, $ad);
        }

        $this->authorizeRiskAdmin($request);
        $beforeStatus = $ad->status;
        $analysis = $this->fraudDetection->analyze($ad);
        $ad->refresh();

        return response()->json([
            'success' => true,
            'analysis' => $analysis,
            'listing' => [
                'id' => $ad->id,
                'status' => $ad->status,
                'status_unchanged' => $ad->status === $beforeStatus,
                'fraud_score' => $ad->fraud_score,
                'fraud_flags' => $ad->fraud_flags,
                'last_fraud_check_at' => optional($ad->last_fraud_check_at)?->toIso8601String(),
            ],
        ]);
    }

    public function processPending(Request $request): JsonResponse
    {
        if ($request->input('mode') !== 'risk') {
            return parent::processPending($request);
        }

        $this->authorizeRiskAdmin($request);
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);
        $limit = (int) ($validated['limit'] ?? 50);
        ScoreFraudRiskBatch::dispatch($limit);

        return response()->json([
            'success' => true,
            'queued' => true,
            'limit' => $limit,
            'mode' => 'shadow_assist',
            'authoritative' => false,
        ], 202);
    }

    private function authorizeRiskAdmin(Request $request): void
    {
        abort_unless($request->user() && $request->user()->role === 'admin', 403, 'Acceso denegado');
    }
}

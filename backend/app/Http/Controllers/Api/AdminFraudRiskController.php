<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Services\AI\FraudDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFraudRiskController extends Controller
{
    public function __construct(private FraudDetectionService $fraudDetection) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);
        $limit = (int) ($validated['limit'] ?? 50);
        $threshold = (int) config('fraud_risk.thresholds.review', 40);

        $ads = Ad::query()
            ->with('user:id,name,is_verified')
            ->whereNotNull('last_fraud_check_at')
            ->where('fraud_score', '>=', $threshold)
            ->whereIn('status', ['active', 'under_review', 'pending', 'archived'])
            ->orderByDesc('fraud_score')
            ->orderByDesc('last_fraud_check_at')
            ->limit($limit)
            ->get([
                'id',
                'user_id',
                'title',
                'price',
                'category',
                'state',
                'city',
                'status',
                'fraud_score',
                'fraud_flags',
                'last_fraud_check_at',
                'created_at',
            ]);

        return response()->json([
            'mode' => 'shadow_assist',
            'authoritative' => false,
            'review_threshold' => $threshold,
            'total' => $ads->count(),
            'data' => $ads,
        ]);
    }

    public function analyze(Request $request, Ad $ad): JsonResponse
    {
        $this->authorizeAdmin($request);
        $statusBefore = $ad->status;
        $analysis = $this->fraudDetection->analyze($ad);
        $ad->refresh();

        return response()->json([
            'analysis' => $analysis,
            'listing' => [
                'id' => $ad->id,
                'status' => $ad->status,
                'status_unchanged' => $ad->status === $statusBefore,
                'fraud_score' => $ad->fraud_score,
                'fraud_flags' => $ad->fraud_flags,
                'last_fraud_check_at' => $ad->last_fraud_check_at?->toIso8601String(),
            ],
        ]);
    }

    public function batch(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
        ]);
        $result = $this->fraudDetection->batchAnalyze((int) ($validated['limit'] ?? 50));

        return response()->json([
            'mode' => 'shadow_assist',
            'authoritative' => false,
            ...$result,
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Acceso denegado');
    }
}

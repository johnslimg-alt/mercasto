<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReportModerationController extends Controller
{
    public function transitionListingReport(Request $request, int $id, ReportLifecycleService $lifecycle): JsonResponse
    {
        return $this->transition($request, 'reports', $id, $lifecycle);
    }

    public function transitionUserReport(Request $request, int $id, ReportLifecycleService $lifecycle): JsonResponse
    {
        return $this->transition($request, 'user_reports', $id, $lifecycle);
    }

    private function transition(
        Request $request,
        string $table,
        int $id,
        ReportLifecycleService $lifecycle,
    ): JsonResponse {
        if ($request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:in_review,resolved,dismissed',
            'resolution_note' => 'nullable|string|max:2000',
        ]);

        return DB::transaction(function () use ($table, $id, $request, $validated, $lifecycle): JsonResponse {
            $report = DB::table($table)
                ->where('id', $id)
                ->lockForUpdate()
                ->first();

            if (! $report) {
                return response()->json(['message' => 'Reporte no encontrado'], 404);
            }

            $from = (string) ($report->status ?: ReportLifecycleService::STATUS_NEW);

            try {
                $patch = $lifecycle->transitionPatch(
                    $from,
                    $validated['status'],
                    (int) $request->user()->id,
                    now(),
                    $validated['resolution_note'] ?? null,
                );
            } catch (InvalidArgumentException $exception) {
                return response()->json([
                    'message' => 'Transición de reporte no válida',
                    'from' => $from,
                    'to' => $validated['status'],
                ], 422);
            }

            DB::table($table)->where('id', $id)->update($patch);

            $updated = DB::table($table)
                ->select([
                    'id',
                    'status',
                    'review_started_at',
                    'resolved_at',
                    'resolved_by',
                    'resolution_action',
                    'resolution_note',
                ])
                ->where('id', $id)
                ->first();

            return response()->json(['report' => $updated]);
        });
    }
}

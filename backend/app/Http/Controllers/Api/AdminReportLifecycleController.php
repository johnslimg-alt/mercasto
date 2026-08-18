<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class AdminReportLifecycleController extends Controller
{
    public function transitionListing(
        Request $request,
        int $id,
        ReportLifecycleService $service,
    ): JsonResponse {
        return $this->transition($request, 'reports', $id, 'listing', $service);
    }

    public function transitionUser(
        Request $request,
        int $id,
        ReportLifecycleService $service,
    ): JsonResponse {
        return $this->transition($request, 'user_reports', $id, 'user', $service);
    }

    private function transition(
        Request $request,
        string $table,
        int $id,
        string $kind,
        ReportLifecycleService $service,
    ): JsonResponse {
        $moderator = $request->user();
        if (! $moderator || $moderator->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    ReportLifecycleService::STATUS_IN_REVIEW,
                    ReportLifecycleService::STATUS_RESOLVED,
                    ReportLifecycleService::STATUS_DISMISSED,
                ]),
            ],
            'note' => ['nullable', 'string', 'max:4000'],
        ]);

        $report = DB::table($table)->where('id', $id)->first();
        if (! $report) {
            return response()->json(['message' => 'Reporte no encontrado'], 404);
        }

        $from = (string) ($report->status ?: ReportLifecycleService::STATUS_NEW);

        try {
            $patch = $service->transitionPatch(
                $from,
                $validated['status'],
                (int) $moderator->id,
                now(),
                $validated['note'] ?? null,
            );
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'status' => [$exception->getMessage()],
            ]);
        }

        DB::table($table)->where('id', $id)->update($patch);

        return response()->json([
            'kind' => $kind,
            'data' => DB::table($table)->where('id', $id)->first(),
        ]);
    }
}

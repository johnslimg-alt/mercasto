<?php

namespace App\Http\Controllers\Api;

use App\Events\NewNotification;
use App\Http\Controllers\Controller;
use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminAdModerationController extends Controller
{
    public function index(Request $request, AdIllustrativeCoverService $covers): JsonResponse
    {
        $this->authorizeAdmin($request);

        $perPage = max(10, min(100, (int) $request->integer('per_page', 50)));
        $ads = Ad::query()
            ->with([
                'user:id,name,email,is_verified',
                'moderationDecisions',
            ])
            ->whereIn('status', ['pending', 'ai_review'])
            ->orderByRaw('COALESCE(moderation_submitted_at, created_at) ASC')
            ->paginate($perPage);

        $ads->getCollection()->transform(
            fn (Ad $ad) => $this->present($ad, $covers)
        );

        return response()->json($ads);
    }

    public function show(Request $request, Ad $ad, AdIllustrativeCoverService $covers): JsonResponse
    {
        $this->authorizeAdmin($request);

        $ad->load([
            'user:id,name,email,phone_number,is_verified,created_at',
            'moderationDecisions.moderator:id,name,email',
        ]);

        return response()->json($this->present($ad, $covers, true));
    }

    public function retry(Request $request, Ad $ad): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($ad->status === 'active') {
            return response()->json(['message' => 'El anuncio ya está activo.'], 422);
        }

        $ad->forceFill([
            'status' => 'ai_review',
            'moderation_submitted_at' => $ad->moderation_submitted_at ?: $ad->created_at ?: now(),
            'ai_moderation_status' => 'queued',
            'ai_moderation_reason' => null,
            'ai_moderation_confidence' => null,
            'ai_moderated_at' => null,
        ])->saveQuietly();

        ModerateAdWithAI::dispatch($ad->id);

        return response()->json(['success' => true, 'message' => 'Anuncio enviado nuevamente a la IA.']);
    }

    public function processPending(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:500',
        ]);
        $limit = (int) ($validated['limit'] ?? 100);

        Artisan::call('ads:moderate-pending', ['--limit' => $limit]);

        return response()->json([
            'success' => true,
            'message' => trim(Artisan::output()),
        ]);
    }

    public function decide(Request $request, Ad $ad): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected,manual_review',
            'reason' => 'nullable|string|max:2000|required_if:decision,rejected',
        ]);

        $decision = $validated['decision'];
        $reason = trim((string) ($validated['reason'] ?? ''));
        $previousStatus = $ad->status;
        $newStatus = match ($decision) {
            'approved' => 'active',
            'rejected' => 'rejected',
            default => 'pending',
        };

        DB::transaction(function () use ($ad, $request, $decision, $reason, $newStatus, $previousStatus) {
            $ad->forceFill([
                'status' => $newStatus,
                'ai_moderation_status' => 'admin_' . $decision,
                'ai_moderation_reason' => $reason !== '' ? $reason : 'Revisión manual del administrador.',
                'ai_moderation_confidence' => null,
                'ai_moderated_at' => now(),
            ])->saveQuietly();

            AdModerationDecision::create([
                'ad_id' => $ad->id,
                'source' => 'admin',
                'decision' => $decision,
                'reason' => $reason !== '' ? $reason : null,
                'moderator_id' => $request->user()->id,
                'metadata' => ['previous_status' => $previousStatus],
            ]);
        });

        if ($decision === 'approved' && $previousStatus !== 'active') {
            $this->notifyApproval($ad->fresh());
        }

        $this->clearPublicCaches();

        return response()->json([
            'success' => true,
            'status' => $newStatus,
            'decision' => $decision,
        ]);
    }

    private function present(Ad $ad, AdIllustrativeCoverService $covers, bool $full = false): array
    {
        $submittedAt = $ad->moderation_submitted_at ?: $ad->created_at;
        $payload = $ad->toArray();
        $payload['moderation_submitted_at'] = optional($submittedAt)->toIso8601String();
        $payload['waiting_seconds'] = $submittedAt ? max(0, $submittedAt->diffInSeconds(now())) : 0;
        $payload['has_original_images'] = $covers->hasOriginalImages($ad);
        $payload['illustrative_cover'] = (bool) $ad->generated_cover;

        if (! $full && isset($payload['moderation_decisions']) && is_array($payload['moderation_decisions'])) {
            $payload['moderation_decisions'] = array_slice($payload['moderation_decisions'], 0, 5);
        }

        return $payload;
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user() && $request->user()->role === 'admin', 403, 'Acceso denegado');
    }

    private function notifyApproval(Ad $ad): void
    {
        try {
            $notification = [
                'user_id' => $ad->user_id,
                'title' => '¡Anuncio aprobado!',
                'message' => 'Tu anuncio "' . $ad->title . '" fue revisado y ya está visible.',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);
            broadcast(new NewNotification((int) $ad->user_id, $notification))->toOthers();
        } catch (Throwable $error) {
            Log::warning('Could not notify manual moderation approval', [
                'ad_id' => $ad->id,
                'error' => $error->getMessage(),
            ]);
        }
    }

    private function clearPublicCaches(): void
    {
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }
    }
}

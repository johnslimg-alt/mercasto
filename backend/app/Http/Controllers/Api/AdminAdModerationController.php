<?php

namespace App\Http\Controllers\Api;

use App\Events\NewNotification;
use App\Http\Controllers\Controller;
use App\Jobs\ModerateAdWithAI;
use App\Mail\SellerCorrectionRequiredMail;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class AdminAdModerationController extends Controller
{
    private const UNFINISHED_MODERATION_STATUSES = [
        'queued',
        'processing',
        'manual_review',
        'failed',
        'admin_manual_review',
    ];

    public function index(Request $request, AdIllustrativeCoverService $covers): JsonResponse
    {
        $this->authorizeAdmin($request);

        $perPage = max(10, min(100, (int) $request->integer('per_page', 50)));
        $ads = Ad::query()
            ->with([
                'user:id,name,email,is_verified',
                'moderationDecisions' => fn ($query) => $query->limit(5),
            ])
            ->where(function ($query) {
                $query->where('status', 'pending')
                    ->orWhere(function ($hidden) {
                        $hidden->where('status', 'archived')
                            ->whereIn('ai_moderation_status', self::UNFINISHED_MODERATION_STATUSES);
                    });
            })
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

        $previousCycleQuery = $ad->moderationDecisions()
            ->where('source', 'system')
            ->where('decision', 'queued');
        if ($ad->moderation_submitted_at) {
            $previousCycleQuery->where('created_at', '>=', $ad->moderation_submitted_at);
        }
        $previousCycle = $previousCycleQuery->latest('id')->first();
        $activateOnHumanApproval = $previousCycle
            ? (bool) data_get($previousCycle->metadata, 'rollout.activate_on_human_approval', false)
            : $ad->status === 'pending';

        $ad->forceFill([
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
            'ai_moderation_reason' => null,
            'ai_moderation_confidence' => null,
            'ai_moderated_at' => null,
        ])->saveQuietly();

        $cycle = AdModerationDecision::create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => [
                'rollout' => [
                    'human_authoritative' => true,
                    'activate_on_human_approval' => $activateOnHumanApproval,
                ],
            ],
        ]);

        ModerateAdWithAI::dispatch($ad->id, $activateOnHumanApproval, $cycle->id);

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
            'decision' => 'required|in:approved,rejected,manual_review,changes_requested',
            'reason' => 'nullable|string|max:2000|required_if:decision,rejected,changes_requested',
        ]);

        $decision = $validated['decision'];
        $reason = trim((string) preg_replace('/\s+/u', ' ', strip_tags((string) ($validated['reason'] ?? ''))));
        $previousStatus = $ad->status;
        if ($decision === 'changes_requested' && $previousStatus === 'active') {
            return response()->json([
                'message' => 'Pausa el anuncio activo antes de solicitar cambios.',
            ], 422);
        }

        $queueIntentQuery = $ad->moderationDecisions()
            ->where('source', 'system')
            ->where('decision', 'queued');
        if ($ad->moderation_submitted_at) {
            $queueIntentQuery->where('created_at', '>=', $ad->moderation_submitted_at);
        }
        $currentQueueDecision = $queueIntentQuery->latest('id')->first();
        $hasCurrentActivationIntent = $currentQueueDecision !== null;
        $activateOnHumanApproval = (bool) data_get(
            $currentQueueDecision?->metadata,
            'rollout.activate_on_human_approval',
            false
        );
        $publishImmediately = $decision === 'approved'
            && ($hasCurrentActivationIntent
                ? $activateOnHumanApproval
                : $previousStatus === 'pending');
        $newStatus = match ($decision) {
            'approved' => $publishImmediately ? 'active' : 'archived',
            'rejected' => 'rejected',
            default => 'archived',
        };

        $moderationStatus = match ($decision) {
            'approved' => 'approved',
            'changes_requested' => 'admin_changes_requested',
            default => 'admin_' . $decision,
        };

        DB::transaction(function () use ($ad, $request, $decision, $reason, $newStatus, $previousStatus, $publishImmediately, $moderationStatus) {
            $ad->forceFill([
                'status' => $newStatus,
                'expires_at' => $publishImmediately ? Ad::freshExpiry() : null,
                'reminder_sent_at' => null,
                'ai_moderation_status' => $moderationStatus,
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
                'metadata' => [
                    'previous_status' => $previousStatus,
                    'activation_mode' => $decision === 'approved'
                        ? ($publishImmediately ? 'automatic_fresh_submission' : 'seller_confirmation_required')
                        : null,
                    'seller_action_required' => $decision === 'changes_requested',
                ],
            ]);
        });

        if ($decision === 'approved') {
            if ($publishImmediately) {
                $this->notifyApproval($ad->fresh());
            } else {
                $this->notifyApprovalPendingReactivation($ad->fresh());
            }
        } elseif ($decision === 'changes_requested') {
            $this->notifyChangesRequested($ad->fresh(), $reason);
        }

        $this->clearPublicCaches();

        return response()->json([
            'success' => true,
            'status' => $newStatus,
            'decision' => $decision,
            'activation_mode' => $decision === 'approved'
                ? ($publishImmediately ? 'automatic_fresh_submission' : 'seller_confirmation_required')
                : null,
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

        $decisions = isset($payload['moderation_decisions']) && is_array($payload['moderation_decisions'])
            ? $payload['moderation_decisions']
            : [];
        $payload['ai_assist'] = $this->presentAiAssist($ad, $decisions);
        $payload['moderation_decisions'] = array_map(
            fn (array $decision) => $this->presentDecisionHistory($decision),
            $full ? $decisions : array_slice($decisions, 0, 5),
        );

        return $payload;
    }

    private function presentAiAssist(Ad $ad, array $decisions): array
    {
        $latestAi = collect($decisions)->first(
            fn (array $decision): bool => ($decision['source'] ?? null) === 'ai'
        );
        $metadata = is_array($latestAi['metadata'] ?? null) ? $latestAi['metadata'] : [];
        $runtime = is_array($metadata['runtime'] ?? null) ? $metadata['runtime'] : [];
        $rollout = is_array($metadata['rollout'] ?? null) ? $metadata['rollout'] : [];
        $policy = is_array($metadata['policy_review'] ?? null) ? $metadata['policy_review'] : [];
        $gateway = is_array($metadata['gateway'] ?? null) ? $metadata['gateway'] : [];

        return [
            'feature_enabled' => (bool) config('ai_moderation.enabled', true),
            'status' => $ad->ai_moderation_status,
            'reason' => $ad->ai_moderation_reason,
            'confidence' => $ad->ai_moderation_confidence === null
                ? null
                : (float) $ad->ai_moderation_confidence,
            'technical_status' => $metadata['technical_status'] ?? null,
            'runtime' => [
                'provider' => $runtime['provider'] ?? ($metadata['provider'] ?? null),
                'adapter' => $runtime['adapter'] ?? null,
                'model' => $runtime['model'] ?? ($metadata['model'] ?? null),
                'execution' => $runtime['execution'] ?? null,
                'gateway_version' => $runtime['gateway_version'] ?? ($gateway['version'] ?? null),
                'contract_version' => $runtime['contract_version'] ?? null,
                'runtime_ms' => isset($runtime['runtime_ms']) ? (int) $runtime['runtime_ms'] : null,
                'budget_seconds' => isset($runtime['budget_seconds']) ? (int) $runtime['budget_seconds'] : null,
            ],
            'rollout' => [
                'mode' => $rollout['mode'] ?? ($metadata['rollout_mode'] ?? (string) config('ai_moderation.rollout.mode', 'assist')),
                'assist_only' => (bool) ($rollout['assist_only'] ?? ($metadata['assist_only'] ?? true)),
                'human_authoritative' => true,
                'proposed_decision' => $rollout['proposed_decision'] ?? data_get($metadata, 'result.proposed_decision'),
                'authoritative_decision' => $rollout['authoritative_decision'] ?? ($latestAi['decision'] ?? null),
            ],
            'policy_ids' => array_values(array_filter((array) ($policy['policy_ids'] ?? []), 'is_string')),
            'media' => [
                'original_images' => isset($metadata['original_image_count']) ? (int) $metadata['original_image_count'] : null,
                'reviewed_images' => isset($metadata['reviewed_image_count']) ? (int) $metadata['reviewed_image_count'] : null,
                'reviewed_video_frames' => isset($metadata['reviewed_video_frame_count']) ? (int) $metadata['reviewed_video_frame_count'] : null,
                'model_media' => isset($gateway['model_image_count']) ? (int) $gateway['model_image_count'] : null,
                'omitted_media' => isset($gateway['images_omitted']) ? (int) $gateway['images_omitted'] : null,
                'video_manual_review_required' => (bool) ($metadata['video_manual_review_required'] ?? false),
            ],
        ];
    }

    private function presentDecisionHistory(array $decision): array
    {
        return [
            'id' => $decision['id'] ?? null,
            'source' => $decision['source'] ?? null,
            'decision' => $decision['decision'] ?? null,
            'reason' => $decision['reason'] ?? null,
            'confidence' => isset($decision['confidence']) ? (float) $decision['confidence'] : null,
            'moderator_id' => $decision['moderator_id'] ?? null,
            'moderator' => $decision['moderator'] ?? null,
            'created_at' => $decision['created_at'] ?? null,
            'updated_at' => $decision['updated_at'] ?? null,
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user() && $request->user()->role === 'admin', 403, 'Acceso denegado');
    }

    private function notifyChangesRequested(Ad $ad, string $reason): void
    {
        try {
            $seller = $ad->user()->first();
            if (! $seller) {
                return;
            }

            $link = '/anuncio/' . $ad->id . '/editar';
            $now = now();
            $existing = DB::table('user_notifications')
                ->where('user_id', $seller->id)
                ->where('type', 'seller_changes_requested')
                ->where('link', $link)
                ->first();

            $notification = [
                'user_id' => $seller->id,
                'title' => 'Tu anuncio necesita cambios',
                'message' => $reason,
                'type' => 'seller_changes_requested',
                'data' => json_encode([
                    'ad_id' => $ad->id,
                    'issue_codes' => ['admin_request'],
                ], JSON_THROW_ON_ERROR),
                'link' => $link,
                'is_read' => false,
                'updated_at' => $now,
            ];

            $created = ! $existing;
            if ($existing) {
                DB::table('user_notifications')->where('id', $existing->id)->update($notification);
                $notification['id'] = $existing->id;
                $notification['created_at'] = $existing->created_at;
            } else {
                $notification['created_at'] = $now;
                $notification['id'] = DB::table('user_notifications')->insertGetId($notification);
            }

            broadcast(new NewNotification((int) $seller->id, $notification))->toOthers();

            if ($created && $this->emailEnabled($seller) && filled($seller->email)) {
                Mail::to($seller->email)->queue(new SellerCorrectionRequiredMail(
                    $seller,
                    1,
                    [$reason],
                    rtrim((string) config('app.frontend_url', config('app.url')), '/') . $link,
                ));
            }
        } catch (Throwable $error) {
            Log::warning('Could not notify requested moderation changes', [
                'ad_id' => $ad->id,
                'error' => $error->getMessage(),
            ]);
        }
    }

    private function emailEnabled($user): bool
    {
        $preferences = $user->notification_preferences ?? [];
        if (is_string($preferences)) {
            $preferences = json_decode($preferences, true) ?: [];
        }

        if (array_key_exists('email_alerts', $preferences)) {
            return (bool) $preferences['email_alerts'];
        }

        return $user->email_notifications === null
            ? true
            : (bool) $user->email_notifications;
    }

    private function notifyApprovalPendingReactivation(Ad $ad): void
    {
        try {
            $notification = [
                'user_id' => $ad->user_id,
                'title' => 'Tu anuncio fue aprobado',
                'message' => 'Confirma que el anuncio sigue disponible y revisa precio, estado y ubicación antes de activarlo.',
                'type' => 'seller_reactivation_ready',
                'data' => json_encode(['ad_id' => $ad->id], JSON_THROW_ON_ERROR),
                'link' => '/profile?tab=my_ads&filter=review_ready',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);
            broadcast(new NewNotification((int) $ad->user_id, $notification))->toOthers();
        } catch (Throwable $error) {
            Log::warning('Could not notify archived moderation approval', [
                'ad_id' => $ad->id,
                'error' => $error->getMessage(),
            ]);
        }
    }

    private function notifyApproval(Ad $ad): void
    {
        try {
            $notification = [
                'user_id' => $ad->user_id,
                'title' => 'Anuncio aprobado!',
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

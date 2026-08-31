<?php

namespace App\Jobs;

use App\Events\NewNotification;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\AdIllustrativeCoverService;
use App\Services\ListingPolicyMatrixService;
use App\Services\ListingPolicySignalService;
use App\Services\AiModerationGatewayClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Symfony\Component\Process\Process;
use Throwable;

class ModerateAdWithAI implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 180;
    public int $uniqueFor = 600;

    public ?int $moderationCycleId = null;

    public function __construct(
        public int $adId,
        public bool $activateOnApproval = true,
        ?int $moderationCycleId = null,
    )
    {
        $this->moderationCycleId = $moderationCycleId;
    }

    public function uniqueId(): string
    {
        if ($this->moderationCycleId) {
            return $this->adId . ':cycle:' . $this->moderationCycleId;
        }

        return $this->adId . ':' . ($this->activateOnApproval ? 'activate' : 'review');
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(
        AdIllustrativeCoverService $covers,
        AiModerationGatewayClient $aiGateway,
        ListingPolicySignalService $policySignals,
        ListingPolicyMatrixService $policyMatrix,
    ): void
    {
        $ad = Ad::query()->with('user:id,name,email')->find($this->adId);
        if (! $ad
            || ! in_array($ad->status, ['pending', 'archived'], true)
            || $ad->ai_moderation_status !== 'queued'
            || ! $this->isCurrentModerationCycle()) {
            return;
        }

        Cache::forget('ai_moderation:provider_unavailable');

        $covers->ensureCover($ad);
        $ad->refresh();
        if (! $this->isCurrentModerationCycle()) {
            return;
        }

        // Deterministic text-policy evidence must exist before any provider call
        // or kill-switch return so outages can never erase the canonical policy IDs.
        $textPolicyReview = $policySignals->assessListing([
            'title' => $ad->title,
            'description' => $ad->description,
        ]);
        $textPolicyIds = array_values((array) ($textPolicyReview['policy_ids'] ?? []));
        $textPolicyMetadata = [
            'policy_review' => [
                'required' => (bool) ($textPolicyReview['requires_manual_review'] ?? false),
                'policy_ids' => $textPolicyIds,
                'text_policy_ids' => $textPolicyIds,
                'model_policy_ids' => [],
                'human_authoritative' => true,
                'authoritative_action' => null,
            ],
        ];

        $ad->forceFill([
            'status' => 'archived',
            'moderation_submitted_at' => $ad->moderation_submitted_at ?: $ad->created_at ?: now(),
            'ai_moderation_status' => 'processing',
            'ai_moderation_reason' => null,
        ])->saveQuietly();

        if (! (bool) config('ai_moderation.enabled', true)) {
            $this->leaveForManualReview(
                $ad,
                'La asistencia automática de moderación está desactivada. El anuncio requiere revisión humana.',
                'manual_review',
                array_merge([
                    'rollout_mode' => 'disabled',
                    'technical_status' => 'disabled',
                    'assist_only' => true,
                    'human_authoritative' => true,
                    'runtime' => [
                        'provider' => 'none',
                        'adapter' => 'disabled',
                        'contract_version' => 'ai-moderation-assist-v1',
                        'runtime_ms' => 0,
                    ],
                    'rollout' => [
                        'mode' => 'disabled',
                        'assist_only' => true,
                        'human_authoritative' => true,
                        'activate_on_human_approval' => $this->activateOnApproval,
                    ],
                ], $textPolicyMetadata),
            );
            return;
        }

        $attemptStartedAt = hrtime(true);

        try {
            $assistOnly = (bool) config('ai_moderation.assist_only', true);
            $runtimeBudget = max(30, min(150, (int) config('ai_moderation.max_runtime_seconds', 150)));
            $originalImages = $covers->originalImages($ad);
            $images = $this->moderationImages($ad, $originalImages);
            $videoFrames = $this->moderationVideoFrames($ad);
            $aiImages = array_merge($images, $videoFrames);
            $canonicalPolicySignals = collect($policyMatrix->policies())
                ->flatMap(fn (array $policy) => (array) ($policy['automated_signals'] ?? []))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if ($videoFrames !== []) {
                $aiImages = array_merge(
                    array_slice($images, 0, 1),
                    array_slice($videoFrames, 0, 1),
                    array_slice($images, 1),
                    array_slice($videoFrames, 1),
                );
            }
            $sourceMediaCount = min(10, count($originalImages) + (! empty($ad->video_url) ? 1 : 0));
            $gatewayResponse = $aiGateway->moderateListing(
                title: (string) $ad->title,
                description: (string) $ad->description,
                imagesBase64: $aiImages,
                sourceImageCount: $sourceMediaCount,
                policySignals: $canonicalPolicySignals,
                timeoutSeconds: $runtimeBudget,
            );
            $provider = (string) $gatewayResponse['provider'];
            $model = (string) $gatewayResponse['model'];
            $runtimeMs = (int) ($gatewayResponse['latency_ms'] ?? max(0, (int) round((hrtime(true) - $attemptStartedAt) / 1_000_000)));
            $result = [
                'decision' => (string) $gatewayResponse['decision'],
                'reason' => (string) ($gatewayResponse['reason'] ?? ''),
                'confidence' => (float) $gatewayResponse['confidence'],
                'flags' => array_values((array) ($gatewayResponse['flags'] ?? [])),
            ];

            $modelPolicyReview = $policyMatrix->assessment((array) ($result['flags'] ?? []));
            $policyIds = array_values(array_unique(array_merge(
                $textPolicyIds,
                (array) ($modelPolicyReview['policy_ids'] ?? []),
            )));
            $policyManualReview = (bool) ($textPolicyReview['requires_manual_review'] ?? false)
                || (bool) ($modelPolicyReview['requires_manual_review'] ?? false);
            $result['policy_ids'] = $policyIds;

            $proposedDecision = (string) $result['decision'];
            $result['proposed_decision'] = $proposedDecision;
            $decision = $proposedDecision;
            $reason = trim((string) ($result['reason'] ?? 'Sin explicación del modelo.'));
            $confidence = max(0, min(1, (float) ($result['confidence'] ?? 0)));
            $gatewayIncomplete = (bool) ($gatewayResponse['description_truncated'] ?? false)
                || (int) ($gatewayResponse['images_omitted'] ?? 0) > 0
                || (int) ($gatewayResponse['policy_signals_omitted'] ?? 0) > 0;
            if ($gatewayIncomplete) {
                $decision = 'manual_review';
                $reason = 'La asistencia automática usó una entrada acotada y requiere revisión humana completa. ' . $reason;
            }
            if ($policyManualReview) {
                $decision = 'manual_review';
                $reason = 'La matriz interna de políticas detectó señales que requieren revisión humana. ' . $reason;
            }

            $unreviewedImages = max(0, count($originalImages) - count($images));
            if ($unreviewedImages > 0) {
                $decision = 'manual_review';
                $reason = "{$unreviewedImages} fotografía(s) no pudieron analizarse automáticamente. " . $reason;
            }
            if (! empty($ad->video_url) && $videoFrames === []) {
                $decision = 'manual_review';
                $reason = 'No fue posible extraer fotogramas del video para la revisión automática. Revisión visual manual requerida. ' . $reason;
            }
            if ($assistOnly && $decision !== 'manual_review') {
                $decision = 'manual_review';
                $reason = 'La IA propone ' . $proposedDecision . ', pero el modo assist-only exige decisión humana. ' . $reason;
            }

            $newStatus = match ($decision) {
                'approved' => $this->activateOnApproval ? 'active' : 'archived',
                'rejected' => 'rejected',
                default => 'archived',
            };

            $ad->refresh();
            if (! $this->isCurrentModerationCycle() || $ad->ai_moderation_status !== 'processing') {
                return;
            }

            $previousStatus = $ad->status;
            $ad->forceFill([
                'status' => $newStatus,
                'expires_at' => $newStatus === 'active' ? Ad::freshExpiry() : null,
                'reminder_sent_at' => null,
                'ai_moderation_status' => $decision,
                'ai_moderation_reason' => $reason,
                'ai_moderation_confidence' => $confidence,
                'ai_moderated_at' => now(),
            ])->saveQuietly();

            AdModerationDecision::create([
                'ad_id' => $ad->id,
                'source' => 'ai',
                'decision' => $decision,
                'reason' => $reason,
                'confidence' => $confidence,
                'metadata' => [
                    'model' => $model,
                    'provider' => $provider,
                    'runtime' => [
                        'provider' => $provider,
                        'adapter' => 'python_gateway',
                        'execution' => (string) ($gatewayResponse['runtime'] ?? 'private_local'),
                        'model' => $model,
                        'gateway_version' => (string) ($gatewayResponse['gateway_version'] ?? ''),
                        'contract_version' => 'ai-moderation-assist-v1',
                        'runtime_ms' => $runtimeMs,
                        'budget_seconds' => $runtimeBudget,
                    ],
                    'gateway' => [
                        'version' => (string) ($gatewayResponse['gateway_version'] ?? ''),
                        'rollout_mode' => (string) ($gatewayResponse['rollout_mode'] ?? 'shadow_assist'),
                        'authoritative' => false,
                        'description_truncated' => (bool) ($gatewayResponse['description_truncated'] ?? false),
                        'input_description_chars' => (int) ($gatewayResponse['input_description_chars'] ?? mb_strlen((string) $ad->description)),
                        'model_description_chars' => (int) ($gatewayResponse['model_description_chars'] ?? 0),
                        'input_image_count' => (int) ($gatewayResponse['input_image_count'] ?? $sourceMediaCount),
                        'model_image_count' => (int) ($gatewayResponse['model_image_count'] ?? 0),
                        'images_omitted' => (int) ($gatewayResponse['images_omitted'] ?? 0),
                        'policy_signals_omitted' => (int) ($gatewayResponse['policy_signals_omitted'] ?? 0),
                    ],
                    'had_original_images' => $covers->hasOriginalImages($ad),
                    'original_image_count' => count($originalImages),
                    'reviewed_image_count' => count($images),
                    'reviewed_video_frame_count' => count($videoFrames),
                    'video_manual_review_required' => ! empty($ad->video_url) && $videoFrames === [],
                    'previous_status' => $previousStatus,
                    'result' => $result,
                    'rollout' => [
                        'mode' => (string) config('ai_moderation.rollout.mode', 'assist'),
                        'assist_only' => $assistOnly,
                        'human_authoritative' => true,
                        'activate_on_human_approval' => $this->activateOnApproval,
                        'proposed_decision' => $proposedDecision,
                        'authoritative_decision' => $decision,
                    ],
                    'policy_review' => [
                        'required' => $policyManualReview,
                        'policy_ids' => $policyIds,
                        'text_policy_ids' => $textPolicyIds,
                        'model_policy_ids' => array_values((array) ($modelPolicyReview['policy_ids'] ?? [])),
                        'human_authoritative' => true,
                        'authoritative_action' => null,
                    ],
                    'activation_mode' => $assistOnly
                        ? 'human_confirmation_required'
                        : ($this->activateOnApproval ? 'automatic' : 'seller_confirmation_required'),
                ],
            ]);

            if ($decision === 'approved') {
                if ($this->activateOnApproval) {
                    $this->notifyApproval($ad);
                } else {
                    $this->notifyApprovalPendingReactivation($ad);
                }
            }

            $this->clearPublicCaches();
        } catch (Throwable $error) {
            Log::error('AI moderation failed', [
                'ad_id' => $ad->id,
                'error' => $error->getMessage(),
            ]);
            Cache::put('ai_moderation:provider_unavailable', 'private_gateway_failed', 60);

            $this->leaveForManualReview(
                $ad,
                'La revisión automática falló y el anuncio requiere revisión manual.',
                'failed',
                array_merge([
                    'rollout_mode' => (string) config('ai_moderation.rollout.mode', 'assist'),
                    'technical_status' => 'failed',
                    'runtime' => [
                        'provider' => 'private_gateway',
                        'adapter' => 'python_gateway',
                        'model' => null,
                        'gateway_version' => null,
                        'contract_version' => 'ai-moderation-assist-v1',
                        'runtime_ms' => max(0, (int) round((hrtime(true) - $attemptStartedAt) / 1_000_000)),
                        'budget_seconds' => max(30, min(150, (int) config('ai_moderation.max_runtime_seconds', 150))),
                    ],
                    'assist_only' => (bool) config('ai_moderation.assist_only', true),
                    'human_authoritative' => true,
                    'rollout' => [
                        'mode' => (string) config('ai_moderation.rollout.mode', 'assist'),
                        'assist_only' => (bool) config('ai_moderation.assist_only', true),
                        'human_authoritative' => true,
                        'activate_on_human_approval' => $this->activateOnApproval,
                    ],
                ], $textPolicyMetadata),
            );
        }
    }

    private function moderationImages(Ad $ad, array $imagePaths): array
    {
        $disk = Storage::disk('public');
        $manager = ImageManager::usingDriver(Driver::class);
        $payloads = [];

        foreach ($imagePaths as $imagePath) {
            try {
                if (! $disk->exists($imagePath)) continue;
                $image = $manager->decode($disk->get($imagePath));
                $image->scaleDown(width: 768, height: 768);
                $payloads[] = base64_encode((string) $image->encodeUsingFileExtension('webp', quality: 65));
            } catch (Throwable $mediaError) {
                Log::warning('Local AI moderation skipped unreadable image', [
                    'ad_id' => $ad->id,
                    'image' => $imagePath,
                    'error' => $mediaError->getMessage(),
                ]);
            }
        }

        return $payloads;
    }

    private function moderationVideoFrames(Ad $ad): array
    {
        if (empty($ad->video_url)) return [];

        $disk = Storage::disk('public');
        if (! $disk->exists($ad->video_url)) return [];

        $videoPath = $disk->path($ad->video_url);
        $probe = new Process([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', $videoPath,
        ]);
        $probe->setTimeout(20);

        try {
            $probe->mustRun();
            $duration = max(0.0, (float) trim($probe->getOutput()));
            $times = array_values(array_unique(array_map(
                fn (float $time) => round(max(0, $time), 2),
                [0.0, $duration / 2, max(0, $duration - 0.5)]
            )));
            $frames = [];
            $manager = ImageManager::usingDriver(Driver::class);

            foreach ($times as $time) {
                $base = tempnam(sys_get_temp_dir(), 'mercasto-video-review-');
                if ($base === false) continue;
                @unlink($base);
                $framePath = $base . '.jpg';
                try {
                    $extract = new Process([
                        'ffmpeg', '-y', '-ss', (string) $time, '-i', $videoPath,
                        '-frames:v', '1', '-vf', 'scale=768:-2:force_original_aspect_ratio=decrease',
                        '-q:v', '5', $framePath,
                    ]);
                    $extract->setTimeout(30);
                    $extract->mustRun();
                    if (! is_file($framePath) || filesize($framePath) === 0) continue;
                    $image = $manager->decode(file_get_contents($framePath));
                    $frames[] = base64_encode((string) $image->encodeUsingFileExtension('webp', quality: 65));
                } finally {
                    @unlink($framePath);
                }
            }
            return $frames;
        } catch (Throwable $error) {
            Log::warning('Local AI moderation could not extract video frames', [
                'ad_id' => $ad->id,
                'error' => $error->getMessage(),
            ]);
            return [];
        }
    }

    private function leaveForManualReview(Ad $ad, string $reason, string $aiStatus, array $metadata = []): void
    {
        $ad->refresh();
        if (! $this->isCurrentModerationCycle() || $ad->ai_moderation_status !== 'processing') {
            return;
        }

        $ad->forceFill([
            'status' => 'archived',
            'ai_moderation_status' => $aiStatus,
            'ai_moderation_reason' => $reason,
            'ai_moderation_confidence' => null,
            'ai_moderated_at' => now(),
        ])->saveQuietly();

        $attemptStartedAt = $ad->moderation_submitted_at
            ?: $ad->created_at
            ?: now()->subMinute();
        $alreadyRecorded = AdModerationDecision::query()
            ->where('ad_id', $ad->id)
            ->where('source', 'ai')
            ->where('decision', 'manual_review')
            ->where('created_at', '>=', $attemptStartedAt)
            ->get()
            ->contains(
                fn (AdModerationDecision $decision) =>
                    ($decision->metadata['technical_status'] ?? null) === $aiStatus
            );

        if (! $alreadyRecorded) {
            AdModerationDecision::create([
                'ad_id' => $ad->id,
                'source' => 'ai',
                'decision' => 'manual_review',
                'reason' => $reason,
                'metadata' => array_merge([
                    'technical_status' => $aiStatus,
                    'activation_mode' => 'human_confirmation_required',
                ], $metadata),
            ]);
        }
    }

    private function isCurrentModerationCycle(): bool
    {
        if (! $this->moderationCycleId) {
            return true;
        }

        $cycle = AdModerationDecision::query()
            ->whereKey($this->moderationCycleId)
            ->where('ad_id', $this->adId)
            ->where('source', 'system')
            ->where('decision', 'queued')
            ->first();
        if (! $cycle) {
            return false;
        }

        $latestCycleId = AdModerationDecision::query()
            ->where('ad_id', $this->adId)
            ->where('source', 'system')
            ->where('decision', 'queued')
            ->latest('id')
            ->value('id');

        return (int) $latestCycleId === $this->moderationCycleId;
    }

    private function notifyApprovalPendingReactivation(Ad $ad): void
    {
        try {
            $notification = [
                'user_id' => $ad->user_id,
                'title' => 'Tu anuncio fue revisado',
                'message' => 'Tu anuncio "' . $ad->title . '" fue aprobado. Confirma que sigue disponible y revisa las opciones de renovación desde tu perfil.',
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
            Log::warning('Could not notify moderation reactivation approval', [
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
            Log::warning('Could not notify AI moderation approval', [
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

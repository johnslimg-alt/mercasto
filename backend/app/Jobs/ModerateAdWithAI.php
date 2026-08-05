<?php

namespace App\Jobs;

use App\Events\NewNotification;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\Response;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ModerateAdWithAI implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 24;
    public int $timeout = 90;
    public int $uniqueFor = 600;

    public function __construct(
        public int $adId,
        public bool $activateOnApproval = true,
    )
    {
    }

    public function uniqueId(): string
    {
        return $this->adId . ':' . ($this->activateOnApproval ? 'activate' : 'review');
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(AdIllustrativeCoverService $covers): void
    {
        $ad = Ad::query()->with('user:id,name,email')->find($this->adId);
        if (! $ad || ! in_array($ad->status, ['pending', 'archived'], true)) {
            return;
        }

        $providerError = Cache::get('ai_moderation:provider_unavailable');
        if ($providerError) {
            // Older deployments used a global quota guard. Quotas are actually
            // model-scoped, so clear that legacy guard and let the model pool run.
            if (str_contains(strtolower((string) $providerError), 'quota')) {
                Cache::forget('ai_moderation:provider_unavailable');
            } else {
                $this->leaveForManualReview(
                    $ad,
                    'La moderación automática está temporalmente desactivada por un problema de configuración del proveedor.',
                    'provider_error'
                );
                return;
            }
        }

        $covers->ensureCover($ad);
        $ad->refresh();

        $ad->forceFill([
            'status' => 'archived',
            'moderation_submitted_at' => $ad->moderation_submitted_at ?: $ad->created_at ?: now(),
            'ai_moderation_status' => 'processing',
            'ai_moderation_reason' => null,
        ])->saveQuietly();

        $apiKey = (string) config('services.gemini.api_key');
        if ($apiKey === '') {
            Cache::put('ai_moderation:provider_unavailable', 'GEMINI_API_KEY is not configured.', now()->addHour());
            $this->leaveForManualReview(
                $ad,
                'La moderación automática no está configurada. El anuncio requiere revisión manual.',
                'provider_error'
            );
            return;
        }

        try {
            $parts = [[
                'text' => $this->prompt($ad, $covers->hasOriginalImages($ad)),
            ]];

            foreach (array_slice($covers->originalImages($ad), 0, 3) as $imagePath) {
                try {
                    if (! Storage::disk('public')->exists($imagePath)) {
                        continue;
                    }

                    $parts[] = [
                        'inline_data' => [
                            'mime_type' => Storage::disk('public')->mimeType($imagePath) ?: 'image/jpeg',
                            'data' => base64_encode(Storage::disk('public')->get($imagePath)),
                        ],
                    ];
                } catch (Throwable $mediaError) {
                    Log::warning('AI moderation skipped unreadable image', [
                        'ad_id' => $ad->id,
                        'image' => $imagePath,
                        'error' => $mediaError->getMessage(),
                    ]);
                }
            }

            $payload = [
                'contents' => [['parts' => $parts]],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'responseMimeType' => 'application/json',
                ],
            ];

            $model = null;
            $response = null;
            $result = null;
            $quotaDelays = [];

            foreach ($this->moderationModels() as $candidateModel) {
                $cachedDelay = $this->cachedModelDelay($candidateModel);
                if ($cachedDelay !== null) {
                    $quotaDelays[] = $cachedDelay;
                    continue;
                }

                $candidateResponse = $this->sendModerationRequest($apiKey, $candidateModel, $payload);
                if ($candidateResponse->successful()) {
                    try {
                        $candidateResult = $this->parseResult(
                            (string) $candidateResponse->json('candidates.0.content.parts.0.text', '')
                        );
                    } catch (Throwable $parseError) {
                        $this->guardModel($candidateModel, 300, 'invalid_json');
                        $quotaDelays[] = 300;
                        Log::warning('Gemini moderation model returned invalid JSON; trying fallback', [
                            'ad_id' => $ad->id,
                            'model' => $candidateModel,
                            'error' => $parseError->getMessage(),
                        ]);
                        continue;
                    }

                    $model = $candidateModel;
                    $response = $candidateResponse;
                    $result = $candidateResult;
                    break;
                }

                $providerMessage = trim((string) $candidateResponse->json('error.message', ''));
                $isInvalidKey = $candidateResponse->status() === 400
                    && str_contains(strtolower($providerMessage), 'api key not valid');

                if ($isInvalidKey) {
                    Cache::put(
                        'ai_moderation:provider_unavailable',
                        'Gemini API key is invalid.',
                        now()->addHour()
                    );

                    Log::critical('AI moderation disabled because Gemini API key is invalid', [
                        'ad_id' => $ad->id,
                        'status' => $candidateResponse->status(),
                    ]);

                    $this->leaveForManualReview(
                        $ad,
                        'La moderación automática está temporalmente desactivada por un problema de configuración. El anuncio requiere revisión manual.',
                        'provider_error'
                    );
                    return;
                }

                if ($candidateResponse->status() === 429) {
                    $dailyQuota = $this->isDailyPerModelQuota($candidateResponse);
                    $delay = $dailyQuota
                        ? $this->secondsUntilDailyQuotaReset()
                        : $this->quotaRetryDelay($candidateResponse);
                    $this->guardModel($candidateModel, $delay, $dailyQuota ? 'daily_quota' : 'rate_limit');
                    $quotaDelays[] = $delay;

                    Log::notice('Gemini moderation model quota exhausted; trying fallback', [
                        'ad_id' => $ad->id,
                        'model' => $candidateModel,
                        'daily_quota' => $dailyQuota,
                        'retry_seconds' => $delay,
                    ]);
                    continue;
                }

                if ($candidateResponse->serverError()) {
                    $this->guardModel($candidateModel, 300, 'server_error');
                    $quotaDelays[] = 300;
                    continue;
                }

                throw new \RuntimeException(
                    'Gemini HTTP ' . $candidateResponse->status() . ' for model ' . $candidateModel
                );
            }

            if (! $response instanceof Response || ! is_string($model) || ! is_array($result)) {
                $this->deferForQuota($ad, min($quotaDelays ?: [300]));
                return;
            }

            $decision = $this->safeDecision($result['decision'], $result['confidence']);
            $reason = trim((string) ($result['reason'] ?? 'Sin explicación del modelo.'));
            $confidence = max(0, min(1, (float) ($result['confidence'] ?? 0)));

            $newStatus = match ($decision) {
                'approved' => $this->activateOnApproval ? 'active' : 'archived',
                'rejected' => 'rejected',
                default => 'archived',
            };

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
                    'had_original_images' => $covers->hasOriginalImages($ad),
                    'previous_status' => $previousStatus,
                    'result' => $result,
                    'activation_mode' => $this->activateOnApproval
                        ? 'automatic'
                        : 'seller_confirmation_required',
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

            $this->leaveForManualReview(
                $ad,
                'La revisión automática falló y el anuncio requiere revisión manual.',
                'failed'
            );
        }
    }

    private function sendModerationRequest(string $apiKey, string $model, array $payload): Response
    {
        $request = fn (): Response => Http::timeout(60)
            ->withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])
            ->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                $payload,
            );

        try {
            $response = $request();
        } catch (Throwable $error) {
            usleep(750_000);
            return $request();
        }

        if ($response->serverError()) {
            Log::warning('Gemini moderation transient response; retrying once', [
                'ad_id' => $this->adId,
                'status' => $response->status(),
            ]);
            usleep(750_000);
            return $request();
        }

        return $response;
    }

    private function moderationModels(): array
    {
        $models = config('services.gemini.moderation_models', []);
        if (! is_array($models)) {
            $models = [];
        }

        $models = array_values(array_unique(array_filter(array_map(
            fn (mixed $model) => is_string($model) ? trim($model) : '',
            $models,
        ))));

        if ($models === []) {
            $models[] = (string) config('services.gemini.moderation_model', 'gemini-3.6-flash');
        }

        return $models;
    }

    private function modelGuardKey(string $model): string
    {
        return 'ai_moderation:model_unavailable:' . hash('sha256', $model);
    }

    private function cachedModelDelay(string $model): ?int
    {
        $guard = Cache::get($this->modelGuardKey($model));
        if (! is_array($guard)) {
            return null;
        }

        $retryAt = (int) ($guard['retry_at'] ?? 0);
        $delay = $retryAt - time();
        if ($delay <= 0) {
            Cache::forget($this->modelGuardKey($model));
            return null;
        }

        return $delay;
    }

    private function guardModel(string $model, int $delay, string $reason): void
    {
        $delay = max(60, min(86400, $delay));
        Cache::put(
            $this->modelGuardKey($model),
            [
                'model' => $model,
                'reason' => $reason,
                'retry_at' => time() + $delay,
            ],
            now()->addSeconds($delay),
        );
    }

    private function isDailyPerModelQuota(Response $response): bool
    {
        $details = $response->json('error.details', []);
        $encoded = is_array($details)
            ? json_encode($details, JSON_UNESCAPED_SLASHES)
            : '';

        return is_string($encoded)
            && str_contains($encoded, 'GenerateRequestsPerDayPerProjectPerModel');
    }

    private function secondsUntilDailyQuotaReset(): int
    {
        $nowPacific = now('America/Los_Angeles');
        $resetPacific = $nowPacific->copy()->addDay()->startOfDay()->addMinutes(5);

        return max(300, (int) $nowPacific->diffInSeconds($resetPacific));
    }

    private function deferForQuota(Ad $ad, int $delay): void
    {
        $delay = max(60, min(21600, $delay));

        if ($this->attempts() >= $this->tries) {
            $this->leaveForManualReview(
                $ad,
                'La moderación automática sigue temporalmente sin cuota. El anuncio requiere revisión manual.',
                'provider_quota'
            );
            return;
        }

        $ad->forceFill([
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'ai_moderation_reason' => 'Esperando disponibilidad temporal del proveedor de moderación.',
            'ai_moderation_confidence' => null,
            'ai_moderated_at' => null,
        ])->saveQuietly();

        Log::notice('AI moderation deferred for Gemini quota recovery', [
            'ad_id' => $ad->id,
            'attempt' => $this->attempts(),
            'delay_seconds' => $delay,
        ]);

        $this->release($delay);
    }

    private function quotaRetryDelay(Response $response): int
    {
        $retryAfter = trim((string) $response->header('Retry-After', ''));
        if (ctype_digit($retryAfter)) {
            return max(60, min(900, (int) $retryAfter));
        }

        $details = $response->json('error.details', []);
        $encoded = is_array($details)
            ? json_encode($details, JSON_UNESCAPED_SLASHES)
            : '';

        if (is_string($encoded) && preg_match('/"retryDelay"\s*:\s*"?(\d+)s"?/i', $encoded, $matches)) {
            return max(60, min(900, (int) $matches[1]));
        }

        return 180;
    }

    private function prompt(Ad $ad, bool $hasOriginalImages): string
    {
        $attributes = json_encode($ad->attributes ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $photoNotice = $hasOriginalImages
            ? 'Se adjuntan fotografías originales del vendedor.'
            : 'El vendedor NO agregó fotografías originales. La imagen visible es una portada ilustrativa de Mercasto y no prueba el estado ni la apariencia del producto.';

        return <<<PROMPT
Eres el moderador de seguridad de Mercasto, un mercado de anuncios clasificados en México.
Analiza texto, atributos y fotografías originales. {$photoNotice}

Devuelve exclusivamente JSON válido con esta forma:
{"decision":"approved|manual_review|rejected","reason":"explicación breve y concreta en español","confidence":0.0,"flags":["..."]}

Reglas:
- Rechaza contenido sexual explícito, explotación, drogas ilegales, armas o explosivos, documentos falsos, bienes robados, fraude evidente, suplantación, odio, amenazas o instrucciones delictivas.
- Rechaza fotos que contradigan claramente el producto, incluyan datos extremadamente sensibles o contenido prohibido.
- Usa manual_review ante dudas, posible estafa, precio incoherente, descripción insuficiente, afirmaciones médicas/financieras delicadas, producto regulado o discrepancia entre texto y foto.
- La ausencia de foto por sí sola NO es motivo de rechazo; puede aprobarse si el texto es claro y permitido.
- No inventes hechos. Si no puedes determinarlo con seguridad, usa manual_review.
- approved solo con alta confianza; rejected solo con evidencia clara.

ID: {$ad->id}
Título: {$ad->title}
Descripción: {$ad->description}
Categoría: {$ad->category}
Subcategoría: {$ad->subcategory}
Precio MXN: {$ad->price}
Ubicación: {$ad->location}, {$ad->state}
Condición: {$ad->condition}
Atributos: {$attributes}
PROMPT;
    }

    private function parseResult(string $raw): array
    {
        $raw = trim(preg_replace('/^```(?:json)?|```$/m', '', $raw) ?? $raw);
        $decoded = json_decode($raw, true);

        if (! is_array($decoded) && preg_match('/\{.*\}/s', $raw, $matches)) {
            $decoded = json_decode($matches[0], true);
        }

        if (! is_array($decoded)) {
            throw new \RuntimeException('Gemini returned invalid JSON.');
        }

        $decision = strtolower((string) ($decoded['decision'] ?? $decoded['status'] ?? 'manual_review'));
        if ($decision === 'active') {
            $decision = 'approved';
        }
        if (! in_array($decision, ['approved', 'manual_review', 'rejected'], true)) {
            $decision = 'manual_review';
        }

        return [
            'decision' => $decision,
            'reason' => (string) ($decoded['reason'] ?? ''),
            'confidence' => is_numeric($decoded['confidence'] ?? null) ? (float) $decoded['confidence'] : 0.0,
            'flags' => is_array($decoded['flags'] ?? null) ? array_values($decoded['flags']) : [],
        ];
    }

    private function safeDecision(string $decision, float $confidence): string
    {
        if ($decision === 'approved' && $confidence >= 0.85) {
            return 'approved';
        }

        if ($decision === 'rejected' && $confidence >= 0.90) {
            return 'rejected';
        }

        return 'manual_review';
    }

    private function leaveForManualReview(Ad $ad, string $reason, string $aiStatus): void
    {
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
                'metadata' => [
                    'technical_status' => $aiStatus,
                    'activation_mode' => $this->activateOnApproval
                        ? 'automatic'
                        : 'seller_confirmation_required',
                ],
            ]);
        }
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
                'title' => '¡Anuncio aprobado!',
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

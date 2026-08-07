<?php

namespace App\Jobs;

use App\Events\NewNotification;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Services\AdIllustrativeCoverService;
use App\Services\LocalAiClient;
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
use Throwable;

class ModerateAdWithAI implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 180;
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

    public function handle(AdIllustrativeCoverService $covers, LocalAiClient $ai): void
    {
        $ad = Ad::query()->with('user:id,name,email')->find($this->adId);
        if (! $ad || ! in_array($ad->status, ['pending', 'archived'], true)) {
            return;
        }

        Cache::forget('ai_moderation:provider_unavailable');

        $covers->ensureCover($ad);
        $ad->refresh();

        $ad->forceFill([
            'status' => 'archived',
            'moderation_submitted_at' => $ad->moderation_submitted_at ?: $ad->created_at ?: now(),
            'ai_moderation_status' => 'processing',
            'ai_moderation_reason' => null,
        ])->saveQuietly();

        try {
            $images = [];
            foreach (array_slice($covers->originalImages($ad), 0, 3) as $imagePath) {
                try {
                    if (! Storage::disk('public')->exists($imagePath)) {
                        continue;
                    }
                    $images[] = base64_encode(Storage::disk('public')->get($imagePath));
                } catch (Throwable $mediaError) {
                    Log::warning('Local AI moderation skipped unreadable image', [
                        'ad_id' => $ad->id,
                        'image' => $imagePath,
                        'error' => $mediaError->getMessage(),
                    ]);
                }
            }

            $messages = [
                ['role' => 'system', 'content' => 'Eres el moderador privado de Mercasto. Responde exclusivamente JSON válido, sin markdown ni texto adicional.'],
                ['role' => 'user', 'content' => $this->prompt($ad, $covers->hasOriginalImages($ad)), 'images' => $images],
            ];

            $aiResponse = $ai->chatPro($messages, [
                'temperature' => 0.1,
                'max_tokens' => 320,
                'timeout' => 150,
                'num_ctx' => 4096,
            ]);
            $model = (string) ($aiResponse['model'] ?? config('services.ollama.chat_model', 'qwen3-vl:4b-instruct'));
            $result = $this->parseResult((string) data_get($aiResponse, 'choices.0.message.content', ''));

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
            throw new \RuntimeException('Local AI returned invalid JSON.');
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

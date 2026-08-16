<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class PublicImageModerationService
{
    public function __construct(private readonly LocalAiClient $ai)
    {
    }

    public function assertApproved(UploadedFile $file, string $context, string $field): void
    {
        try {
            $manager = ImageManager::usingDriver(Driver::class);
            $image = $manager->decode(file_get_contents($file->getRealPath()));
            $image->scaleDown(width: 768, height: 768);
            $payload = base64_encode((string) $image->encodeUsingFileExtension('webp', quality: 68));

            $response = $this->ai->chatPro([
                [
                    'role' => 'system',
                    'content' => 'Eres el moderador privado de imágenes públicas de Mercasto. Responde exclusivamente JSON válido, sin markdown.',
                ],
                [
                    'role' => 'user',
                    'content' => $this->prompt($context),
                    'images' => [$payload],
                ],
            ], [
                'temperature' => 0.1,
                'max_tokens' => 220,
                'timeout' => 90,
                'num_ctx' => 3072,
            ]);

            $result = $this->parseResult((string) data_get($response, 'choices.0.message.content', ''));
            if ($result['decision'] === 'approved' && $result['confidence'] >= 0.90) {
                return;
            }

            Log::notice('Public image blocked by local AI moderation', [
                'context' => $context,
                'decision' => $result['decision'],
                'confidence' => $result['confidence'],
                'reason' => $result['reason'],
            ]);

            throw ValidationException::withMessages([
                $field => ['La imagen no pudo aprobarse para publicación. Usa otra imagen que no contenga contenido prohibido, documentos personales ni material sensible.'],
            ]);
        } catch (ValidationException $error) {
            throw $error;
        } catch (Throwable $error) {
            Log::error('Public image local AI moderation unavailable', [
                'context' => $context,
                'error' => $error->getMessage(),
            ]);

            throw new HttpException(
                503,
                'La revisión automática de la imagen no está disponible en este momento. La imagen anterior se mantiene sin cambios.'
            );
        }
    }

    private function prompt(string $context): string
    {
        return <<<PROMPT
Analiza la imagen que se quiere publicar en una superficie pública de Mercasto.
Contexto: {$context}.

Devuelve exclusivamente JSON válido:
{"decision":"approved|manual_review|rejected","reason":"motivo breve en español","confidence":0.0,"flags":["..."]}

Reglas:
- Rechaza desnudez o contenido sexual explícito, explotación, violencia gráfica, armas, drogas ilegales, odio, amenazas, fraude evidente o instrucciones delictivas.
- Rechaza identificaciones, pasaportes, tarjetas bancarias, comprobantes u otros documentos con datos personales sensibles usados como imagen pública.
- Rechaza imágenes claramente diseñadas para suplantar a otra persona o empresa, phishing o engaño.
- Logotipos comerciales normales, retratos apropiados, productos y fotografías de negocio permitidas pueden aprobarse.
- Si existe duda material, usa manual_review. No inventes hechos.
- approved solo con alta confianza.
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
            throw new \RuntimeException('Local AI returned invalid moderation JSON.');
        }

        $decision = strtolower((string) ($decoded['decision'] ?? 'manual_review'));
        if (! in_array($decision, ['approved', 'manual_review', 'rejected'], true)) {
            $decision = 'manual_review';
        }

        return [
            'decision' => $decision,
            'reason' => trim((string) ($decoded['reason'] ?? 'Sin explicación del modelo.')),
            'confidence' => is_numeric($decoded['confidence'] ?? null)
                ? max(0, min(1, (float) $decoded['confidence']))
                : 0.0,
        ];
    }
}

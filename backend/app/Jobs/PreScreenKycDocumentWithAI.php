<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\LocalAiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Throwable;

class PreScreenKycDocumentWithAI implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;
    public int $uniqueFor = 300;

    public function __construct(public int $userId) {}

    public function uniqueId(): string
    {
        return (string) $this->userId;
    }

    public function handle(LocalAiClient $ai): void
    {
        $user = User::query()->find($this->userId);
        if (! $user || $user->kyc_status !== 'pending' || ! $user->kyc_document_url) return;

        $disk = Storage::disk('local');
        if (! $disk->exists($user->kyc_document_url)) {
            $this->storeResult($user, 'manual_review', 'El archivo no está disponible para el prefiltro. Revisión manual requerida.');
            return;
        }

        $user->forceFill(['kyc_ai_status' => 'processing', 'kyc_ai_notes' => null, 'kyc_ai_checked_at' => null])->saveQuietly();

        try {
            $extension = strtolower(pathinfo($user->kyc_document_url, PATHINFO_EXTENSION));
            $messages = [
                ['role' => 'system', 'content' => 'Eres un prefiltro técnico privado de documentos de identidad. No decides identidad, elegibilidad ni autenticidad legal. Responde solo JSON válido.'],
            ];

            if ($extension === 'pdf') {
                $parser = new \Smalot\PdfParser\Parser();
                $text = trim($parser->parseFile($disk->path($user->kyc_document_url))->getText());
                if (mb_strlen($text) < 40) {
                    $this->storeResult($user, 'manual_review', 'PDF escaneado o sin texto legible; requiere revisión visual manual.');
                    return;
                }
                $messages[] = ['role' => 'user', 'content' => $this->prompt() . "\n\nTexto extraído del documento:\n" . mb_substr($text, 0, 5000)];
            } else {
                $manager = ImageManager::usingDriver(Driver::class);
                $image = $manager->decode($disk->get($user->kyc_document_url));
                $image->scaleDown(width: 1280, height: 1280);
                $encoded = (string) $image->encodeUsingFileExtension('webp', quality: 72);
                $messages[] = ['role' => 'user', 'content' => $this->prompt(), 'images' => [base64_encode($encoded)]];
            }

            $response = $ai->chatPro($messages, ['temperature' => 0, 'max_tokens' => 220, 'timeout' => 100, 'num_ctx' => 4096]);
            $result = $this->parse((string) data_get($response, 'choices.0.message.content', ''));
            $this->storeResult($user, $result['verdict'], $result['notes']);
        } catch (Throwable $error) {
            Log::warning('KYC local AI pre-screen failed', ['user_id' => $user->id, 'error' => $error->getMessage()]);
            $this->storeResult($user, 'failed', 'El prefiltro automático no pudo completarse. Revisión manual requerida.');
        }
    }

    private function prompt(): string
    {
        return <<<'PROMPT'
Evalúa únicamente aspectos técnicos del archivo adjunto para ayudar a un administrador humano.
No identifiques a la persona, no infieras edad, nacionalidad, raza, salud u otros atributos sensibles, y no decidas si alguien merece acceso al servicio.
Comprueba solamente si el archivo parece ser un documento de identidad legible y si hay problemas técnicos evidentes que requieran revisión humana: archivo equivocado, documento ilegible, imagen cortada, texto imposible de leer o manipulación visual obvia.

Devuelve exclusivamente JSON válido:
{"verdict":"pass|manual_review","notes":"explicación técnica breve en español"}
Usa pass solo cuando no haya alertas técnicas visibles. Ante cualquier duda usa manual_review.
PROMPT;
    }

    private function parse(string $raw): array
    {
        $raw = trim(preg_replace('/^```(?:json)?|```$/m', '', $raw) ?? $raw);
        $decoded = json_decode($raw, true);
        if (! is_array($decoded) && preg_match('/\{.*\}/s', $raw, $matches)) $decoded = json_decode($matches[0], true);
        $verdict = is_array($decoded) ? strtolower((string) ($decoded['verdict'] ?? 'manual_review')) : 'manual_review';
        if (! in_array($verdict, ['pass', 'manual_review'], true)) $verdict = 'manual_review';
        return ['verdict' => $verdict, 'notes' => trim((string) ($decoded['notes'] ?? 'Revisión manual requerida.'))];
    }

    private function storeResult(User $user, string $status, string $notes): void
    {
        $user->forceFill(['kyc_ai_status' => $status, 'kyc_ai_notes' => $notes, 'kyc_ai_checked_at' => now()])->saveQuietly();
    }
}

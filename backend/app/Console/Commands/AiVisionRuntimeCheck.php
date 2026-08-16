<?php

namespace App\Console\Commands;

use App\Services\LocalAiClient;
use Illuminate\Console\Command;
use Throwable;

class AiVisionRuntimeCheck extends Command
{
    protected $signature = 'ai:vision-runtime-check {--timeout=60 : Maximum local Ollama request time in seconds}';

    protected $description = 'Measure the local vision-model path with a synthetic in-memory image and no user data.';

    public function handle(LocalAiClient $client): int
    {
        $timeout = max(30, min(120, (int) $this->option('timeout')));
        $startedAt = hrtime(true);

        try {
            $payload = $this->syntheticImagePayload();
            $response = $client->chatPro([
                [
                    'role' => 'system',
                    'content' => 'Eres una comprobación interna de visión de Mercasto. Responde exclusivamente JSON válido y breve.',
                ],
                [
                    'role' => 'user',
                    'content' => 'Confirma que puedes analizar esta imagen sintética. Devuelve {"ok":true}.',
                    'images' => [$payload],
                ],
            ], [
                'temperature' => 0.0,
                'max_tokens' => 220,
                'timeout' => $timeout,
                'num_ctx' => 3072,
            ]);
        } catch (Throwable $error) {
            $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
            $this->error('local AI vision runtime check FAILED: ' . $error::class);
            $this->line('elapsed_ms=' . $elapsedMs);
            return self::FAILURE;
        }

        if (($response['provider'] ?? null) !== 'ollama') {
            $this->error('local AI vision runtime check FAILED: unexpected provider');
            return self::FAILURE;
        }

        $content = trim((string) data_get($response, 'choices.0.message.content', ''));
        $model = trim((string) ($response['model'] ?? ''));
        if ($content === '' || $model === '') {
            $this->error('local AI vision runtime check FAILED: incomplete response');
            return self::FAILURE;
        }

        $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
        $this->info('local AI vision runtime OK provider=ollama model=' . $model);
        $this->line('elapsed_ms=' . $elapsedMs);
        return self::SUCCESS;
    }

    private function syntheticImagePayload(): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new \RuntimeException('GD image support is unavailable.');
        }

        $image = imagecreatetruecolor(768, 768);
        if ($image === false) {
            throw new \RuntimeException('Synthetic image allocation failed.');
        }

        try {
            $white = imagecolorallocate($image, 255, 255, 255);
            $black = imagecolorallocate($image, 0, 0, 0);
            imagefilledrectangle($image, 0, 0, 767, 767, $white);
            imagerectangle($image, 160, 160, 608, 608, $black);
            imageline($image, 160, 160, 608, 608, $black);
            imageline($image, 608, 160, 160, 608, $black);

            ob_start();
            imagepng($image, null, 6);
            $binary = ob_get_clean();
        } finally {
            imagedestroy($image);
        }

        if (! is_string($binary) || $binary === '') {
            throw new \RuntimeException('Synthetic image encoding failed.');
        }

        return base64_encode($binary);
    }
}

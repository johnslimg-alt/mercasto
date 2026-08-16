<?php

namespace App\Console\Commands;

use App\Services\LocalAiClient;
use Illuminate\Console\Command;
use Throwable;

class AiRuntimeCheck extends Command
{
    protected $signature = 'ai:runtime-check {--timeout=45 : Maximum local Ollama request time in seconds}';

    protected $description = 'Verify the configured local Ollama path without sending user data.';

    public function handle(LocalAiClient $client): int
    {
        $timeout = max(30, min(120, (int) $this->option('timeout')));
        $startedAt = hrtime(true);

        try {
            $response = $client->chatFlash([
                [
                    'role' => 'system',
                    'content' => 'This is an internal Mercasto runtime health check. Do not request or infer user data.',
                ],
                [
                    'role' => 'user',
                    'content' => 'Return a short acknowledgement that the local model is available.',
                ],
            ], [
                'timeout' => $timeout,
                'temperature' => 0.0,
                'max_tokens' => 8,
                'num_ctx' => 512,
            ]);
        } catch (Throwable $error) {
            $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
            $this->error('local AI runtime check FAILED: ' . $error::class);
            $this->line('elapsed_ms=' . $elapsedMs);

            return self::FAILURE;
        }

        if (($response['provider'] ?? null) !== 'ollama') {
            $this->error('local AI runtime check FAILED: unexpected provider');
            return self::FAILURE;
        }

        $model = trim((string) ($response['model'] ?? ''));
        if ($model === '') {
            $this->error('local AI runtime check FAILED: model was not reported');
            return self::FAILURE;
        }

        $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
        $this->info('local AI runtime OK provider=ollama model=' . $model);
        $this->line('elapsed_ms=' . $elapsedMs);

        return self::SUCCESS;
    }
}

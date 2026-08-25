<?php

namespace App\Console\Commands;

use App\Services\LocalAiClient;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Throwable;

class AiRuntimeCheck extends Command
{
    protected $signature = 'ai:runtime-check {--timeout=45 : Maximum local Ollama request time in seconds} {--attempts=2 : Maximum health-probe attempts after transport failures}';

    protected $description = 'Verify the configured local Ollama path without sending user data.';

    public function handle(LocalAiClient $client): int
    {
        $timeout = max(30, min(120, (int) $this->option('timeout')));
        $attempts = max(1, min(3, (int) $this->option('attempts')));
        $startedAt = hrtime(true);

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            $attemptStartedAt = hrtime(true);

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
            } catch (ConnectionException $error) {
                $attemptElapsedMs = (int) round((hrtime(true) - $attemptStartedAt) / 1_000_000);
                $this->error(sprintf(
                    'local AI runtime transport failure attempt=%d/%d exception=%s elapsed_ms=%d',
                    $attempt,
                    $attempts,
                    $error::class,
                    $attemptElapsedMs,
                ));

                if ($attempt === $attempts) {
                    $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
                    $this->error(sprintf('local AI runtime check FAILED after %d transport attempt(s)', $attempts));
                    $this->line('elapsed_ms=' . $elapsedMs);

                    return self::FAILURE;
                }

                continue;
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

        return self::FAILURE;
    }
}

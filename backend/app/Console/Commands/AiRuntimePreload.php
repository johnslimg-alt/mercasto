<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

class AiRuntimePreload extends Command
{
    protected $signature = 'ai:runtime-preload {--timeout=90 : Maximum preload time in seconds}';

    protected $description = 'Preload the configured local Ollama text model without user data and verify it is resident.';

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $model = trim((string) config('services.ollama.chat_model', 'qwen2.5:1.5b'));
        $keepAlive = config('services.ollama.keep_alive', '24h');
        $timeout = max(30, min(180, (int) $this->option('timeout')));
        $startedAt = hrtime(true);

        if ($baseUrl === '' || $model === '') {
            $this->error('local AI preload FAILED stage=config');
            return self::FAILURE;
        }

        try {
            $response = Http::acceptJson()->asJson()
                ->connectTimeout(3)
                ->timeout($timeout)
                ->post($baseUrl . '/api/generate', [
                    'model' => $model,
                    'stream' => false,
                    'keep_alive' => $keepAlive,
                ]);
        } catch (Throwable $error) {
            $this->error('local AI preload FAILED stage=request type=' . $error::class);
            return self::FAILURE;
        }

        if ($response->failed()) {
            $this->error('local AI preload FAILED stage=request status=' . $response->status());
            return self::FAILURE;
        }

        try {
            $ps = Http::acceptJson()->connectTimeout(3)->timeout(8)->get($baseUrl . '/api/ps');
        } catch (Throwable $error) {
            $this->error('local AI preload FAILED stage=verify type=' . $error::class);
            return self::FAILURE;
        }

        if ($ps->failed()) {
            $this->error('local AI preload FAILED stage=verify status=' . $ps->status());
            return self::FAILURE;
        }

        $loaded = collect($ps->json('models', []))->contains(function (array $entry) use ($model): bool {
            return ($entry['name'] ?? null) === $model || ($entry['model'] ?? null) === $model;
        });

        if (! $loaded) {
            $this->error('local AI preload FAILED stage=verify loaded=no');
            return self::FAILURE;
        }

        $elapsedMs = (int) round((hrtime(true) - $startedAt) / 1_000_000);
        $this->info('local AI preload OK');
        $this->line('model=' . $model);
        $this->line('loaded=yes');
        $this->line('keep_alive=' . (string) $keepAlive);
        $this->line('elapsed_ms=' . $elapsedMs);

        return self::SUCCESS;
    }
}

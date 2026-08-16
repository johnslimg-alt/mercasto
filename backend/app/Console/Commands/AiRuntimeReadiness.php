<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

class AiRuntimeReadiness extends Command
{
    protected $signature = 'ai:runtime-readiness';

    protected $description = 'Check local Ollama transport, configured model installation and load state without user data.';

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $model = trim((string) config('services.ollama.chat_model', 'qwen3-vl:4b-instruct'));
        $host = (string) (parse_url($baseUrl, PHP_URL_HOST) ?: 'invalid');

        if ($baseUrl === '' || $model === '') {
            $this->error('local AI readiness FAILED');
            $this->error('stage=config');
            return self::FAILURE;
        }

        try {
            $tags = Http::acceptJson()->connectTimeout(3)->timeout(8)->get($baseUrl . '/api/tags');
        } catch (Throwable $error) {
            $this->error('local AI readiness FAILED');
            $this->error('stage=transport');
            $this->error('host=' . $host);
            $this->error('type=' . $error::class);
            return self::FAILURE;
        }

        if ($tags->failed()) {
            $this->error('local AI readiness FAILED');
            $this->error('stage=tags');
            $this->error('host=' . $host);
            $this->error('status=' . $tags->status());
            return self::FAILURE;
        }

        $installed = collect($tags->json('models', []))
            ->flatMap(fn (array $entry): array => array_filter([
                (string) ($entry['name'] ?? ''),
                (string) ($entry['model'] ?? ''),
            ]))
            ->filter()
            ->unique()
            ->values();

        if (! $installed->contains($model)) {
            $this->error('local AI readiness FAILED');
            $this->error('stage=model_missing');
            $this->error('configured=' . $model);
            $this->error('installed_count=' . $installed->count());
            return self::FAILURE;
        }

        $loaded = false;
        try {
            $ps = Http::acceptJson()->connectTimeout(3)->timeout(8)->get($baseUrl . '/api/ps');
            if ($ps->successful()) {
                $loaded = collect($ps->json('models', []))->contains(function (array $entry) use ($model): bool {
                    return ($entry['name'] ?? null) === $model || ($entry['model'] ?? null) === $model;
                });
            }
        } catch (Throwable) {
            // Load-state is diagnostic only. Transport/model installation already passed.
        }

        $this->info('local AI readiness OK');
        $this->info('host=' . $host);
        $this->info('configured=' . $model);
        $this->info('installed=yes');
        $this->info('loaded=' . ($loaded ? 'yes' : 'no'));
        $this->info('installed_count=' . $installed->count());

        return self::SUCCESS;
    }
}

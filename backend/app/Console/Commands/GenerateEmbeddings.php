<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class GenerateEmbeddings extends Command
{
    protected $signature = 'mercasto:generate-embeddings
        {--limit=0 : Maximum number of listings to process (0 = all eligible)}
        {--include-catalog : Include catalog reference listings}
        {--dry-run : Report eligible listings without calling Ollama or writing vectors}';
    protected $description = 'Generate vector embeddings for all active listings using the local Ollama instance';

    public function handle(): int
    {
        $includeCatalog = (bool) $this->option('include-catalog');
        $limit = max(0, (int) $this->option('limit'));

        $query = Ad::query()
            ->where('status', 'active')
            ->when(! $includeCatalog, fn ($builder) => $builder->where('is_catalog_filler', false))
            ->orderBy('id');

        if ($limit > 0) {
            $query->limit($limit);
        }

        $ads = $query->get();
        $total = $ads->count();
        $scope = $includeCatalog ? 'active listings (including catalog references)' : 'active genuine listings';
        $this->info("Found {$total} {$scope}.");

        if ((bool) $this->option('dry-run')) {
            $this->info('Dry run: no Ollama requests or database writes were performed.');

            return self::SUCCESS;
        }

        $this->info('Starting embedding generation...');

        $success = 0;
        $failed = 0;

        foreach ($ads as $index => $ad) {
            $this->info("Processing listing " . ($index + 1) . "/{$total}: {$ad->title}");
            
            // Construct embedding source text
            $text = "Title: " . $ad->title . 
                    ". Description: " . ($ad->description ?? '') . 
                    ". Category: " . $ad->category . 
                    ". State: " . ($ad->state ?? '') . 
                    ". Location: " . ($ad->location ?? '');

            try {
                $ollamaUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/') . '/api/embeddings';
                
                $response = Http::timeout(30)->post($ollamaUrl, [
                    'model' => 'nomic-embed-text',
                    'prompt' => $text,
                ]);

                if ($response->successful() && $embedding = $response->json('embedding')) {
                    $embeddingString = '[' . implode(',', $embedding) . ']';
                    
                    // 1. Save to embeddings table using insert/update statement
                    DB::statement('
                        INSERT INTO embeddings (ad_id, embedding, created_at, updated_at) 
                        VALUES (?, ?::vector, NOW(), NOW())
                        ON CONFLICT (ad_id) 
                        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
                    ', [$ad->id, $embeddingString]);

                    // 2. Also update ads table embedding column for compatibility
                    DB::statement('UPDATE ads SET embedding = ?::vector WHERE id = ?', [$embeddingString, $ad->id]);

                    $success++;
                } else {
                    $this->error("Ollama API failed for ad ID {$ad->id}: " . $response->body());
                    $failed++;
                }
            } catch (\Exception $e) {
                $this->error("Error calling Ollama for ad ID {$ad->id}: " . $e->getMessage());
                $failed++;
            }
        }

        $this->info("Done! Successfully generated {$success} embeddings. Failed {$failed}.");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}

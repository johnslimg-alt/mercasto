<?php

namespace App\Console\Commands;

use App\Models\Ad;
use App\Services\AI\SemanticSearchService;
use Illuminate\Console\Command;
use Throwable;

class GenerateEmbeddings extends Command
{
    protected $signature = 'mercasto:generate-embeddings
        {--limit=0 : Maximum number of listings to process (0 = all eligible)}
        {--dry-run : Report eligible listings without calling Ollama or writing vectors}';

    protected $description = 'Generate canonical local embeddings for genuine active listings';

    public function __construct(private SemanticSearchService $semanticSearch)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $query = Ad::query()
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
            ->orderBy('id');

        if ($limit > 0) {
            $query->limit($limit);
        }

        $ads = $query->get();
        $this->info("Found {$ads->count()} active genuine listings.");

        if ((bool) $this->option('dry-run')) {
            $this->info('Dry run: no local embedding requests or database writes were performed.');

            return self::SUCCESS;
        }

        $success = 0;
        $failed = 0;
        foreach ($ads as $index => $ad) {
            $this->info('Processing listing '.($index + 1)."/{$ads->count()}: {$ad->title}");
            try {
                if ($this->semanticSearch->generateEmbedding($ad)) {
                    $success++;
                } else {
                    $failed++;
                }
            } catch (Throwable $exception) {
                $this->error("Embedding failed for ad ID {$ad->id}: {$exception->getMessage()}");
                $failed++;
            }
        }

        $this->info("Done! Successfully generated {$success} embeddings. Failed {$failed}.");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}

<?php

namespace App\Jobs;

use App\Models\Ad;
use App\Services\AI\SemanticSearchService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateAdEmbedding implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;
    public int $uniqueFor = 300;

    public function __construct(public int $adId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->adId;
    }

    public function handle(SemanticSearchService $semanticSearch): void
    {
        $ad = Ad::query()->find($this->adId);
        if (! $ad) {
            return;
        }

        $semanticSearch->generateEmbedding($ad);
    }
}

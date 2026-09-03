<?php

namespace App\Jobs;

use App\Services\AI\FraudDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ScoreFraudRiskBatch implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 300;

    public int $uniqueFor = 120;

    public function __construct(public int $limit = 50)
    {
        $this->limit = max(1, min(100, $limit));
        $this->onQueue('ai-moderation');
    }

    public function uniqueId(): string
    {
        return 'fraud-risk-batch';
    }

    public function backoff(): array
    {
        return [30];
    }

    public function handle(FraudDetectionService $fraudDetection): void
    {
        $fraudDetection->batchAnalyze($this->limit);
    }
}

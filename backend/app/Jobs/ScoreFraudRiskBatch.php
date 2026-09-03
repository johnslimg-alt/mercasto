<?php

namespace App\Jobs;

use App\Services\AI\FraudDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;

class ScoreFraudRiskBatch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct(public int $limit = 50)
    {
        $this->limit = max(1, min(100, $limit));
        $this->onQueue('ai-moderation');
    }

    public function middleware(): array
    {
        return [(new WithoutOverlapping('fraud-risk-batch'))->releaseAfter(30)->expireAfter(360)];
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

<?php

namespace Tests\Feature;

use App\Jobs\ScoreFraudRiskBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PythonFraudRiskAsyncBatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_batch_endpoint_queues_bounded_background_work(): void
    {
        Queue::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/moderation/process-pending', [
            'mode' => 'risk',
            'limit' => 100,
        ])->assertStatus(202)
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true)
            ->assertJsonPath('limit', 100)
            ->assertJsonPath('mode', 'shadow_assist')
            ->assertJsonPath('authoritative', false);

        Queue::assertPushedOn('ai-moderation', ScoreFraudRiskBatch::class, function (ScoreFraudRiskBatch $job): bool {
            return $job->limit === 100;
        });
    }

    public function test_risk_batch_job_clamps_limit_before_queue_execution(): void
    {
        $job = new ScoreFraudRiskBatch(999);

        $this->assertSame(100, $job->limit);
        $this->assertSame('fraud-risk-batch', $job->uniqueId());
    }
}

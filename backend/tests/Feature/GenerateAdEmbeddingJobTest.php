<?php

namespace Tests\Feature;

use App\Jobs\GenerateAdEmbedding;
use App\Models\Ad;
use App\Models\User;
use App\Services\AI\SemanticSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class GenerateAdEmbeddingJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_generates_embedding_for_existing_ad(): void
    {
        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Bicicleta',
            'description' => 'Descripción',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
        ]);

        $service = Mockery::mock(SemanticSearchService::class);
        $service->shouldReceive('generateEmbedding')
            ->once()
            ->with(Mockery::on(fn (Ad $value) => $value->id === $ad->id))
            ->andReturnTrue();

        (new GenerateAdEmbedding($ad->id))->handle($service);
    }

    public function test_job_ignores_missing_ad(): void
    {
        $service = Mockery::mock(SemanticSearchService::class);
        $service->shouldNotReceive('generateEmbedding');

        (new GenerateAdEmbedding(999999))->handle($service);
    }
}

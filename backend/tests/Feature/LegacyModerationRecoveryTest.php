<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LegacyModerationRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_is_dry_run_by_default_and_execute_is_review_only(): void
    {
        Bus::fake();
        Cache::forget('ai_moderation:provider_unavailable');
        config(['services.ollama.chat_model' => 'qwen3-vl:4b-instruct']);

        $seller = User::factory()->create();
        $eligible = $this->ad($seller, [
            'status' => 'archived',
            'ai_moderation_status' => null,
            'moderation_submitted_at' => now()->subDays(10),
        ]);
        $secondEligible = $this->ad($seller, [
            'status' => 'archived',
            'ai_moderation_status' => null,
            'moderation_submitted_at' => now()->subDays(9),
        ]);
        $catalog = $this->ad($seller, [
            'status' => 'archived',
            'is_catalog_filler' => true,
            'moderation_submitted_at' => now()->subDays(10),
        ]);
        $rejected = $this->ad($seller, [
            'status' => 'rejected',
            'moderation_submitted_at' => now()->subDays(10),
        ]);
        $manualReview = $this->ad($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'moderation_submitted_at' => now()->subDays(11),
        ]);

        $this->artisan('ads:requeue-legacy-moderation', ['--limit' => 10])
            ->assertSuccessful();
        Bus::assertNothingDispatched();

        $this->artisan('ads:requeue-legacy-moderation', [
            '--limit' => 10,
            '--spacing' => 45,
            '--execute' => true,
        ])->assertSuccessful();

        Bus::assertDispatchedTimes(ModerateAdWithAI::class, 2);
        Bus::assertDispatched(ModerateAdWithAI::class, function ($job) use ($eligible) {
            return $job->adId === $eligible->id
                && $job->activateOnApproval === false
                && $job->delay !== null;
        });
        Bus::assertDispatched(ModerateAdWithAI::class, function ($job) use ($secondEligible) {
            return $job->adId === $secondEligible->id
                && $job->activateOnApproval === false
                && $job->delay !== null
                && $job->delay->greaterThan(now()->addSeconds(30));
        });
        Bus::assertNotDispatched(ModerateAdWithAI::class, fn ($job) => $job->adId === $catalog->id);
        Bus::assertNotDispatched(ModerateAdWithAI::class, fn ($job) => $job->adId === $rejected->id);
        Bus::assertNotDispatched(ModerateAdWithAI::class, fn ($job) => $job->adId === $manualReview->id);

        $eligible->refresh();
        $this->assertSame('archived', $eligible->status);
        $this->assertSame('queued', $eligible->ai_moderation_status);
        $this->assertNotNull($eligible->moderation_submitted_at);
    }


    public function test_manual_review_requires_an_explicit_override_to_requeue(): void
    {
        Bus::fake();
        Cache::forget('ai_moderation:provider_unavailable');
        config(['services.ollama.chat_model' => 'qwen3-vl:4b-instruct']);

        $seller = User::factory()->create();
        $manualReview = $this->ad($seller, [
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'moderation_submitted_at' => now()->subDays(10),
        ]);

        $this->artisan('ads:requeue-legacy-moderation', [
            '--limit' => 5,
            '--execute' => true,
        ])->assertSuccessful();
        Bus::assertNothingDispatched();

        $this->artisan('ads:requeue-legacy-moderation', [
            '--limit' => 5,
            '--include-manual-review' => true,
            '--execute' => true,
        ])->assertSuccessful();

        Bus::assertDispatched(ModerateAdWithAI::class, fn ($job) =>
            $job->adId === $manualReview->id && $job->activateOnApproval === false
        );
    }

    private function ad(User $seller, array $overrides = []): Ad
    {
        static $counter = 0;
        $counter++;

        return Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => "Anuncio {$counter}",
            'description' => 'Descripción permitida.',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'is_catalog_filler' => false,
        ], $overrides));
    }
}

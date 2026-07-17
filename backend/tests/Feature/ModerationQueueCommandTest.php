<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class ModerationQueueCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_dispatches_oldest_pending_ads_first(): void
    {
        Bus::fake();
        $seller = User::factory()->create();
        $base = [
            'user_id' => $seller->id,
            'description' => 'Descripción',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'pending',
            'ai_moderation_status' => 'queued',
        ];

        $newer = Ad::query()->create($base + [
            'title' => 'Nuevo',
            'moderation_submitted_at' => now()->subHour(),
        ]);
        $older = Ad::query()->create($base + [
            'title' => 'Antiguo',
            'moderation_submitted_at' => now()->subDays(2),
        ]);
        $newer->forceFill(['status' => 'pending', 'ai_moderation_status' => 'queued'])->saveQuietly();
        $older->forceFill(['status' => 'pending', 'ai_moderation_status' => 'queued'])->saveQuietly();
        Bus::fake();

        $this->artisan('ads:moderate-pending', ['--limit' => 1])->assertSuccessful();

        Bus::assertDispatched(ModerateAdWithAI::class, fn ($job) => $job->adId === $older->id);
        Bus::assertNotDispatched(ModerateAdWithAI::class, fn ($job) => $job->adId === $newer->id);
    }
}

<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\User;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModerateAdWithAITest extends TestCase
{
    use RefreshDatabase;

    public function test_low_confidence_approval_remains_for_manual_review(): void
    {
        Storage::fake('public');
        config()->set('services.gemini.api_key', 'test-key');
        Http::fake([
            '*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [['text' => json_encode([
                        'decision' => 'approved',
                        'reason' => 'Contenido permitido, pero faltan datos.',
                        'confidence' => 0.60,
                        'flags' => ['insufficient_detail'],
                    ])]],
                ]],
            ]),
        ]);

        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Artículo usado',
            'description' => 'Descripción permitida',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'ai_review',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
        ]);

        (new ModerateAdWithAI($ad->id))->handle(app(AdIllustrativeCoverService::class));

        $ad->refresh();
        $this->assertSame('pending', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
        ]);
    }
}

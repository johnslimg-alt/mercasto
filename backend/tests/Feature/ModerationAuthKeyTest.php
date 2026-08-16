<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModerationAuthKeyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Cache::flush();
        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
        ]);
    }

    private function fakeDecision(array $decision): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => json_encode($decision)],
            ], 200),
        ]);
    }

    public function test_review_only_approval_uses_local_ollama(): void
    {
        $this->fakeDecision([
            'decision' => 'approved',
            'reason' => 'Contenido permitido.',
            'confidence' => 0.99,
            'flags' => [],
        ]);

        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('approved', $ad->ai_moderation_status);
        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest()->firstOrFail();
        $this->assertSame('seller_confirmation_required', $decision->metadata['activation_mode']);
        $this->assertSame('qwen3-vl:4b-instruct', $decision->metadata['model']);

        Http::assertSent(fn (Request $request) => $request->url() === 'http://ollama.test/api/chat'
            && $request['model'] === 'qwen3-vl:4b-instruct');
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'googleapis.com')
            || str_contains($request->url(), 'deepseek')
            || str_contains($request->url(), 'anthropic'));
    }

    public function test_original_image_is_sent_only_to_local_model(): void
    {
        $fixture = UploadedFile::fake()->image('photo.jpg', 640, 480);
        Storage::disk('public')->put('ads/photo.jpg', file_get_contents($fixture->getRealPath()));
        $this->fakeDecision([
            'decision' => 'manual_review',
            'reason' => 'Revisión requerida.',
            'confidence' => 0.7,
            'flags' => [],
        ]);

        $ad = $this->legacyAd();
        $ad->forceFill(['image_url' => json_encode(['ads/photo.jpg']), 'generated_cover' => false])->saveQuietly();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        Http::assertSent(function (Request $request) {
            $image = data_get($request->data(), 'messages.1.images.0');
            return $request->url() === 'http://ollama.test/api/chat'
                && is_string($image)
                && $image !== ''
                && base64_decode($image, true) !== false;
        });
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'googleapis.com')
            || str_contains($request->url(), 'deepseek')
            || str_contains($request->url(), 'anthropic'));
    }

    public function test_automatic_approval_starts_fresh_lifetime(): void
    {
        config(['marketplace.ad_lifetime_days' => 7]);
        $this->fakeDecision([
            'decision' => 'approved',
            'reason' => 'Contenido permitido.',
            'confidence' => 0.99,
            'flags' => [],
        ]);
        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, true), 'handle']);
        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertTrue($ad->expires_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()));
    }

    public function test_local_provider_failure_goes_to_manual_review(): void
    {
        Http::fake(['http://ollama.test/api/chat' => Http::response(['error' => 'down'], 503)]);
        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);
        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('failed', $ad->ai_moderation_status);
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'decision' => 'manual_review',
        ]);
    }

    private function legacyAd(): Ad
    {
        $seller = User::factory()->create();
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Bicicleta usada',
            'description' => 'Bicicleta en buen estado.',
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'moderation_submitted_at' => now()->subMinute(),
            'ai_moderation_status' => 'queued',
            'is_catalog_filler' => false,
        ]);
    }
}

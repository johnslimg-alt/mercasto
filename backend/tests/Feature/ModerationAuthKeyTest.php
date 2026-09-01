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
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);
    }

    private function fakeDecision(array $decision): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response(array_merge($decision, [
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local',
                'model_executed' => true,
                'gateway_version' => '0.2.0',
                'latency_ms' => 25,
                'rollout_mode' => 'shadow_assist',
                'authoritative' => false,
            ]), 200),
        ]);
    }

    public function test_review_only_approval_uses_private_python_gateway(): void
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
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest()->firstOrFail();
        $this->assertSame('manual_review', $decision->decision);
        $this->assertSame('approved', $decision->metadata['rollout']['proposed_decision']);
        $this->assertSame('manual_review', $decision->metadata['rollout']['authoritative_decision']);
        $this->assertTrue($decision->metadata['rollout']['assist_only']);
        $this->assertSame('human_confirmation_required', $decision->metadata['activation_mode']);
        $this->assertSame('qwen3-vl:4b-instruct', $decision->metadata['model']);

        Http::assertSent(fn (Request $request) => $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
            && $request->hasHeader('X-Mercasto-Internal-Token', 'test-internal-token'));
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
            $image = data_get($request->data(), 'images_base64.0');
            return $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
                && is_string($image)
                && $image !== ''
                && base64_decode($image, true) !== false
                && $request->hasHeader('X-Mercasto-Internal-Token', 'test-internal-token');
        });
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'googleapis.com')
            || str_contains($request->url(), 'deepseek')
            || str_contains($request->url(), 'anthropic'));
    }

    public function test_model_approval_never_starts_lifetime_during_assist_only_rollout(): void
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

        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest()->firstOrFail();
        $this->assertSame('approved', $decision->metadata['rollout']['proposed_decision']);
        $this->assertSame('manual_review', $decision->metadata['rollout']['authoritative_decision']);
        $this->assertSame('human_confirmation_required', $decision->metadata['activation_mode']);
    }

    public function test_private_gateway_failure_goes_to_manual_review(): void
    {
        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response(['detail' => 'down'], 503)]);
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

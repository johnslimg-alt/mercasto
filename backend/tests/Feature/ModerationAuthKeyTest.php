<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        Cache::forget('ai_moderation:provider_unavailable');
        config([
            'services.gemini.api_key' => 'test-auth-key',
            'services.gemini.moderation_model' => 'gemini-3.6-flash',
        ]);
    }

    public function test_auth_key_header_and_review_only_approval(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [[
                        'text' => json_encode([
                            'decision' => 'approved',
                            'reason' => 'Contenido permitido.',
                            'confidence' => 0.99,
                            'flags' => [],
                        ]),
                    ]]],
                ]],
            ], 200),
        ]);

        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('approved', $ad->ai_moderation_status);
        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest()->firstOrFail();
        $this->assertSame('seller_confirmation_required', $decision->metadata['activation_mode']);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $ad->user_id,
            'title' => 'Tu anuncio fue revisado',
        ]);

        Http::assertSent(function ($request) {
            return $request->url()
                === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'
                && $request->hasHeader('x-goog-api-key', 'test-auth-key')
                && ! str_contains($request->url(), '?key=');
        });
    }

    public function test_legacy_logo_is_replaced_and_not_sent_as_multimodal_input(): void
    {
        $legacyBytes = 'legacy-logo-binary';
        $legacyPath = 'ads/copied-logo.webp';
        Storage::disk('public')->put($legacyPath, $legacyBytes);
        config([
            'marketplace.legacy_placeholder_sha256' => [hash('sha256', $legacyBytes)],
        ]);

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [[
                        'text' => json_encode([
                            'decision' => 'manual_review',
                            'reason' => 'Falta fotografía original.',
                            'confidence' => 0.91,
                            'flags' => ['missing_original_photo'],
                        ]),
                    ]]],
                ]],
            ], 200),
        ]);

        $ad = $this->legacyAd();
        $ad->forceFill([
            'image_url' => json_encode([$legacyPath]),
            'generated_cover' => false,
        ])->saveQuietly();

        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $ad->refresh();
        $images = json_decode($ad->image_url, true);
        $this->assertCount(1, $images);
        $this->assertStringStartsWith('ads/placeholders/', $images[0]);
        $this->assertTrue((bool) $ad->generated_cover);
        Storage::disk('public')->assertMissing($legacyPath);

        Http::assertSent(function ($request) {
            $parts = $request->data()['contents'][0]['parts'] ?? [];
            return count($parts) === 1
                && isset($parts[0]['text'])
                && str_contains($parts[0]['text'], 'NO agregó fotografías originales')
                && ! isset($parts[0]['inline_data']);
        });
    }

    public function test_transient_server_error_is_retried_once_before_manual_review(): void
    {
        Http::fakeSequence()
            ->push([
                'error' => [
                    'status' => 'UNAVAILABLE',
                    'message' => 'Service temporarily unavailable.',
                ],
            ], 503)
            ->push([
                'candidates' => [[
                    'content' => ['parts' => [[
                        'text' => json_encode([
                            'decision' => 'approved',
                            'reason' => 'Contenido permitido.',
                            'confidence' => 0.97,
                            'flags' => [],
                        ]),
                    ]]],
                ]],
            ], 200);

        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $this->assertSame('approved', $ad->fresh()->ai_moderation_status);
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'decision' => 'approved',
        ]);
        Http::assertSentCount(2);
    }

    public function test_quota_response_releases_job_without_recording_a_false_failure(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'error' => [
                    'status' => 'RESOURCE_EXHAUSTED',
                    'message' => 'Quota exceeded.',
                ],
            ], 429, ['Retry-After' => '75']),
        ]);

        $ad = $this->legacyAd();
        $job = (new ModerateAdWithAI($ad->id, false))->withFakeQueueInteractions();
        app()->call([$job, 'handle']);

        $job->assertReleased(75);
        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('queued', $ad->ai_moderation_status);
        $this->assertNull($ad->ai_moderated_at);
        $this->assertSame(0, AdModerationDecision::query()->where('ad_id', $ad->id)->count());
        $this->assertSame(
            'Gemini quota is temporarily unavailable.',
            Cache::get('ai_moderation:provider_unavailable')
        );
    }

    public function test_repeated_provider_failure_is_recorded_once_per_attempt(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'error' => [
                    'status' => 'INVALID_ARGUMENT',
                    'message' => 'API key not valid. Please pass a valid API key.',
                ],
            ], 400),
        ]);

        $ad = $this->legacyAd();
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);
        app()->call([new ModerateAdWithAI($ad->id, false), 'handle']);

        $this->assertSame(1, AdModerationDecision::query()
            ->where('ad_id', $ad->id)
            ->where('decision', 'manual_review')
            ->count());
        $this->assertSame('provider_error', $ad->fresh()->ai_moderation_status);
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

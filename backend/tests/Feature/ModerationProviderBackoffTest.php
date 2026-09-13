<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The provider-unavailable flag is the only backoff between a failing private
 * gateway and the five-minute `ads:moderate-pending` schedule. These tests pin
 * the two properties that make it work: a failed attempt must not erase the
 * backoff set by the previous failure, and only a real gateway answer may
 * declare the provider healthy again.
 */
class ModerationProviderBackoffTest extends TestCase
{
    use RefreshDatabase;

    private const BREAKER_KEY = 'ai_moderation:provider_unavailable';

    private function executedResponse(array $overrides = []): array
    {
        return array_merge([
            'decision' => 'manual_review', 'reason' => 'Revisión humana.', 'confidence' => 0.7,
            'flags' => [], 'provider' => 'ollama', 'model' => 'qwen3-vl:test',
            'runtime' => 'private_local', 'model_executed' => true,
            'gateway_version' => '0.2.0', 'latency_ms' => 12,
            'rollout_mode' => 'shadow_assist', 'authoritative' => false,
        ], $overrides);
    }

    private function queuedAd(): Ad
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);

        $seller = User::factory()->create();

        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio en revisión',
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
            'ai_moderation_status' => 'queued',
            'is_catalog_filler' => false,
            'expires_at' => null,
            'moderation_submitted_at' => now(),
        ]);
    }

    /**
     * The defect: the job cleared the flag on entry, so the backoff recorded by
     * the previous failure was gone before the outcome of this attempt was
     * known. Observing the flag from inside the outbound request is the only
     * place the ordering difference is visible.
     */
    public function test_a_failing_attempt_does_not_erase_the_existing_backoff(): void
    {
        $ad = $this->queuedAd();
        Cache::put(self::BREAKER_KEY, 'previous_outage', 600);

        $observedDuringCall = 'not-called';
        Http::fake(function (Request $request) use (&$observedDuringCall) {
            $observedDuringCall = Cache::get(self::BREAKER_KEY);

            return Http::response([], 503);
        });

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $this->assertSame(
            'previous_outage',
            $observedDuringCall,
            'The backoff must still be in force while the provider call is in flight.'
        );

        $ad->refresh();
        $this->assertSame('failed', $ad->ai_moderation_status);
    }

    public function test_the_default_backoff_outlasts_the_schedule_interval(): void
    {
        // ads:moderate-pending runs everyFiveMinutes(). A shorter window expires
        // before the next scheduled run, so the breaker could never suppress one.
        $this->assertGreaterThan(
            300,
            (int) config('ai_moderation.provider_backoff_seconds'),
            'The provider backoff must exceed the five-minute schedule interval.'
        );
    }

    public function test_a_gateway_answer_clears_the_backoff(): void
    {
        $ad = $this->queuedAd();
        Cache::put(self::BREAKER_KEY, 'previous_outage', 600);

        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response($this->executedResponse()),
        ]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $this->assertNull(Cache::get(self::BREAKER_KEY));
    }

    public function test_a_failure_records_its_cause_on_the_decision(): void
    {
        $ad = $this->queuedAd();

        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response([], 503)]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $decision = AdModerationDecision::query()
            ->where('ad_id', $ad->id)
            ->where('source', 'ai')
            ->where('decision', 'manual_review')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame('failed', $decision->metadata['technical_status']);
        // The human-facing reason stays generic and localized; the machine cause
        // must survive log rotation so the outage is diagnosable afterwards.
        $this->assertStringContainsString('503', (string) $decision->metadata['error']['message']);
        $this->assertNotSame('', (string) $decision->metadata['error']['class']);
    }

    public function test_a_failure_sets_a_backoff_that_survives_the_attempt(): void
    {
        $ad = $this->queuedAd();

        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response([], 503)]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        $this->assertSame('private_gateway_failed', Cache::get(self::BREAKER_KEY));
    }
}

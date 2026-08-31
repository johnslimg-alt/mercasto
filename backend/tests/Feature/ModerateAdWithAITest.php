<?php

namespace Tests\Feature;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModerateAdWithAITest extends TestCase
{
    use RefreshDatabase;

    public function test_low_confidence_approval_remains_for_manual_review(): void
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'manual_review',
                'reason' => 'Contenido permitido, pero faltan datos.',
                'confidence' => 0.60,
                'flags' => ['insufficient_detail'],
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local',
                'gateway_version' => '0.2.0',
                'latency_ms' => 42,
                'rollout_mode' => 'shadow_assist',
                'authoritative' => false,
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
            'status' => 'pending',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
        ]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        Http::assertSent(fn (Request $request) => $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
            && $request->hasHeader('X-Mercasto-Internal-Token', 'test-internal-token'));

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
        ]);
    }


    public function test_superseded_moderation_cycle_job_is_a_noop(): void
    {
        Storage::fake('public');
        config(['ai_moderation.enabled' => false]);

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
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
        ]);
        $oldCycle = AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => ['rollout' => ['activate_on_human_approval' => true]],
        ]);
        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => ['rollout' => ['activate_on_human_approval' => false]],
        ]);

        app()->call([new ModerateAdWithAI($ad->id, true, $oldCycle->id), 'handle']);

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('queued', $ad->ai_moderation_status);
        $this->assertDatabaseMissing('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'ai',
        ]);
    }

    public function test_current_cycle_job_does_not_overwrite_existing_human_decision(): void
    {
        Storage::fake('public');
        config(['ai_moderation.enabled' => false]);

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
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'admin_manual_review',
        ]);
        $cycle = AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'system',
            'decision' => 'queued',
            'metadata' => ['rollout' => ['activate_on_human_approval' => false]],
        ]);

        app()->call([new ModerateAdWithAI($ad->id, false, $cycle->id), 'handle']);

        $this->assertSame('admin_manual_review', $ad->fresh()->ai_moderation_status);
        $this->assertDatabaseMissing('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'ai',
        ]);
    }

    public function test_multi_photo_listing_is_bounded_by_gateway_and_kept_for_human_review(): void
    {
        Storage::fake('public');
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'test-internal-token',
        ]);
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'manual_review',
                'reason' => 'La muestra visual es coherente, pero hay medios omitidos.',
                'confidence' => 0.96,
                'flags' => [],
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
                'runtime' => 'private_local',
                'gateway_version' => '0.2.0',
                'latency_ms' => 55,
                'rollout_mode' => 'shadow_assist',
                'authoritative' => false,
                'input_image_count' => 5,
                'model_image_count' => 2,
                'images_omitted' => 3,
            ]),
        ]);

        $paths = [];
        for ($index = 1; $index <= 5; $index++) {
            $file = UploadedFile::fake()->image("photo-{$index}.jpg", 640, 480);
            $path = "ads/photo-{$index}.jpg";
            Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));
            $paths[] = $path;
        }

        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id, 'title' => 'Cámara con accesorios',
            'description' => 'Equipo usado en buen estado con accesorios incluidos.', 'price' => 4500,
            'location' => 'Veracruz', 'state' => 'Veracruz', 'city' => 'Veracruz',
            'latitude' => 19.1738, 'longitude' => -96.1342, 'category' => 'electronica',
            'condition' => 'usado', 'attributes' => ['subcategory' => 'camaras'],
            'image_url' => json_encode($paths), 'status' => 'pending',
            'moderation_submitted_at' => now(), 'ai_moderation_status' => 'queued',
        ]);

        app()->call([new ModerateAdWithAI($ad->id), 'handle']);

        Http::assertSent(function (Request $request) {
            $images = data_get($request->data(), 'images_base64', []);
            return $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
                && count($images) === 2
                && (int) $request['source_image_count'] === 5
                && $request->hasHeader('X-Mercasto-Internal-Token', 'test-internal-token');
        });
        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $decision = $ad->moderationDecisions()->latest()->firstOrFail();
        $this->assertSame('manual_review', $decision->decision);
        $this->assertSame('manual_review', $decision->metadata['rollout']['proposed_decision']);
        $this->assertSame('manual_review', $decision->metadata['rollout']['authoritative_decision']);
        $this->assertSame('human_confirmation_required', $decision->metadata['activation_mode']);
        $this->assertSame(5, $decision->metadata['original_image_count']);
        $this->assertSame(5, $decision->metadata['reviewed_image_count']);
        $this->assertSame(2, $decision->metadata['gateway']['model_image_count']);
        $this->assertSame(3, $decision->metadata['gateway']['images_omitted']);
        $this->assertSame('python_gateway', $decision->metadata['runtime']['adapter']);
    }
}

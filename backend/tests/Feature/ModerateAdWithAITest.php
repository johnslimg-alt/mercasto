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
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => json_encode([
                    'decision' => 'approved',
                    'reason' => 'Contenido permitido, pero faltan datos.',
                    'confidence' => 0.60,
                    'flags' => ['insufficient_detail'],
                ])],
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

        Http::assertSent(fn (Request $request) => $request->url() === 'http://ollama.test/api/chat'
            && $request['keep_alive'] === '24h');

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

    public function test_all_original_photos_are_sent_to_local_ai(): void
    {
        Storage::fake('public');
        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => json_encode([
                    'decision' => 'approved', 'reason' => 'Texto e imágenes coherentes.',
                    'confidence' => 0.96, 'flags' => [],
                ])],
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
            $images = data_get($request->data(), 'messages.1.images', []);
            return $request->url() === 'http://ollama.test/api/chat' && count($images) === 5;
        });
        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('manual_review', $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $decision = $ad->moderationDecisions()->latest()->firstOrFail();
        $this->assertSame('manual_review', $decision->decision);
        $this->assertSame('approved', $decision->metadata['rollout']['proposed_decision']);
        $this->assertSame('manual_review', $decision->metadata['rollout']['authoritative_decision']);
        $this->assertSame('human_confirmation_required', $decision->metadata['activation_mode']);
        $this->assertSame(5, $decision->metadata['original_image_count']);
        $this->assertSame(5, $decision->metadata['reviewed_image_count']);
    }
}

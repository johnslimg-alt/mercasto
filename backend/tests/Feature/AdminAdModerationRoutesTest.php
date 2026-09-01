<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminAdModerationRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_open_moderation_queue(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->getJson('/api/admin/moderation/ads')
            ->assertForbidden();
    }

    public function test_admin_sees_oldest_unfinished_ad_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $base = [
            'user_id' => $seller->id,
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
        ];

        [$newer, $older, $completedArchive] = Ad::withoutEvents(function () use ($base) {
            $newer = Ad::query()->create($base + [
                'title' => 'Nuevo',
                'status' => 'pending',
                'ai_moderation_status' => 'manual_review',
                'moderation_submitted_at' => now()->subHour(),
            ]);
            $older = Ad::query()->create($base + [
                'title' => 'Antiguo',
                'status' => 'archived',
                'ai_moderation_status' => 'manual_review',
                'moderation_submitted_at' => now()->subDays(2),
            ]);
            $completedArchive = Ad::query()->create($base + [
                'title' => 'Archivado por el vendedor',
                'status' => 'archived',
                'ai_moderation_status' => 'approved',
                'moderation_submitted_at' => now()->subDays(3),
            ]);

            return [$newer, $older, $completedArchive];
        });

        $this->actingAs($admin)
            ->getJson('/api/admin/moderation/ads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id)
            ->assertJsonMissing(['id' => $completedArchive->id]);
    }

    public function test_admin_queue_limits_moderation_history_in_the_database_query(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Historial acotado',
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'pending',
            'ai_moderation_status' => 'manual_review',
            'moderation_submitted_at' => now()->subHour(),
        ]));

        foreach (range(1, 8) as $offset) {
            AdModerationDecision::query()->create([
                'ad_id' => $ad->id,
                'source' => 'ai',
                'decision' => 'manual_review',
                'reason' => "Decisión {$offset}",
                'created_at' => now()->subMinutes(9 - $offset),
                'updated_at' => now()->subMinutes(9 - $offset),
            ]);
        }

        $moderationQueries = [];
        DB::listen(function ($query) use (&$moderationQueries): void {
            if (str_contains($query->sql, 'ad_moderation_decisions')) {
                $moderationQueries[] = $query->sql;
            }
        });

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/moderation/ads?per_page=10')
            ->assertOk();

        $this->assertCount(5, $response->json('data.0.moderation_decisions'));
        $this->assertNotEmpty($moderationQueries);
        $this->assertStringContainsString('laravel_row', implode(' ', $moderationQueries));
    }

    public function test_admin_detail_exposes_normalized_ai_assist_without_raw_model_metadata(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Asistencia IA visible',
            'description' => 'Descripción de prueba',
            'price' => 950,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'ai_moderation_reason' => 'La IA propone aprobación; decide una persona.',
            'ai_moderation_confidence' => 0.96,
            'moderation_submitted_at' => now()->subMinute(),
        ]));

        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Revisión humana requerida.',
            'confidence' => 0.96,
            'metadata' => [
                'provider' => 'ollama',
                'model' => 'qwen3-vl:test',
                'runtime' => [
                    'provider' => 'ollama',
                    'adapter' => 'python_gateway',
                    'execution' => 'private_local',
                    'model' => 'qwen3-vl:test',
                    'gateway_version' => '0.2.0',
                    'contract_version' => 'ai-moderation-assist-v1',
                    'runtime_ms' => 321,
                    'budget_seconds' => 90,
                ],
                'result' => [
                    'proposed_decision' => 'approved',
                    'raw_private_sentinel' => 'NEVER_EXPOSE_MODEL_PAYLOAD',
                ],
                'gateway' => [
                    'version' => '0.2.0',
                    'rollout_mode' => 'shadow_assist',
                    'authoritative' => false,
                    'description_truncated' => false,
                    'input_image_count' => 3,
                    'model_image_count' => 2,
                    'images_omitted' => 1,
                    'policy_signals_omitted' => 0,
                ],
                'rollout' => [
                    'mode' => 'assist',
                    'assist_only' => true,
                    'human_authoritative' => true,
                    'proposed_decision' => 'approved',
                    'authoritative_decision' => 'manual_review',
                ],
                'policy_review' => [
                    'policy_ids' => ['weapons_firearms'],
                    'human_authoritative' => true,
                    'authoritative_action' => null,
                ],
                'original_image_count' => 3,
                'reviewed_image_count' => 2,
                'reviewed_video_frame_count' => 1,
                'video_manual_review_required' => false,
            ],
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/admin/moderation/ads/{$ad->id}")
            ->assertOk()
            ->assertJsonPath('ai_assist.feature_enabled', true)
            ->assertJsonPath('ai_assist.runtime.provider', 'ollama')
            ->assertJsonPath('ai_assist.runtime.adapter', 'python_gateway')
            ->assertJsonPath('ai_assist.runtime.model', 'qwen3-vl:test')
            ->assertJsonPath('ai_assist.runtime.gateway_version', '0.2.0')
            ->assertJsonPath('ai_assist.runtime.contract_version', 'ai-moderation-assist-v1')
            ->assertJsonPath('ai_assist.runtime.runtime_ms', 321)
            ->assertJsonPath('ai_assist.rollout.assist_only', true)
            ->assertJsonPath('ai_assist.rollout.human_authoritative', true)
            ->assertJsonPath('ai_assist.rollout.proposed_decision', 'approved')
            ->assertJsonPath('ai_assist.rollout.authoritative_decision', 'manual_review')
            ->assertJsonPath('ai_assist.policy_ids.0', 'weapons_firearms')
            ->assertJsonPath('ai_assist.media.original_images', 3)
            ->assertJsonPath('ai_assist.media.reviewed_images', 2)
            ->assertJsonPath('ai_assist.media.model_media', 2)
            ->assertJsonPath('ai_assist.media.omitted_media', 1);

        $this->assertArrayNotHasKey('metadata', $response->json('moderation_decisions.0'));
        $this->assertStringNotContainsString('NEVER_EXPOSE_MODEL_PAYLOAD', $response->getContent());
    }

    public function test_admin_ai_assist_ignores_evidence_from_superseded_moderation_cycle(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Reintento actual',
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'archived',
            'ai_moderation_status' => 'queued',
            'moderation_submitted_at' => now(),
        ]));

        $staleDecision = AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Evidencia de ciclo anterior',
            'metadata' => [
                'runtime' => ['model' => 'stale-model', 'provider' => 'ollama'],
                'policy_review' => ['policy_ids' => ['fraud_scam']],
                'rollout' => ['proposed_decision' => 'rejected'],
            ],
        ]);
        $staleDecision->forceFill([
            'created_at' => now()->subMinutes(10),
            'updated_at' => now()->subMinutes(10),
        ])->saveQuietly();

        $this->actingAs($admin)
            ->getJson("/api/admin/moderation/ads/{$ad->id}")
            ->assertOk()
            ->assertJsonPath('ai_assist.status', 'queued')
            ->assertJsonPath('ai_assist.runtime.model', null)
            ->assertJsonPath('ai_assist.rollout.proposed_decision', null)
            ->assertJsonCount(0, 'ai_assist.policy_ids');
    }
}

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}

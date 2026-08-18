<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportModerationTransitionRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_transition_listing_report(): void
    {
        $user = User::factory()->create(['role' => 'individual']);
        $reportId = $this->createListingReport($user);

        $this->actingAs($user)
            ->patchJson("/api/admin/reports/{$reportId}/transition", ['status' => 'in_review'])
            ->assertForbidden();

        $this->assertDatabaseHas('reports', ['id' => $reportId, 'status' => 'new']);
    }

    public function test_admin_can_move_listing_report_from_new_to_review_to_resolved(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reportId = $this->createListingReport($reporter);

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/transition", ['status' => 'in_review'])
            ->assertOk()
            ->assertJsonPath('report.status', 'in_review');

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/transition", [
                'status' => 'resolved',
                'resolution_note' => 'Revisado manualmente',
            ])
            ->assertOk()
            ->assertJsonPath('report.status', 'resolved')
            ->assertJsonPath('report.resolved_by', $admin->id)
            ->assertJsonPath('report.resolution_action', 'resolved');

        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'status' => 'resolved',
            'resolved_by' => $admin->id,
            'resolution_action' => 'resolved',
            'resolution_note' => 'Revisado manualmente',
        ]);
    }

    public function test_admin_can_dismiss_user_report_without_deleting_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reported = User::factory()->create();

        $reportId = DB::table('user_reports')->insertGetId([
            'reported_user_id' => $reported->id,
            'reporter_id' => $reporter->id,
            'reason' => 'spam',
            'comments' => 'fixture',
            'status' => 'new',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/user-reports/{$reportId}/transition", ['status' => 'in_review'])
            ->assertOk();

        $this->actingAs($admin)
            ->patchJson("/api/admin/user-reports/{$reportId}/transition", ['status' => 'dismissed'])
            ->assertOk()
            ->assertJsonPath('report.status', 'dismissed');

        $this->assertDatabaseHas('user_reports', [
            'id' => $reportId,
            'status' => 'dismissed',
            'resolution_action' => 'dismissed',
        ]);
    }

    public function test_invalid_direct_terminal_transition_is_rejected_and_report_is_preserved(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reportId = $this->createListingReport($reporter);

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/transition", ['status' => 'resolved'])
            ->assertStatus(422)
            ->assertJsonPath('from', 'new')
            ->assertJsonPath('to', 'resolved');

        $this->assertDatabaseHas('reports', ['id' => $reportId, 'status' => 'new']);
    }

    private function createListingReport(User $reporter): int
    {
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Reporte fixture',
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
            'status' => 'active',
        ]));

        return DB::table('reports')->insertGetId([
            'ad_id' => $ad->id,
            'user_id' => $reporter->id,
            'reason' => 'spam',
            'comments' => 'fixture',
            'status' => 'new',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

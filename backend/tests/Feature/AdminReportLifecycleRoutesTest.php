<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminReportLifecycleRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_transition_listing_report(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->patchJson('/api/admin/reports/1/lifecycle', ['status' => 'in_review'])
            ->assertForbidden();
    }

    public function test_admin_can_review_and_resolve_listing_report_without_deleting_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller);
        $reportId = DB::table('reports')->insertGetId([
            'ad_id' => $ad->id,
            'user_id' => $seller->id,
            'reason' => 'fraud',
            'comments' => 'Needs review',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/lifecycle", ['status' => 'in_review'])
            ->assertOk()
            ->assertJsonPath('kind', 'listing')
            ->assertJsonPath('data.status', 'in_review');

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/lifecycle", [
                'status' => 'resolved',
                'note' => 'Reviewed against policy; no destructive purge required.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.resolved_by', $admin->id);

        $this->assertDatabaseCount('reports', 1);
        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'status' => 'resolved',
            'resolved_by' => $admin->id,
            'resolution_action' => 'resolved',
            'resolution_note' => 'Reviewed against policy; no destructive purge required.',
        ]);
    }

    public function test_admin_cannot_skip_review_state_and_report_row_is_preserved(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller);
        $reportId = DB::table('reports')->insertGetId([
            'ad_id' => $ad->id,
            'user_id' => $seller->id,
            'reason' => 'other',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/reports/{$reportId}/lifecycle", ['status' => 'resolved'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseCount('reports', 1);
        $this->assertDatabaseHas('reports', ['id' => $reportId, 'status' => 'new']);
    }

    public function test_admin_can_review_and_dismiss_user_report_without_deleting_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reported = User::factory()->create();
        $reportId = DB::table('user_reports')->insertGetId([
            'reported_user_id' => $reported->id,
            'reporter_id' => $reporter->id,
            'reason' => 'spam',
            'comments' => 'Suspicious profile',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/user-reports/{$reportId}/lifecycle", ['status' => 'in_review'])
            ->assertOk()
            ->assertJsonPath('kind', 'user');

        $this->actingAs($admin)
            ->patchJson("/api/admin/user-reports/{$reportId}/lifecycle", [
                'status' => 'dismissed',
                'note' => 'No policy violation found.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'dismissed');

        $this->assertDatabaseCount('user_reports', 1);
        $this->assertDatabaseHas('user_reports', [
            'id' => $reportId,
            'status' => 'dismissed',
            'resolved_by' => $admin->id,
            'resolution_action' => 'dismissed',
        ]);
    }

    private function createAd(User $seller): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Lifecycle report target',
            'description' => 'Deterministic report lifecycle fixture',
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
    }
}

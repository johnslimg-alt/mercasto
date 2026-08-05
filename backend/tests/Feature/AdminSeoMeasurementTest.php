<?php

namespace Tests\Feature;

use App\Models\SeoMeasurementSnapshot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSeoMeasurementTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_read_seo_measurement_snapshots(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->getJson('/api/admin/seo-measurement')
            ->assertForbidden();
    }

    public function test_admin_receives_only_whitelisted_aggregate_snapshot_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $snapshot = SeoMeasurementSnapshot::query()->create([
            'period_start' => '2026-07-29',
            'period_end' => '2026-08-05',
            'generated_at' => '2026-08-05 18:00:00',
            'external_complete' => false,
            'report' => [
                'period' => ['days' => 7, 'start' => '2026-07-29', 'end' => '2026-08-05', 'timezone' => 'UTC'],
                'internal' => [
                    'current' => ['new_users' => 2, 'first_publishers' => 1, 'email' => 'hidden@example.com'],
                    'previous' => ['new_users' => 1],
                    'change_percent' => ['new_users' => 100],
                ],
                'supply' => [
                    'summary' => ['active_genuine' => 1, 'ready_for_seller_confirmation' => 54, 'seller_id' => 99],
                    'national_qualification' => ['qualified' => false, 'checks' => ['active_ads' => false]],
                    'qualified_categories' => 0,
                    'qualified_state_categories' => 0,
                    'qualified_city_categories' => 0,
                ],
                'indexability' => [
                    'indexable_genuine_listing_urls' => 1,
                    'active_catalog_references_noindex' => 5677,
                    'source_pages' => 6,
                    'location_routes_open' => 0,
                ],
                'external' => [
                    'readiness' => ['status' => 'not_configured', 'private_key' => 'secret'],
                    'search_console' => ['status' => 'not_configured'],
                    'ga4' => ['status' => 'not_configured'],
                    'external_complete' => false,
                ],
                'system' => ['queue_jobs' => 0, 'failed_jobs' => 0],
                'privacy_hits' => [],
                'user_id' => 123,
                'full_referrer_url' => 'https://example.com/private?q=secret',
            ],
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/seo-measurement?limit=1')
            ->assertOk()
            ->assertJsonPath('meta.count', 1)
            ->assertJsonPath('meta.privacy_contract', 'aggregate_only')
            ->assertJsonPath('data.0.period_start', '2026-07-29')
            ->assertJsonPath('data.0.report.internal.current.new_users', 2)
            ->assertJsonPath('data.0.report.supply.summary.active_genuine', 1)
            ->assertJsonPath('data.0.report.indexability.source_pages', 6)
            ->assertJsonPath('data.0.report.external.readiness.status', 'not_configured')
            ->assertJsonPath('data.0.report.privacy_clear', true);

        $json = $response->getContent();
        $this->assertStringNotContainsString('hidden@example.com', $json);
        $this->assertStringNotContainsString('private_key', $json);
        $this->assertStringNotContainsString('secret', $json);
        $this->assertStringNotContainsString('seller_id', $json);
        $this->assertStringNotContainsString('user_id', $json);
        $this->assertStringNotContainsString('full_referrer_url', $json);
    }
}

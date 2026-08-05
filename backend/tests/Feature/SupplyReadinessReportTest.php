<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SupplyReadinessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SupplyReadinessReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'marketplace.supply_readiness.recent_days' => 90,
            'marketplace.supply_readiness.national' => [
                'genuine_active_min' => 2,
                'genuine_recent_90d_min' => 1,
                'genuine_sellers_min' => 2,
                'states_min' => 1,
                'location_completeness_min_percent' => 100,
            ],
            'marketplace.supply_readiness.state_category' => [
                'genuine_active_min' => 2,
                'genuine_recent_90d_min' => 1,
                'genuine_sellers_min' => 2,
                'cities_min' => 2,
                'location_completeness_min_percent' => 100,
                'consecutive_weekly_snapshots' => 2,
            ],
        ]);
    }

    public function test_report_excludes_catalog_filler_and_evaluates_thresholds(): void
    {
        $sellerA = User::factory()->create(['name' => 'Private Seller A']);
        $sellerB = User::factory()->create(['name' => 'Private Seller B']);

        $this->insertAd($sellerA->id, [
            'status' => 'active',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'created_at' => now()->subDays(10),
        ]);
        $this->insertAd($sellerB->id, [
            'status' => 'active',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
            'created_at' => now()->subDays(120),
        ]);
        $this->insertAd($sellerA->id, [
            'status' => 'archived',
            'ai_moderation_status' => 'approved',
        ]);
        $this->insertAd($sellerB->id, ['status' => 'expired']);
        $this->insertAd($sellerA->id, [
            'status' => 'active',
            'is_catalog_filler' => true,
            'state' => null,
            'city' => null,
        ]);

        $report = app(SupplyReadinessService::class)->report();
        $summary = $report['summary'];

        $this->assertSame(4, $summary['genuine_total']);
        $this->assertSame(2, $summary['active_genuine']);
        $this->assertSame(1, $summary['recent_active_90d']);
        $this->assertSame(2, $summary['active_sellers']);
        $this->assertSame(1, $summary['ready_for_seller_confirmation']);
        $this->assertSame(100.0, $summary['location_completeness_percent']);
        $this->assertTrue($report['qualification']['national']['qualified']);

        $category = collect($report['categories'])->firstWhere('category', 'motor');
        $this->assertNotNull($category);
        $this->assertSame(2, $category['active_genuine']);
        $this->assertTrue($category['qualification']['qualified']);

        $stateCategory = collect($report['state_categories'])
            ->first(fn (array $row) => $row['state'] === 'Veracruz'
                && $row['category'] === 'motor');
        $this->assertNotNull($stateCategory);
        $this->assertSame(2, $stateCategory['active_cities']);
        $this->assertTrue($stateCategory['qualification']['qualified']);

        $json = json_encode($report, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('Private Seller A', $json);
        $this->assertStringNotContainsString('Private Seller B', $json);
        $this->assertStringNotContainsString('user_id', $json);
        $this->assertStringNotContainsString('title', $json);
        $this->assertStringNotContainsString('description', $json);
    }

    public function test_json_command_supports_non_personal_filters(): void
    {
        $seller = User::factory()->create();
        $this->insertAd($seller->id, [
            'status' => 'active',
            'category' => 'servicios',
            'state' => 'Jalisco',
            'city' => 'Guadalajara',
        ]);

        $filtered = app(SupplyReadinessService::class)->report('servicios', 'Jalisco');
        $this->assertSame([
            'category' => 'servicios',
            'state' => 'Jalisco',
        ], $filtered['filters']);
        $this->assertSame(1, $filtered['summary']['active_genuine']);

        $this->artisan('ads:supply-readiness', [
            '--json' => true,
            '--category' => 'servicios',
            '--state' => 'Jalisco',
        ])->expectsOutputToContain('"active_genuine": 1')
            ->assertSuccessful();
    }

    private function insertAd(int $userId, array $overrides = []): void
    {
        static $counter = 0;
        $counter++;
        $now = now();

        DB::table('ads')->insert(array_merge([
            'user_id' => $userId,
            'title' => "Supply test {$counter}",
            'description' => 'Private test description',
            'price' => 1000,
            'location' => 'México',
            'category' => 'motor',
            'condition' => 'used',
            'status' => 'archived',
            'is_catalog_filler' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ], $overrides));
    }
}

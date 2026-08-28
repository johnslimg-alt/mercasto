<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RecommendationSafetyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array']);
        Cache::flush();
    }

    public function test_trending_and_personalized_recommendations_exclude_catalog_fillers(): void
    {
        $user = User::factory()->create();
        $reference = $this->ad($user, ['category' => 'autos', 'price' => 100000]);
        $candidate = $this->ad(User::factory()->create(), ['category' => 'autos', 'price' => 105000, 'views' => 10]);
        $catalog = $this->ad(User::factory()->create(), ['category' => 'autos', 'price' => 103000, 'views' => 9999, 'is_catalog_filler' => true]);

        DB::table('favorites')->insert([
            'user_id' => $user->id,
            'ad_id' => $reference->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(RecommendationService::class);
        $trendingIds = array_column($service->getTrendingRecommendations(20), 'id');
        $personalizedIds = array_column($service->getRecommendations($user, 20), 'id');

        $this->assertContains($candidate->id, $trendingIds);
        $this->assertNotContains($catalog->id, $trendingIds);
        $this->assertContains($candidate->id, $personalizedIds);
        $this->assertNotContains($catalog->id, $personalizedIds);
    }

    public function test_view_signal_is_privacy_minimized_and_invalidates_personalized_cache_version(): void
    {
        $user = User::factory()->create();
        $ad = $this->ad(User::factory()->create());
        $catalog = $this->ad(User::factory()->create(), ['is_catalog_filler' => true]);
        $service = app(RecommendationService::class);

        $service->trackView($ad->id, $user);
        $service->trackView($catalog->id, $user);

        $view = DB::table('ad_views')->where('ad_id', $ad->id)->where('user_id', $user->id)->first();
        $this->assertNotNull($view);
        $this->assertNull($view->ip_address);
        $this->assertNull($view->user_agent);
        $this->assertFalse(DB::table('ad_views')->where('ad_id', $catalog->id)->where('user_id', $user->id)->exists());
        $this->assertSame(2, (int) Cache::get("recommendations:user:{$user->id}:version"));
    }

    private function ad(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Listing',
            'description' => 'Genuine listing',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'is_catalog_filler' => false,
            'views' => 0,
        ], $overrides));
    }
}

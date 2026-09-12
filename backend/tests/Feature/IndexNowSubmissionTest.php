<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\IndexNowController;
use App\Jobs\SubmitIndexNowUrl;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * IndexNow is a discovery-speed feed for Bing/Yandex/Seznam/Naver/Yep. It must advertise exactly
 * the canonical URLs the sitemap advertises, must never run inside the publish request, and must
 * never fail a publish when the third party is unavailable.
 */
class IndexNowSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.url' => 'https://mercasto.test',
            'marketplace.indexnow.key' => 'a7f5b8c9d2e4f6a1b3c5d7e9f2a4b6c8',
            'marketplace.indexnow.endpoint' => 'https://api.indexnow.org/indexnow',
        ]);
        // No blanket Http::fake() here: stubs are merged first-match-wins, so each test that
        // actually performs a request declares its own response.
        Queue::fake();
    }

    public function test_indexable_listing_changes_are_queued_with_the_canonical_url(): void
    {
        $listing = $this->listing(['status' => 'active', 'expires_at' => now()->addDays(3)]);

        IndexNowController::notifyAdChange($listing, 'update');

        Queue::assertPushed(SubmitIndexNowUrl::class, function (SubmitIndexNowUrl $job) use ($listing): bool {
            // The path segment of this URL is owned by PR #1135 (SeoIndexability::listingUrl);
            // this test guards the queueing and the identity of the submitted listing.
            return str_ends_with($job->url, '/' . $listing->id)
                && str_contains($job->url, (string) $listing->id);
        });
    }

    public function test_hidden_and_lapsed_listings_are_never_submitted(): void
    {
        foreach ([
            ['status' => 'archived', 'expires_at' => now()->addDays(3)],
            ['status' => 'pending', 'expires_at' => now()->addDays(3)],
            ['status' => 'active', 'expires_at' => null],
            ['status' => 'active', 'expires_at' => now()->subDay()],
            ['status' => 'active', 'expires_at' => now()->addDays(3), 'is_catalog_filler' => true],
        ] as $attributes) {
            IndexNowController::notifyAdChange($this->listing($attributes), 'update');
        }

        Queue::assertNothingPushed();
    }

    public function test_the_queued_job_submits_the_public_key_location_and_never_throws(): void
    {
        Http::fake(['api.indexnow.org/*' => Http::response('', 200)]);

        (new SubmitIndexNowUrl('https://mercasto.test/ads/7'))->handle();

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.indexnow.org/indexnow'
                && $request['host'] === 'mercasto.test'
                && $request['key'] === 'a7f5b8c9d2e4f6a1b3c5d7e9f2a4b6c8'
                && $request['keyLocation'] === 'https://mercasto.test/a7f5b8c9d2e4f6a1b3c5d7e9f2a4b6c8.txt'
                && $request['urlList'] === ['https://mercasto.test/ads/7'];
        });
    }

    public function test_a_failing_indexnow_endpoint_is_logged_and_not_thrown(): void
    {
        Http::fake(['api.indexnow.org/*' => Http::response('upstream down', 503)]);
        Log::spy();

        (new SubmitIndexNowUrl('https://mercasto.test/ads/7'))->handle();

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => $message === 'IndexNow submission rejected')
            ->once();
        Log::shouldNotHaveReceived('error');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function listing(array $overrides = []): Ad
    {
        $seller = User::factory()->create();

        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Bicicleta urbana con frenos revisados',
            'description' => 'Descripción verificable con detalle suficiente para no ser delgada.',
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
        ], $overrides)));
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\AnalyticsTrackingConsent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Defer\DeferredCallbackCollection;
use RuntimeException;
use Tests\TestCase;

class OpenAiRegistrationAfterCommitTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, string> */
    protected $connectionsToTransact = [];

    protected function beforeRefreshingDatabase(): void
    {
        // This class deliberately disables the outer test transaction so Laravel's
        // afterCommit callback can be exercised against a real commit boundary.
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.facebook.pixel_id' => null,
            'services.facebook.access_token' => null,
            'services.tiktok.pixel_code' => null,
            'services.tiktok.access_token' => null,
            'services.openai_ads.pixel_id' => 'px_registration_commit_test',
            'services.openai_ads.api_key' => 'test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
            'app.frontend_url' => 'https://mercasto.com',
        ]);
        Http::fake([
            'bzr.openai.com/*' => Http::response(['accepted' => 1], 200),
        ]);
    }

    protected function tearDown(): void
    {
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
        parent::tearDown();
    }

    public function test_openai_registration_conversion_obeys_commit_and_rollback_boundaries(): void
    {
        $this->bindRegistrationRequest('registration_after_commit_ok');
        DB::transaction(function (): void {
            $user = User::factory()->create(['email' => 'after-commit@example.test']);
            AnalyticsTrackingConsent::persist($user, true);
        });

        $this->assertCount(0, $this->openAiRequests());
        $deferred = $this->app->make(DeferredCallbackCollection::class);
        $this->assertCount(1, $deferred);
        $deferred->invoke();

        $openAiRequests = $this->openAiRequests();
        $this->assertCount(1, $openAiRequests);
        $event = $openAiRequests->first()[0]->data()['events'][0] ?? [];
        $this->assertSame('registration_after_commit_ok', $event['id'] ?? null);
        $this->assertSame('registration_completed', $event['type'] ?? null);

        $this->bindRegistrationRequest('registration_after_rollback');
        try {
            DB::transaction(function (): void {
                $user = User::factory()->create(['email' => 'rollback@example.test']);
                AnalyticsTrackingConsent::persist($user, true);
                throw new RuntimeException('force rollback');
            });
            $this->fail('Expected rollback exception.');
        } catch (RuntimeException $exception) {
            $this->assertSame('force rollback', $exception->getMessage());
        }

        $this->assertCount(0, $this->app->make(DeferredCallbackCollection::class));
        $this->assertCount(1, $this->openAiRequests());
        $this->assertDatabaseMissing('users', ['email' => 'rollback@example.test']);
        DB::table('users')->where('email', 'after-commit@example.test')->delete();
    }

    private function bindRegistrationRequest(string $eventId): void
    {
        $request = Request::create('/api/register', 'POST', [
            'meta_event_id' => $eventId,
            'openai_measurement_consent' => true,
            'registration_method' => 'email',
        ], [], [], [
            'REMOTE_ADDR' => '203.0.113.70',
            'HTTP_USER_AGENT' => 'MercastoAfterCommitTest/1.0',
            'HTTP_REFERER' => 'https://mercasto.com/registro',
        ]);
        $this->app->instance('request', $request);
    }

    private function openAiRequests()
    {
        return collect(Http::recorded())->filter(
            fn ($entry) => str_contains($entry[0]->url(), 'bzr.openai.com')
        );
    }
}

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\SeoMeasurementSnapshot;
use App\Models\User;
use App\Services\SeoWeeklyMeasurementService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SeoWeeklyMeasurementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-05 18:00:00');
        config([
            'seo_reporting.service_account_path' => null,
            'seo_reporting.search_console_site_url' => null,
            'seo_reporting.analytics_property_id' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_report_counts_only_genuine_inventory_and_contains_no_personal_data(): void
    {
        $publisher = User::factory()->create([
            'created_at' => now()->subDays(2),
            'email_verified_at' => now()->subDay(),
        ]);
        User::factory()->create([
            'created_at' => now()->subDay(),
            'email_verified_at' => null,
        ]);
        $oldUser = User::factory()->create([
            'created_at' => now()->subDays(30),
        ]);

        $genuine = $this->ad($publisher, false, 'active', now()->subDay(), now()->addDays(6));
        $catalog = $this->ad($publisher, true, 'active', now()->subDay(), null);
        $this->ad($oldUser, false, 'archived', now()->subDays(20), null);

        DB::table('ad_views')->insert([
            $this->viewRow($genuine->id),
            $this->viewRow($catalog->id),
        ]);
        DB::table('ad_clicks')->insert([
            'ad_id' => $genuine->id,
            'user_id' => null,
            'channel' => 'whatsapp',
            'ip_address' => null,
            'created_at' => now()->subHours(4),
            'updated_at' => now()->subHours(4),
        ]);

        $buyer = User::factory()->create(['created_at' => now()->subDays(20)]);
        $secondBuyer = User::factory()->create(['created_at' => now()->subDays(20)]);
        $conversationId = DB::table('conversations')->insertGetId([
            'ad_id' => $genuine->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $publisher->id,
            'last_message_at' => now()->subHours(8.5),
            'buyer_unread_count' => 0,
            'seller_unread_count' => 0,
            'status' => 'active',
            'created_at' => now()->subHours(10),
            'updated_at' => now()->subHours(8.5),
        ]);
        $unansweredConversationId = DB::table('conversations')->insertGetId([
            'ad_id' => $genuine->id,
            'buyer_id' => $secondBuyer->id,
            'seller_id' => $publisher->id,
            'last_message_at' => now()->subHours(7),
            'buyer_unread_count' => 0,
            'seller_unread_count' => 1,
            'status' => 'active',
            'created_at' => now()->subHours(7),
            'updated_at' => now()->subHours(7),
        ]);
        DB::table('messages')->insert([
            $this->messageRow($conversationId, $buyer->id, $publisher->id, $genuine->id, now()->subHours(9)),
            $this->messageRow($conversationId, $publisher->id, $buyer->id, $genuine->id, now()->subHours(8.5)),
            $this->messageRow($unansweredConversationId, $secondBuyer->id, $publisher->id, $genuine->id, now()->subHours(7)),
        ]);

        $report = app(SeoWeeklyMeasurementService::class)->report(7);

        $this->assertSame(2, $report['internal']['current']['new_users']);
        $this->assertSame(1, $report['internal']['current']['verified_new_users']);
        $this->assertSame(1, $report['internal']['current']['genuine_ads_created']);
        $this->assertSame(1, $report['internal']['current']['first_publishers']);
        $this->assertSame(1, $report['internal']['current']['genuine_listing_views']);
        $this->assertSame(1, $report['internal']['current']['genuine_contact_clicks']);
        $this->assertSame(2, $report['internal']['current']['internal_conversations_started']);
        $this->assertSame(1, $report['internal']['current']['seller_replied_conversations']);
        $this->assertSame(50.0, $report['internal']['current']['seller_response_rate_percent']);
        $this->assertSame(30.0, $report['internal']['current']['median_first_response_minutes']);
        $this->assertSame(50.0, $report['internal']['current']['seller_replies_within_2h_percent']);
        $this->assertSame(1, $report['indexability']['indexable_genuine_listing_urls']);
        $this->assertSame(1, $report['indexability']['active_catalog_references_noindex']);
        $this->assertSame(6, $report['indexability']['source_pages']);
        $this->assertSame('not_configured', $report['external']['search_console']['status']);
        $this->assertSame('not_configured', $report['external']['ga4']['status']);
        $this->assertFalse($report['external']['external_complete']);
        $this->assertSame([], $report['privacy_hits']);
        $this->assertStringNotContainsString($publisher->email, json_encode($report));
    }

    public function test_command_stores_one_idempotent_snapshot_and_strict_mode_fails_closed(): void
    {
        $this->artisan('seo:weekly-measurement', [
            '--days' => 7,
            '--store' => true,
            '--json' => true,
        ])->assertSuccessful();
        $this->artisan('seo:weekly-measurement', [
            '--days' => 7,
            '--store' => true,
            '--json' => true,
        ])->assertSuccessful();

        $this->assertSame(1, SeoMeasurementSnapshot::query()->count());
        $snapshot = SeoMeasurementSnapshot::query()->firstOrFail();
        $this->assertSame('2026-07-29', $snapshot->period_start->toDateString());
        $this->assertSame('2026-08-05', $snapshot->period_end->toDateString());
        $this->assertFalse($snapshot->external_complete);
        $this->assertSame([], $snapshot->report['privacy_hits']);

        $this->artisan('seo:weekly-measurement', [
            '--require-external' => true,
        ])->assertFailed();
    }

    private function ad(
        User $user,
        bool $catalog,
        string $status,
        Carbon $createdAt,
        ?Carbon $expiresAt,
    ): Ad {
        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => $catalog ? 'Referencia de catálogo' : 'Anuncio genuine',
            'description' => 'Contenido de prueba.',
            'price' => 1000,
            'location' => 'Pachuca de Soto',
            'state' => 'Hidalgo',
            'city' => 'Pachuca de Soto',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => $status,
            'is_catalog_filler' => $catalog,
            'expires_at' => $expiresAt,
        ]);
        $ad->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        return $ad->fresh();
    }

    private function messageRow(
        int $conversationId,
        int $senderId,
        int $receiverId,
        int $adId,
        Carbon $createdAt,
    ): array {
        return [
            'conversation_id' => $conversationId,
            'sender_id' => $senderId,
            'receiver_id' => $receiverId,
            'ad_id' => $adId,
            'body' => 'Mensaje de prueba',
            'type' => 'text',
            'content' => 'Mensaje de prueba',
            'is_read' => true,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }

    private function viewRow(int $adId): array
    {
        return [
            'ad_id' => $adId,
            'user_id' => null,
            'ip_address' => null,
            'user_agent' => null,
            'viewed_at' => now()->subHours(6),
            'created_at' => now()->subHours(6),
            'updated_at' => now()->subHours(6),
        ];
    }
}

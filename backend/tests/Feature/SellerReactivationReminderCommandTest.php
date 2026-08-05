<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Mail\SellerReactivationReminderMail;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SellerReactivationReminderCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Event::fake([NewNotification::class]);
        config(['app.frontend_url' => 'https://mercasto.test']);
    }

    public function test_command_is_dry_run_by_default(): void
    {
        $seller = User::factory()->create();
        $this->readyAd($seller);

        $this->artisan('ads:remind-reactivation')->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 0);
        Mail::assertNothingQueued();
    }

    public function test_execute_aggregates_ready_ads_per_seller_and_is_idempotent(): void
    {
        $seller = User::factory()->create([
            'notification_preferences' => ['email_alerts' => true],
        ]);
        $this->readyAd($seller, ['title' => 'Primero']);
        $this->readyAd($seller, ['title' => 'Segundo']);

        $this->artisan('ads:remind-reactivation', ['--execute' => true])
            ->assertSuccessful();

        $notification = DB::table('user_notifications')->first();
        $this->assertNotNull($notification);
        $this->assertSame('seller_reactivation_reminder', $notification->type);
        $this->assertSame('/profile?tab=my_ads&filter=review_ready', $notification->link);
        $this->assertSame([
            'stage' => 'initial',
            'ready_count' => 2,
        ], json_decode($notification->data, true));

        Mail::assertQueued(SellerReactivationReminderMail::class, function ($mail) use ($seller) {
            return $mail->hasTo($seller->email)
                && $mail->readyCount === 2
                && $mail->stage === 'initial'
                && str_contains($mail->actionUrl, 'filter=review_ready');
        });

        $this->artisan('ads:remind-reactivation', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertQueuedCount(1);
    }

    public function test_follow_up_waits_for_configured_delay(): void
    {
        $seller = User::factory()->create();
        $this->readyAd($seller);

        $this->artisan('ads:remind-reactivation', ['--execute' => true])
            ->assertSuccessful();

        $this->artisan('ads:remind-reactivation', [
            '--execute' => true,
            '--follow-up-after' => 72,
        ])->assertSuccessful();
        $this->assertDatabaseCount('user_notifications', 1);

        DB::table('user_notifications')
            ->where('type', 'seller_reactivation_reminder')
            ->update(['created_at' => now()->subHours(73)]);

        $this->artisan('ads:remind-reactivation', [
            '--execute' => true,
            '--follow-up-after' => 72,
        ])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 2);
        $followUp = DB::table('user_notifications')->orderByDesc('id')->first();
        $this->assertSame('follow_up', json_decode($followUp->data, true)['stage']);
        Mail::assertQueuedCount(2);
    }

    public function test_no_more_reminders_are_sent_after_the_ad_is_active(): void
    {
        $seller = User::factory()->create();
        $ad = $this->readyAd($seller);

        $this->artisan('ads:remind-reactivation', ['--execute' => true])
            ->assertSuccessful();
        DB::table('user_notifications')->update(['created_at' => now()->subHours(73)]);

        $ad->forceFill([
            'status' => 'active',
            'expires_at' => now()->addDays(7),
        ])->saveQuietly();

        $this->artisan('ads:remind-reactivation', [
            '--execute' => true,
            '--follow-up-after' => 72,
        ])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertQueuedCount(1);
    }

    public function test_email_opt_out_still_receives_one_in_app_reminder(): void
    {
        $seller = User::factory()->create([
            'notification_preferences' => ['email_alerts' => false],
        ]);
        $this->readyAd($seller);

        $this->artisan('ads:remind-reactivation', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertNothingQueued();
    }

    private function readyAd(User $seller, array $overrides = []): Ad
    {
        static $counter = 0;
        $counter++;

        return Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => "Anuncio listo {$counter}",
            'description' => 'Descripción permitida.',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'ai_moderation_status' => 'approved',
            'ai_moderated_at' => now()->subHour(),
            'is_catalog_filler' => false,
        ], $overrides));
    }
}

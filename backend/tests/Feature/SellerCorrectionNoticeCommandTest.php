<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Mail\SellerCorrectionRequiredMail;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SellerCorrectionNoticeCommandTest extends TestCase
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
        $this->fixableAd($seller, ['missing_original_photos']);

        $this->artisan('ads:notify-seller-corrections')->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 0);
        Mail::assertNothingQueued();
    }

    public function test_execute_aggregates_fixable_ads_and_excludes_sensitive_cases(): void
    {
        $seller = User::factory()->create([
            'notification_preferences' => ['email_alerts' => true],
        ]);
        $first = $this->fixableAd($seller, ['missing_original_photos']);
        $second = $this->fixableAd($seller, ['condition_mismatch', 'precio_incoherente']);

        $sensitiveSeller = User::factory()->create();
        $this->fixableAd($sensitiveSeller, ['desbloqueo_dispositivo', 'potential_fraud']);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $notification = DB::table('user_notifications')->first();
        $this->assertNotNull($notification);
        $this->assertSame($seller->id, $notification->user_id);
        $this->assertSame('seller_correction_required', $notification->type);
        $this->assertSame('/profile?tab=my_ads&filter=needs_correction', $notification->link);
        $data = json_decode($notification->data, true);
        $this->assertEqualsCanonicalizing([$first->id, $second->id], $data['ad_ids']);
        $this->assertEqualsCanonicalizing(['photos', 'details', 'price'], $data['issue_codes']);

        Mail::assertQueued(SellerCorrectionRequiredMail::class, function ($mail) use ($seller) {
            return $mail->hasTo($seller->email)
                && $mail->adCount === 2
                && str_contains($mail->actionUrl, 'filter=needs_correction');
        });
        $this->assertDatabaseCount('user_notifications', 1);
    }

    public function test_existing_batch_is_not_duplicated_but_new_ads_trigger_a_new_notice(): void
    {
        $seller = User::factory()->create();
        $first = $this->fixableAd($seller, ['missing_original_photos']);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();
        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertQueuedCount(1);

        $second = $this->fixableAd($seller, ['condition_mismatch']);
        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 2);
        Mail::assertQueuedCount(2);
        $latest = DB::table('user_notifications')->orderByDesc('id')->first();
        $data = json_decode($latest->data, true);
        $this->assertEqualsCanonicalizing([$first->id, $second->id], $data['ad_ids']);
        $this->assertSame([$second->id], $data['new_ad_ids']);
    }

    public function test_email_opt_out_still_receives_in_app_notice(): void
    {
        $seller = User::factory()->create([
            'notification_preferences' => ['email_alerts' => false],
        ]);
        $this->fixableAd($seller, ['missing_original_photos']);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertNothingQueued();
    }

    private function fixableAd(User $seller, array $flags): Ad
    {
        static $counter = 0;
        $counter++;

        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => "Anuncio {$counter}",
            'description' => 'Descripción.',
            'price' => 1000,
            'condition' => 'usado',
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'motor',
            'subcategory' => 'Autos',
            'attributes' => ['subcategory' => 'Autos'],
            'status' => 'archived',
            'ai_moderation_status' => 'manual_review',
            'ai_moderation_reason' => 'Requiere corrección.',
            'ai_moderated_at' => now(),
            'is_catalog_filler' => false,
        ]);

        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Requiere corrección.',
            'metadata' => [
                'result' => [
                    'decision' => 'manual_review',
                    'flags' => $flags,
                ],
            ],
        ]);

        return $ad;
    }
}

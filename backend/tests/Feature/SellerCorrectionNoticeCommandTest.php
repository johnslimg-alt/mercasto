<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Mail\SellerCorrectionRequiredMail;
use App\Mail\SellerReviewIncompleteMail;
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

    // ---------------------------------------------------------------------
    // ai_moderation_status = 'failed': the state that used to reach nobody
    // ---------------------------------------------------------------------

    public function test_failed_ad_notifies_the_seller_and_never_asks_for_a_correction(): void
    {
        $seller = User::factory()->create();
        $ad = $this->failedAd($seller);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $notification = DB::table('user_notifications')->first();
        $this->assertNotNull($notification, 'A seller whose ad failed moderation must be told.');
        $this->assertSame($seller->id, $notification->user_id);
        $this->assertSame('seller_review_incomplete', $notification->type);

        // The ad is listed under `pending` on the dashboard, not under `needs_correction`:
        // MyAdsScreen's needs_correction bucket requires seller_correction.required === true,
        // which a failed ad never sets, so the old link would have landed on an empty list.
        $this->assertSame('/profile?tab=my_ads&filter=pending', $notification->link);

        $data = json_decode($notification->data, true);
        $this->assertSame([$ad->id], $data['ad_ids']);
        $this->assertSame([$ad->id], $data['new_ad_ids']);
        $this->assertSame(['review_incomplete'], $data['issue_codes']);

        // Truthful copy: it may not blame the seller, may not claim to know a cause that was
        // never persisted, and may not ask for an edit that would not re-queue the ad
        // (AdController only re-moderates manual_review and admin_changes_requested).
        $message = (string) $notification->message;
        $this->assertStringContainsString('problema técnico', $message);
        $this->assertStringContainsString('no por un error tuyo', $message);
        $this->assertStringContainsString('no está publicado', $message);
        $this->assertStringNotContainsString('Corrige', $message);
        $this->assertStringNotContainsString('volver a enviar', $message);

        // The email must be the one that asks for nothing. Reusing the correction mail would
        // send "Corrige tu anuncio para publicarlo" to a seller who has nothing to correct.
        Mail::assertQueued(SellerReviewIncompleteMail::class, function ($mail) use ($seller) {
            return $mail->hasTo($seller->email)
                && $mail->adCount === 1
                && str_contains($mail->actionUrl, 'filter=pending');
        });
        Mail::assertNotQueued(SellerCorrectionRequiredMail::class);

        $this->assertDatabaseCount('user_notifications', 1);
    }

    public function test_failed_ad_matching_the_production_row_shape_is_notified_even_under_assist_only(): void
    {
        // Ad 6626 in production: archived + failed, with a manual_review decision whose
        // metadata says assist_only. The assist-only guard exists to stop MODEL OUTPUT
        // becoming seller-facing advice; a review that never produced output has none to leak,
        // so the seller must still hear that nothing was decided.
        $seller = User::factory()->create();
        $ad = $this->failedAd($seller, [
            'technical_status' => 'failed',
            'assist_only' => true,
        ]);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        $this->assertSame('seller_review_incomplete', DB::table('user_notifications')->value('type'));
        Mail::assertQueued(SellerReviewIncompleteMail::class);
    }

    public function test_failed_ads_are_dry_run_by_default(): void
    {
        $seller = User::factory()->create();
        $this->failedAd($seller);

        $this->artisan('ads:notify-seller-corrections')->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 0);
        Mail::assertNothingQueued();
    }

    public function test_a_second_run_does_not_notify_the_same_failed_ad_twice(): void
    {
        $seller = User::factory()->create();
        $this->failedAd($seller);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();
        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertQueuedCount(1);
    }

    public function test_a_new_failed_ad_notifies_without_repeating_the_already_notified_fixable_one(): void
    {
        // The negative control for the union of notice types: the fixable notice must not be
        // re-sent, and the failed notice must not swallow the fixable ad's id into a second,
        // contradictory story about the same ad.
        $seller = User::factory()->create();
        $fixable = $this->fixableAd($seller, ['missing_original_photos']);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();
        $this->assertDatabaseCount('user_notifications', 1);

        $failed = $this->failedAd($seller);
        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 2);
        $this->assertSame(
            1,
            DB::table('user_notifications')->where('type', 'seller_correction_required')->count(),
            'The already-notified fixable ad must not be re-sent.'
        );

        $latest = DB::table('user_notifications')->orderByDesc('id')->first();
        $this->assertSame('seller_review_incomplete', $latest->type);
        $this->assertSame([$failed->id], json_decode($latest->data, true)['ad_ids']);
        $this->assertNotContains($fixable->id, json_decode($latest->data, true)['ad_ids']);
    }

    public function test_a_failed_ad_already_named_in_an_earlier_notice_is_not_notified_again(): void
    {
        // Idempotency is keyed on the ad ids already carried by any notice of either type, so
        // a seller who was told about this ad once cannot be told about it a second time under
        // a different heading.
        $seller = User::factory()->create();
        $ad = $this->failedAd($seller);

        DB::table('user_notifications')->insert([
            'user_id' => $seller->id,
            'title' => 'Aviso previo',
            'message' => 'Aviso previo.',
            'type' => 'seller_correction_required',
            'data' => json_encode(['ad_ids' => [$ad->id], 'new_ad_ids' => [$ad->id]]),
            'link' => '/profile?tab=my_ads&filter=needs_correction',
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        Mail::assertNothingQueued();
    }

    public function test_failed_ad_seller_who_opted_out_of_email_still_gets_the_in_app_notice(): void
    {
        $seller = User::factory()->create([
            'notification_preferences' => ['email_alerts' => false],
        ]);
        $this->failedAd($seller);

        $this->artisan('ads:notify-seller-corrections', ['--execute' => true])->assertSuccessful();

        $this->assertDatabaseCount('user_notifications', 1);
        $this->assertSame('seller_review_incomplete', DB::table('user_notifications')->value('type'));
        Mail::assertNothingQueued();
    }

    public function test_the_incomplete_review_email_renders_truthfully_for_one_and_for_several_ads(): void
    {
        // Mail::fake() never renders the view, and the command catches Throwable around the
        // queue call, so a broken template would silently deliver no email at all while every
        // other test stayed green. This renders the real Blade output.
        $seller = User::factory()->create(['name' => 'Vendedor Prueba']);
        $url = 'https://mercasto.test/profile?tab=my_ads&filter=pending';

        $single = (new SellerReviewIncompleteMail($seller, 1, $url))->render();
        $this->assertStringContainsString('No pudimos completar la revisión de tu anuncio', $single);
        $this->assertStringContainsString('1 de tus anuncios', $single);
        $this->assertStringContainsString('No es un error tuyo', $single);
        // Blade escapes the query separator, so the rendered link is not the raw URL.
        $this->assertStringContainsString('profile?tab=my_ads&amp;filter=pending', $single);
        // The correction mail's ask has no place in the mail that has nothing to correct.
        $this->assertStringNotContainsString('Corrige tu anuncio', $single);

        $plural = (new SellerReviewIncompleteMail($seller, 3, $url))->render();
        $this->assertStringContainsString('No pudimos completar la revisión de tus anuncios', $plural);
        $this->assertStringContainsString('3 de tus anuncios', $plural);

        $this->assertSame(
            'No pudimos completar la revisión de tu anuncio — Mercasto',
            (new SellerReviewIncompleteMail($seller, 1, $url))->envelope()->subject,
        );
        $this->assertSame(
            'No pudimos completar la revisión de tus anuncios — Mercasto',
            (new SellerReviewIncompleteMail($seller, 3, $url))->envelope()->subject,
        );
    }

    /**
     * An ad in the state ad 6626 is in: hidden, `failed`, with the AI's manual_review decision
     * recorded but no persisted failure cause.
     */
    private function failedAd(User $seller, array $metadata = []): Ad
    {
        static $counter = 0;
        $counter++;

        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => "Anuncio fallido {$counter}",
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
            'ai_moderation_status' => 'failed',
            'ai_moderation_reason' => 'La revisión automática falló y el anuncio requiere revisión manual.',
            'ai_moderated_at' => now(),
            'is_catalog_filler' => false,
        ]);

        AdModerationDecision::query()->create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'La revisión automática falló y el anuncio requiere revisión manual.',
            'metadata' => array_merge([
                'technical_status' => 'failed',
                'activation_mode' => 'human_confirmation_required',
                'rollout_mode' => 'assist',
                'assist_only' => true,
                'human_authoritative' => true,
                'policy_review' => [
                    'required' => false,
                    'policy_ids' => [],
                    'human_authoritative' => true,
                    'authoritative_action' => null,
                ],
            ], $metadata),
        ]);

        return $ad;
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

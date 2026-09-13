<?php

namespace Tests\Feature;

use App\Mail\AdApprovedMail;
use App\Mail\AdRejectedMail;
use App\Mail\SearchAlertMail;
use App\Mail\SellerCorrectionRequiredMail;
use App\Mail\SellerReactivationReminderMail;
use App\Mail\WeeklyDigestMail;
use App\Models\Ad;
use App\Models\SearchAlert;
use App\Models\User;
use App\Support\MailTranslations;
use Illuminate\Database\Eloquent\Collection;
use Tests\TestCase;

/**
 * These templates are Spanish-only: every visible string is written inline in Spanish and none of
 * them calls __(). They still inherit the shared emails.layout footer, which resolves its labels
 * through __(). Because queued mailables render in the queue worker (an English-locale console
 * process), an unpinned mailable rendered that footer in English inside an otherwise Spanish email.
 */
class SpanishOnlyMailFooterTest extends TestCase
{
    public function test_spanish_only_mails_render_the_shared_footer_in_spanish(): void
    {
        // Reproduce the queue-worker default: the application locale is English.
        app()->setLocale('en');

        $copy = MailTranslations::lines('es');
        $user = (new User())->forceFill(['name' => 'Vendedor']);
        $ad = (new Ad())->forceFill(['title' => 'Bicicleta', 'price' => 1500]);
        $ads = new Collection([$ad]);
        $alert = (new SearchAlert())->forceFill(['name' => 'Bicicleta']);

        $mails = [
            'ad_approved' => new AdApprovedMail($ad),
            'ad_rejected' => new AdRejectedMail($ad, 'Falta el precio'),
            'search_alert' => new SearchAlertMail($alert, $ads),
            'seller_correction_required' => new SellerCorrectionRequiredMail($user, 1, ['Falta el precio'], 'https://mercasto.com/a'),
            'seller_reactivation_reminder' => new SellerReactivationReminderMail($user, 2, 'initial', 'https://mercasto.com/b'),
            'weekly_digest' => new WeeklyDigestMail($user, $ads),
        ];

        foreach ($mails as $name => $mail) {
            $html = $mail->render();

            $this->assertStringContainsString(
                $copy['emails.layout.manage_preferences'],
                $html,
                "$name must render the footer preferences link in Spanish"
            );
            $this->assertStringContainsString(
                $copy['emails.layout.visit_site'],
                $html,
                "$name must render the footer website link in Spanish"
            );
            $this->assertStringContainsString(
                $copy['emails.layout.support'],
                $html,
                "$name must render the footer support link in Spanish"
            );

            $this->assertStringNotContainsString(
                'Manage preferences',
                $html,
                "$name must not leak the English footer label"
            );
        }

        // The mailable locale is scoped to the render and must not leak into the application.
        $this->assertSame('en', app()->getLocale());
    }
}

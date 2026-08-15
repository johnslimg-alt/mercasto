<?php

namespace Tests\Feature;

use App\Mail\NewMessageMail;
use App\Models\User;
use App\Support\MailLocale;
use App\Support\MailTranslations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Lang;
use Tests\TestCase;

class NotificationReturnEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_locale_is_saved_and_archived_locales_fall_back_to_spanish(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => [
                'email_alerts' => false,
                'email_new_message' => true,
                'push_notifications' => true,
            ],
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/user/notifications', [
            'locale' => 'ru',
        ])->assertOk();

        $preferences = $user->fresh()->notification_preferences;
        $this->assertSame('ru', $preferences['locale']);
        $this->assertFalse($preferences['email_alerts']);
        $this->assertTrue($preferences['email_new_message']);

        $this->actingAs($user->fresh(), 'sanctum')->postJson('/api/user/notifications', [
            'locale' => 'he',
        ])->assertOk();
        $this->assertSame('es', $user->fresh()->notification_preferences['locale']);
    }

    public function test_new_message_mail_is_localized_generic_and_links_to_the_exact_conversation(): void
    {
        foreach (MailLocale::SUPPORTED as $locale) {
            Lang::addLines(MailTranslations::lines($locale), $locale);
            app()->setLocale($locale);
            $copy = MailTranslations::lines($locale);
            $mail = new NewMessageMail(77, $locale);
            $html = $mail->render();

            $this->assertSame($locale, $mail->localeCode);
            $this->assertStringContainsString($copy['emails.new_message.title'], $html);
            $this->assertStringContainsString($copy['emails.new_message.button'], $html);
            $this->assertStringContainsString('/mensajes?conversation=77', $html);
            $this->assertStringNotContainsString('messageBody', $html);
            $this->assertStringNotContainsString('buyerName', $html);
        }
    }

    public function test_mail_locale_contract_contains_only_active_languages(): void
    {
        $this->assertSame(
            ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'],
            MailLocale::SUPPORTED,
        );
        $this->assertSame('es', MailLocale::normalize('he'));
        $this->assertSame('es', MailLocale::normalize('yi'));
        $this->assertFalse(MailLocale::rtl('he'));
        $this->assertTrue(MailLocale::rtl('ar'));
    }
}

<?php

namespace App\Support;

class MailTranslations
{
    /**
     * Supplemental runtime email translations for every frontend language supported by Mercasto.
     * Native backend/lang files still work; this fills missing transactional email keys.
     */
    public static function lines(string $locale): array
    {
        $locale = MailLocale::normalize($locale);
        $copy = self::COPY[$locale] ?? self::COPY['es'];

        return [
            'emails.common.greeting' => $copy['greeting'],
            'emails.common.button_not_working' => $copy['button_not_working'],
            'emails.layout.default_preheader' => $copy['default_preheader'],
            'emails.layout.visit_site' => $copy['visit_site'],
            'emails.layout.support' => $copy['support'],
            'emails.layout.footer_reason' => $copy['footer_reason'],
            'emails.layout.manage_preferences' => $copy['manage_preferences'],
            'emails.layout.made_in_mexico' => $copy['made_in_mexico'],

            'emails.email_verify.subject' => $copy['verify_subject'],
            'emails.email_verify.preheader' => $copy['verify_preheader'],
            'emails.email_verify.title' => $copy['verify_title'],
            'emails.email_verify.intro' => $copy['verify_intro'],
            'emails.email_verify.description' => $copy['verify_description'],
            'emails.email_verify.button' => $copy['verify_button'],
            'emails.email_verify.ignore' => $copy['verify_ignore'],

            'emails.password_reset.subject' => $copy['reset_subject'],
            'emails.password_reset.preheader' => $copy['reset_preheader'],
            'emails.password_reset.title' => $copy['reset_title'],
            'emails.password_reset.intro' => $copy['reset_intro'],
            'emails.password_reset.description' => $copy['reset_description'],
            'emails.password_reset.button' => $copy['reset_button'],
            'emails.password_reset.expires' => $copy['reset_expires'],
            'emails.password_reset.ignore' => $copy['reset_ignore'],

            'emails.email_change.subject' => $copy['change_subject'],
            'emails.email_change.preheader' => $copy['change_preheader'],
            'emails.email_change.title' => $copy['change_title'],
            'emails.email_change.description' => $copy['change_description'],
            'emails.email_change.button' => $copy['change_button'],
            'emails.email_change.ignore' => $copy['change_ignore'],

            'emails.seller_contact.subject' => $copy['seller_subject'],
            'emails.seller_contact.preheader' => $copy['seller_preheader'],
            'emails.seller_contact.title' => $copy['seller_title'],
            'emails.seller_contact.intro_html' => $copy['seller_intro_html'],
            'emails.seller_contact.reply_hint' => $copy['seller_reply_hint'],
            'emails.seller_contact.button' => $copy['seller_button'],
            'emails.seller_contact.privacy' => $copy['seller_privacy'],
            'emails.seller_contact.safety' => $copy['seller_safety'],

            'emails.welcome.subject' => $copy['welcome_subject'],
            'emails.welcome.preheader' => $copy['welcome_preheader'],
            'emails.welcome.title' => $copy['welcome_title'],
            'emails.welcome.intro' => $copy['welcome_intro'],
            'emails.welcome.description' => $copy['welcome_description'],
            'emails.welcome.features_title' => $copy['welcome_features_title'],
            'emails.welcome.feature_1_title' => $copy['welcome_f1_title'],
            'emails.welcome.feature_1_desc' => $copy['welcome_f1_desc'],
            'emails.welcome.feature_2_title' => $copy['welcome_f2_title'],
            'emails.welcome.feature_2_desc' => $copy['welcome_f2_desc'],
            'emails.welcome.feature_3_title' => $copy['welcome_f3_title'],
            'emails.welcome.feature_3_desc' => $copy['welcome_f3_desc'],
            'emails.welcome.feature_4_title' => $copy['welcome_f4_title'],
            'emails.welcome.feature_4_desc' => $copy['welcome_f4_desc'],
            'emails.welcome.button' => $copy['welcome_button'],
            'emails.welcome.tip_title' => $copy['welcome_tip_title'],
            'emails.welcome.tip_desc' => $copy['welcome_tip_desc'],
            'emails.welcome.help' => $copy['welcome_help'],

            'emails.waitlist.subject' => $copy['waitlist_subject'],
            'emails.waitlist.preheader' => $copy['waitlist_preheader'],
            'emails.waitlist.title' => $copy['waitlist_title'],
            'emails.waitlist.intro' => $copy['waitlist_intro'],
            'emails.waitlist.your_position' => $copy['waitlist_your_position'],
            'emails.waitlist.position' => $copy['waitlist_position'],
            'emails.waitlist.next_steps' => $copy['waitlist_next_steps'],
            'emails.waitlist.step_1' => $copy['waitlist_step_1'],
            'emails.waitlist.step_2' => $copy['waitlist_step_2'],
            'emails.waitlist.step_3' => $copy['waitlist_step_3'],
            'emails.waitlist.referral' => $copy['waitlist_referral'],
            'emails.waitlist.referral_help' => $copy['waitlist_referral_help'],
            'emails.waitlist.share_link' => $copy['waitlist_share_link'],
            'emails.waitlist.bonus' => $copy['waitlist_bonus'],
            'emails.waitlist.bonus_desc' => $copy['waitlist_bonus_desc'],
            'emails.waitlist.check_status' => $copy['waitlist_check_status'],
        ];
    }

    private const COPY = [
        'es' => [
            'greeting' => 'Hola :name,', 'button_not_working' => 'Si el botón no funciona, copia y pega este enlace en tu navegador:', 'default_preheader' => 'Mercasto — Compra, vende y descubre cerca de ti', 'visit_site' => 'Visitar sitio web', 'support' => 'Soporte', 'footer_reason' => 'Recibiste este correo porque tienes una cuenta en Mercasto.', 'manage_preferences' => 'Gestionar preferencias', 'made_in_mexico' => 'Hecho en México',
            'verify_subject' => 'Verifica tu correo en Mercasto', 'verify_preheader' => 'Completa tu registro verificando tu dirección de correo', 'verify_title' => 'Verifica tu dirección de correo', 'verify_intro' => '¡Gracias por registrarte en Mercasto!', 'verify_description' => 'Para completar tu registro y acceder a todas las funciones de la plataforma, haz clic en el botón de abajo.', 'verify_button' => 'Verificar correo', 'verify_ignore' => 'Si no solicitaste esto, puedes ignorar este correo de forma segura.',
            'reset_subject' => 'Restablecer contraseña - Mercasto', 'reset_preheader' => 'Solicitud de restablecimiento de contraseña para tu cuenta', 'reset_title' => 'Restablecer contraseña', 'reset_intro' => 'Recibimos una solicitud para restablecer la contraseña de tu cuenta.', 'reset_description' => 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Mercasto. Haz clic en el botón de abajo para elegir una nueva contraseña.', 'reset_button' => 'Restablecer contraseña', 'reset_expires' => 'Este enlace expirará en :minutes minutos.', 'reset_ignore' => 'Si no solicitaste este cambio, puedes ignorar o eliminar este correo de forma segura. Tu cuenta seguirá protegida.',
            'change_subject' => 'Confirmar nuevo correo - Mercasto', 'change_preheader' => 'Confirma el nuevo correo electrónico de tu cuenta', 'change_title' => 'Confirma tu nuevo correo', 'change_description' => 'Has solicitado cambiar el correo electrónico asociado a tu cuenta de Mercasto. Para completar este proceso, verifica esta dirección con el botón de abajo.', 'change_button' => 'Confirmar correo', 'change_ignore' => 'Si no solicitaste este cambio, ignora este mensaje. Tu correo actual seguirá siendo el principal.',
            'seller_subject' => ':buyer está interesado en tu anuncio “:ad”', 'seller_preheader' => ':buyer te escribió desde Mercasto', 'seller_title' => 'Tienes una nueva consulta 📩', 'seller_intro_html' => '<strong>:buyer</strong> te ha escrito sobre tu anuncio <strong>“:ad”</strong>:', 'seller_reply_hint' => 'Puedes responder directamente a este correo para contactar a :buyer.', 'seller_button' => 'Ver anuncio', 'seller_privacy' => 'Recibes este correo porque un comprador usó el formulario de contacto de Mercasto. Tu dirección de correo no fue compartida con el comprador.', 'seller_safety' => 'Nunca compartas datos de pago por correo y desconfía de pagos anticipados.',
            'welcome_subject' => '¡Bienvenido a Mercasto, :name!', 'welcome_preheader' => 'Tu cuenta está lista. Comienza a comprar y vender hoy mismo.', 'welcome_title' => '¡Bienvenido a Mercasto, :name!', 'welcome_intro' => '¡Nos alegra mucho que te unas a la comunidad de Mercasto!', 'welcome_description' => 'Tu cuenta está lista y puedes empezar a usar la plataforma ahora mismo.', 'welcome_features_title' => 'Esto es lo que puedes hacer en Mercasto:', 'welcome_f1_title' => 'Publicar anuncios', 'welcome_f1_desc' => 'Vende lo que ya no necesitas en minutos.', 'welcome_f2_title' => 'Buscar ofertas', 'welcome_f2_desc' => 'Encuentra artículos únicos cerca de ti.', 'welcome_f3_title' => 'Mensajería segura', 'welcome_f3_desc' => 'Negocia directamente con compradores y vendedores.', 'welcome_f4_title' => 'IA para vendedores', 'welcome_f4_desc' => 'Genera descripciones profesionales automáticamente.', 'welcome_button' => 'Explorar Mercasto', 'welcome_tip_title' => '💡 Consejo pro:', 'welcome_tip_desc' => 'Completa tu perfil y verifica tu teléfono para vender más rápido.', 'welcome_help' => '¿Necesitas ayuda? Contáctanos en',
            'waitlist_subject' => '¡Estás en la lista de espera de Mercasto!', 'waitlist_preheader' => 'Tu posición actual: #:position. Comparte tu código para subir.', 'waitlist_title' => '¡Estás en la lista! 🎉', 'waitlist_intro' => 'Gracias por tu interés en Mercasto. Te uniste correctamente a nuestra lista de espera.', 'waitlist_your_position' => 'Tu posición actual', 'waitlist_position' => 'Tu posición actual: #:position', 'waitlist_next_steps' => '¿Qué pasa después?', 'waitlist_step_1' => 'Revisaremos tu solicitud', 'waitlist_step_2' => 'Recibirás una invitación cuando sea tu turno', 'waitlist_step_3' => 'Obtendrás acceso anticipado a Mercasto', 'waitlist_referral' => '¿Quieres subir en la lista?', 'waitlist_referral_help' => 'Comparte tu código de referido y sube posiciones.', 'waitlist_share_link' => 'Compartir mi link', 'waitlist_bonus' => '🎁 Bonus:', 'waitlist_bonus_desc' => 'Cada amigo que se registra te sube 5 posiciones.', 'waitlist_check_status' => 'Ver mi posición',
        ],
        'en' => [
            'greeting' => 'Hello :name,', 'button_not_working' => 'If the button does not work, copy and paste this link into your browser:', 'default_preheader' => 'Mercasto — Buy, sell, and discover near you', 'visit_site' => 'Visit website', 'support' => 'Support', 'footer_reason' => 'You received this email because you have a Mercasto account.', 'manage_preferences' => 'Manage preferences', 'made_in_mexico' => 'Made in Mexico',
            'verify_subject' => 'Verify your email on Mercasto', 'verify_preheader' => 'Complete your registration by verifying your email address', 'verify_title' => 'Verify your email address', 'verify_intro' => 'Thanks for signing up for Mercasto!', 'verify_description' => 'To complete your registration and access all platform features, click the button below.', 'verify_button' => 'Verify email', 'verify_ignore' => 'If you did not request this, you can safely ignore this email.',
            'reset_subject' => 'Reset password - Mercasto', 'reset_preheader' => 'Password reset request for your account', 'reset_title' => 'Reset password', 'reset_intro' => 'We received a request to reset your account password.', 'reset_description' => 'We received a request to reset the password for your Mercasto account. Click the button below to choose a new password.', 'reset_button' => 'Reset password', 'reset_expires' => 'This link will expire in :minutes minutes.', 'reset_ignore' => 'If you did not request this change, you can safely ignore or delete this email. Your account will remain protected.',
            'change_subject' => 'Confirm new email - Mercasto', 'change_preheader' => 'Confirm the new email address for your account', 'change_title' => 'Confirm your new email', 'change_description' => 'You requested to change the email address associated with your Mercasto account. To complete this process, verify this address with the button below.', 'change_button' => 'Confirm email', 'change_ignore' => 'If you did not request this change, ignore this message. Your current email will remain primary.',
            'seller_subject' => ':buyer is interested in your listing “:ad”', 'seller_preheader' => ':buyer wrote to you from Mercasto', 'seller_title' => 'You have a new inquiry 📩', 'seller_intro_html' => '<strong>:buyer</strong> wrote to you about your listing <strong>“:ad”</strong>:', 'seller_reply_hint' => 'You can reply directly to this email to contact :buyer.', 'seller_button' => 'View listing', 'seller_privacy' => 'You received this email because a buyer used the Mercasto contact form. Your email address was not shared with the buyer.', 'seller_safety' => 'Never share payment details by email and be careful with advance payments.',
            'welcome_subject' => 'Welcome to Mercasto, :name!', 'welcome_preheader' => 'Your account is ready. Start buying and selling today.', 'welcome_title' => 'Welcome to Mercasto, :name!', 'welcome_intro' => 'We are happy to have you in the Mercasto community!', 'welcome_description' => 'Your account is ready and you can start using the platform now.', 'welcome_features_title' => 'Here is what you can do on Mercasto:', 'welcome_f1_title' => 'Post listings', 'welcome_f1_desc' => 'Sell what you no longer need in minutes.', 'welcome_f2_title' => 'Find deals', 'welcome_f2_desc' => 'Discover unique items near you.', 'welcome_f3_title' => 'Secure messaging', 'welcome_f3_desc' => 'Negotiate directly with buyers and sellers.', 'welcome_f4_title' => 'AI for sellers', 'welcome_f4_desc' => 'Generate professional descriptions automatically.', 'welcome_button' => 'Explore Mercasto', 'welcome_tip_title' => '💡 Pro tip:', 'welcome_tip_desc' => 'Complete your profile and verify your phone to sell faster.', 'welcome_help' => 'Need help? Contact us at',
            'waitlist_subject' => 'You are on the Mercasto waitlist!', 'waitlist_preheader' => 'Your current position: #:position. Share your code to move up.', 'waitlist_title' => 'You are on the list! 🎉', 'waitlist_intro' => 'Thanks for your interest in Mercasto. You successfully joined our waitlist.', 'waitlist_your_position' => 'Your current position', 'waitlist_position' => 'Your current position: #:position', 'waitlist_next_steps' => 'What happens next?', 'waitlist_step_1' => 'We will review your request', 'waitlist_step_2' => 'You will receive an invitation when it is your turn', 'waitlist_step_3' => 'You will get early access to Mercasto', 'waitlist_referral' => 'Want to move up the list?', 'waitlist_referral_help' => 'Share your referral code and move up.', 'waitlist_share_link' => 'Share my link', 'waitlist_bonus' => '🎁 Bonus:', 'waitlist_bonus_desc' => 'Each friend who signs up moves you up 5 positions.', 'waitlist_check_status' => 'Check my position',
        ],
    ];
}

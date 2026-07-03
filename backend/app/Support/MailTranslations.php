<?php

namespace App\Support;

class MailTranslations
{
    /**
     * Supplemental runtime email translations for frontend languages that do not have native backend/lang files yet.
     * Existing backend/lang files remain authoritative for es/en/pt/ru.
     */
    public static function lines(string $locale): array
    {
        $locale = MailLocale::normalize($locale);
        if (in_array($locale, ['es', 'en', 'pt', 'ru'], true)) {
            return [];
        }
        $copy = array_replace(self::COPY['en'], self::COPY[$locale] ?? []);

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
        'en' => [
            'greeting' => 'Hello :name,', 'button_not_working' => 'If the button does not work, copy and paste this link into your browser:', 'default_preheader' => 'Mercasto — Buy, sell, and discover near you', 'visit_site' => 'Visit website', 'support' => 'Support', 'footer_reason' => 'You received this email because you have a Mercasto account.', 'manage_preferences' => 'Manage preferences', 'made_in_mexico' => 'Made in Mexico',
            'verify_subject' => 'Verify your email on Mercasto', 'verify_preheader' => 'Complete your registration by verifying your email address', 'verify_title' => 'Verify your email address', 'verify_intro' => 'Thanks for signing up for Mercasto!', 'verify_description' => 'To complete your registration and access all platform features, click the button below.', 'verify_button' => 'Verify email', 'verify_ignore' => 'If you did not request this, you can safely ignore this email.',
            'reset_subject' => 'Reset password - Mercasto', 'reset_preheader' => 'Password reset request for your account', 'reset_title' => 'Reset password', 'reset_intro' => 'We received a request to reset your account password.', 'reset_description' => 'We received a request to reset the password for your Mercasto account. Click the button below to choose a new password.', 'reset_button' => 'Reset password', 'reset_expires' => 'This link will expire in :minutes minutes.', 'reset_ignore' => 'If you did not request this change, you can safely ignore or delete this email. Your account will remain protected.',
            'change_subject' => 'Confirm new email - Mercasto', 'change_preheader' => 'Confirm the new email address for your account', 'change_title' => 'Confirm your new email', 'change_description' => 'You requested to change the email address associated with your Mercasto account. To complete this process, verify this address with the button below.', 'change_button' => 'Confirm email', 'change_ignore' => 'If you did not request this change, ignore this message. Your current email will remain primary.',
            'seller_subject' => ':buyer is interested in your listing “:ad”', 'seller_preheader' => ':buyer wrote to you from Mercasto', 'seller_title' => 'You have a new inquiry 📩', 'seller_intro_html' => '<strong>:buyer</strong> wrote to you about your listing <strong>“:ad”</strong>:', 'seller_reply_hint' => 'You can reply directly to this email to contact :buyer.', 'seller_button' => 'View listing', 'seller_privacy' => 'You received this email because a buyer used the Mercasto contact form. Your email address was not shared with the buyer.', 'seller_safety' => 'Never share payment details by email and be careful with advance payments.',
            'welcome_subject' => 'Welcome to Mercasto, :name!', 'welcome_preheader' => 'Your account is ready. Start buying and selling today.', 'welcome_title' => 'Welcome to Mercasto, :name!', 'welcome_intro' => 'We are happy to have you in the Mercasto community!', 'welcome_description' => 'Your account is ready and you can start using the platform now.', 'welcome_features_title' => 'Here is what you can do on Mercasto:', 'welcome_f1_title' => 'Post listings', 'welcome_f1_desc' => 'Sell what you no longer need in minutes.', 'welcome_f2_title' => 'Find deals', 'welcome_f2_desc' => 'Discover unique items near you.', 'welcome_f3_title' => 'Secure messaging', 'welcome_f3_desc' => 'Negotiate directly with buyers and sellers.', 'welcome_f4_title' => 'AI for sellers', 'welcome_f4_desc' => 'Generate professional descriptions automatically.', 'welcome_button' => 'Explore Mercasto', 'welcome_tip_title' => '💡 Pro tip:', 'welcome_tip_desc' => 'Complete your profile and verify your phone to sell faster.', 'welcome_help' => 'Need help? Contact us at',
            'waitlist_subject' => 'You are on the Mercasto waitlist!', 'waitlist_preheader' => 'Your current position: #:position. Share your code to move up.', 'waitlist_title' => 'You are on the list! 🎉', 'waitlist_intro' => 'Thanks for your interest in Mercasto. You successfully joined our waitlist.', 'waitlist_your_position' => 'Your current position', 'waitlist_position' => 'Your current position: #:position', 'waitlist_next_steps' => 'What happens next?', 'waitlist_step_1' => 'We will review your request', 'waitlist_step_2' => 'You will receive an invitation when it is your turn', 'waitlist_step_3' => 'You will get early access to Mercasto', 'waitlist_referral' => 'Want to move up the list?', 'waitlist_referral_help' => 'Share your referral code and move up.', 'waitlist_share_link' => 'Share my link', 'waitlist_bonus' => '🎁 Bonus:', 'waitlist_bonus_desc' => 'Each friend who signs up moves you up 5 positions.', 'waitlist_check_status' => 'Check my position',
        ],
        'fr' => ['greeting' => 'Bonjour :name,', 'button_not_working' => 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :', 'visit_site' => 'Visiter le site', 'support' => 'Support', 'footer_reason' => 'Vous recevez cet e-mail parce que vous avez un compte Mercasto.', 'manage_preferences' => 'Gérer les préférences', 'made_in_mexico' => 'Fait au Mexique', 'verify_subject' => 'Vérifiez votre e-mail sur Mercasto', 'verify_title' => 'Vérifiez votre adresse e-mail', 'verify_intro' => 'Merci de vous être inscrit sur Mercasto !', 'verify_description' => 'Pour terminer votre inscription et accéder à toutes les fonctions, cliquez sur le bouton ci-dessous.', 'verify_button' => 'Vérifier l’e-mail', 'reset_subject' => 'Réinitialiser le mot de passe - Mercasto', 'reset_title' => 'Réinitialiser le mot de passe', 'reset_description' => 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Mercasto. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.', 'reset_button' => 'Réinitialiser le mot de passe', 'change_subject' => 'Confirmer le nouvel e-mail - Mercasto', 'change_title' => 'Confirmez votre nouvel e-mail', 'change_button' => 'Confirmer l’e-mail', 'seller_subject' => ':buyer s’intéresse à votre annonce “:ad”', 'seller_title' => 'Vous avez une nouvelle demande 📩', 'seller_intro_html' => '<strong>:buyer</strong> vous a écrit au sujet de votre annonce <strong>“:ad”</strong> :', 'seller_reply_hint' => 'Vous pouvez répondre directement à cet e-mail pour contacter :buyer.', 'seller_button' => 'Voir l’annonce'],
        'de' => ['greeting' => 'Hallo :name,', 'button_not_working' => 'Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:', 'visit_site' => 'Website besuchen', 'support' => 'Support', 'footer_reason' => 'Sie erhalten diese E-Mail, weil Sie ein Mercasto-Konto haben.', 'manage_preferences' => 'Einstellungen verwalten', 'made_in_mexico' => 'Hergestellt in Mexiko', 'verify_subject' => 'E-Mail bei Mercasto bestätigen', 'verify_title' => 'Bestätigen Sie Ihre E-Mail-Adresse', 'verify_button' => 'E-Mail bestätigen', 'reset_subject' => 'Passwort zurücksetzen - Mercasto', 'reset_title' => 'Passwort zurücksetzen', 'reset_button' => 'Passwort zurücksetzen', 'change_subject' => 'Neue E-Mail bestätigen - Mercasto', 'change_title' => 'Neue E-Mail bestätigen', 'change_button' => 'E-Mail bestätigen', 'seller_subject' => ':buyer interessiert sich für Ihre Anzeige “:ad”', 'seller_title' => 'Sie haben eine neue Anfrage 📩', 'seller_intro_html' => '<strong>:buyer</strong> hat Ihnen zu Ihrer Anzeige <strong>“:ad”</strong> geschrieben:', 'seller_reply_hint' => 'Sie können direkt auf diese E-Mail antworten, um :buyer zu kontaktieren.', 'seller_button' => 'Anzeige ansehen'],
        'it' => ['greeting' => 'Ciao :name,', 'button_not_working' => 'Se il pulsante non funziona, copia e incolla questo link nel browser:', 'visit_site' => 'Visita il sito', 'support' => 'Supporto', 'footer_reason' => 'Hai ricevuto questa email perché hai un account Mercasto.', 'manage_preferences' => 'Gestisci preferenze', 'made_in_mexico' => 'Fatto in Messico', 'verify_subject' => 'Verifica la tua email su Mercasto', 'verify_title' => 'Verifica il tuo indirizzo email', 'verify_button' => 'Verifica email', 'reset_subject' => 'Reimposta password - Mercasto', 'reset_title' => 'Reimposta password', 'reset_button' => 'Reimposta password', 'change_subject' => 'Conferma nuova email - Mercasto', 'change_title' => 'Conferma la tua nuova email', 'change_button' => 'Conferma email', 'seller_subject' => ':buyer è interessato al tuo annuncio “:ad”', 'seller_title' => 'Hai una nuova richiesta 📩', 'seller_intro_html' => '<strong>:buyer</strong> ti ha scritto riguardo al tuo annuncio <strong>“:ad”</strong>:', 'seller_reply_hint' => 'Puoi rispondere direttamente a questa email per contattare :buyer.', 'seller_button' => 'Vedi annuncio'],
        'zh' => ['greeting' => ':name，您好，', 'button_not_working' => '如果按钮无法使用，请复制此链接并粘贴到浏览器中：', 'visit_site' => '访问网站', 'support' => '支持', 'footer_reason' => '您收到此邮件，是因为您拥有 Mercasto 账户。', 'manage_preferences' => '管理偏好设置', 'made_in_mexico' => '墨西哥制造', 'verify_subject' => '在 Mercasto 验证您的邮箱', 'verify_title' => '验证您的邮箱地址', 'verify_button' => '验证邮箱', 'reset_subject' => '重置密码 - Mercasto', 'reset_title' => '重置密码', 'reset_button' => '重置密码', 'change_subject' => '确认新邮箱 - Mercasto', 'change_title' => '确认您的新邮箱', 'change_button' => '确认邮箱', 'seller_subject' => ':buyer 对您的广告“:ad”感兴趣', 'seller_title' => '您收到了一条新咨询 📩', 'seller_intro_html' => '<strong>:buyer</strong> 就您的广告 <strong>“:ad”</strong> 给您留言：', 'seller_reply_hint' => '您可以直接回复此邮件联系 :buyer。', 'seller_button' => '查看广告'],
        'ko' => ['greeting' => ':name님, 안녕하세요,', 'button_not_working' => '버튼이 작동하지 않으면 이 링크를 복사해 브라우저에 붙여 넣으세요:', 'visit_site' => '웹사이트 방문', 'support' => '지원', 'footer_reason' => 'Mercasto 계정이 있어 이 이메일을 받았습니다.', 'manage_preferences' => '환경설정 관리', 'made_in_mexico' => '멕시코에서 제작', 'verify_subject' => 'Mercasto 이메일 인증', 'verify_title' => '이메일 주소를 인증하세요', 'verify_button' => '이메일 인증', 'reset_subject' => '비밀번호 재설정 - Mercasto', 'reset_title' => '비밀번호 재설정', 'reset_button' => '비밀번호 재설정', 'change_subject' => '새 이메일 확인 - Mercasto', 'change_title' => '새 이메일을 확인하세요', 'change_button' => '이메일 확인', 'seller_subject' => ':buyer님이 회원님의 광고 “:ad”에 관심을 보였습니다', 'seller_title' => '새 문의가 도착했습니다 📩', 'seller_intro_html' => '<strong>:buyer</strong>님이 회원님의 광고 <strong>“:ad”</strong>에 대해 문의했습니다:', 'seller_reply_hint' => '이 이메일에 직접 답장해 :buyer님에게 연락할 수 있습니다.', 'seller_button' => '광고 보기'],
        'ar' => ['greeting' => 'مرحباً :name،', 'button_not_working' => 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:', 'visit_site' => 'زيارة الموقع', 'support' => 'الدعم', 'footer_reason' => 'وصلتك هذه الرسالة لأن لديك حساباً في Mercasto.', 'manage_preferences' => 'إدارة التفضيلات', 'made_in_mexico' => 'صُنع في المكسيك', 'verify_subject' => 'تحقق من بريدك في Mercasto', 'verify_title' => 'تحقق من عنوان بريدك الإلكتروني', 'verify_button' => 'تحقق من البريد', 'reset_subject' => 'إعادة تعيين كلمة المرور - Mercasto', 'reset_title' => 'إعادة تعيين كلمة المرور', 'reset_button' => 'إعادة تعيين كلمة المرور', 'change_subject' => 'تأكيد البريد الجديد - Mercasto', 'change_title' => 'أكد بريدك الجديد', 'change_button' => 'تأكيد البريد', 'seller_subject' => ':buyer مهتم بإعلانك “:ad”', 'seller_title' => 'لديك استفسار جديد 📩', 'seller_intro_html' => 'كتب لك <strong>:buyer</strong> بخصوص إعلانك <strong>“:ad”</strong>:', 'seller_reply_hint' => 'يمكنك الرد مباشرة على هذه الرسالة للتواصل مع :buyer.', 'seller_button' => 'عرض الإعلان'],
        'he' => ['greeting' => 'שלום :name,', 'button_not_working' => 'אם הכפתור לא עובד, העתיקו והדביקו את הקישור הזה בדפדפן:', 'visit_site' => 'בקר באתר', 'support' => 'תמיכה', 'footer_reason' => 'קיבלת הודעה זו כי יש לך חשבון Mercasto.', 'manage_preferences' => 'ניהול העדפות', 'made_in_mexico' => 'נוצר במקסיקו', 'verify_subject' => 'אימות האימייל שלך ב-Mercasto', 'verify_title' => 'אמת את כתובת האימייל שלך', 'verify_button' => 'אמת אימייל', 'reset_subject' => 'איפוס סיסמה - Mercasto', 'reset_title' => 'איפוס סיסמה', 'reset_button' => 'אפס סיסמה', 'change_subject' => 'אישור אימייל חדש - Mercasto', 'change_title' => 'אשר את האימייל החדש שלך', 'change_button' => 'אשר אימייל', 'seller_subject' => ':buyer מתעניין במודעה שלך “:ad”', 'seller_title' => 'יש לך פנייה חדשה 📩', 'seller_intro_html' => '<strong>:buyer</strong> כתב לך לגבי המודעה <strong>“:ad”</strong>:', 'seller_reply_hint' => 'אפשר להשיב ישירות לאימייל הזה כדי ליצור קשר עם :buyer.', 'seller_button' => 'צפה במודעה'],
        'yi' => ['greeting' => 'שלום :name,', 'button_not_working' => 'אויב דער קנעפּל אַרבעט נישט, קאָפּירט דעם לינק אין בלעטערער:', 'visit_site' => 'באַזוכן וועבזײַט', 'support' => 'שטיצע', 'footer_reason' => 'איר האָט באַקומען דעם אימעיל ווײַל איר האָט אַ Mercasto חשבון.', 'manage_preferences' => 'פֿאַרוואַלטן פּרעפֿערענצן', 'made_in_mexico' => 'געמאכט אין מעקסיקע', 'verify_subject' => 'באַשטעטיקט אייער אימעיל אויף Mercasto', 'verify_title' => 'באַשטעטיקט אייער אימעיל אַדרעס', 'verify_button' => 'באַשטעטיקן אימעיל', 'reset_subject' => 'צוריקשטעלן פּאַראָל - Mercasto', 'reset_title' => 'צוריקשטעלן פּאַראָל', 'reset_button' => 'צוריקשטעלן פּאַראָל', 'change_subject' => 'באַשטעטיקן נײַעם אימעיל - Mercasto', 'change_title' => 'באַשטעטיקט אייער נײַעם אימעיל', 'change_button' => 'באַשטעטיקן אימעיל', 'seller_subject' => ':buyer אינטערעסירט זיך אין אייער אַנאָנס “:ad”', 'seller_title' => 'איר האָט אַ נײַע אָנפֿרעג 📩', 'seller_intro_html' => '<strong>:buyer</strong> האָט געשריבן וועגן אייער אַנאָנס <strong>“:ad”</strong>:', 'seller_reply_hint' => 'איר קענט ענטפֿערן גלייך אויף דעם אימעיל צו קאָנטאַקטן :buyer.', 'seller_button' => 'זען אַנאָנס'],
        'ja' => ['greeting' => ':name様、こんにちは。', 'button_not_working' => 'ボタンが動作しない場合は、このリンクをコピーしてブラウザに貼り付けてください:', 'visit_site' => 'サイトを見る', 'support' => 'サポート', 'footer_reason' => 'Mercastoアカウントをお持ちのため、このメールをお送りしています。', 'manage_preferences' => '設定を管理', 'made_in_mexico' => 'メキシコ製', 'verify_subject' => 'Mercastoでメールを確認してください', 'verify_title' => 'メールアドレスを確認してください', 'verify_button' => 'メールを確認', 'reset_subject' => 'パスワード再設定 - Mercasto', 'reset_title' => 'パスワード再設定', 'reset_button' => 'パスワードを再設定', 'change_subject' => '新しいメールを確認 - Mercasto', 'change_title' => '新しいメールを確認してください', 'change_button' => 'メールを確認', 'seller_subject' => ':buyer があなたの広告「:ad」に興味を持っています', 'seller_title' => '新しい問い合わせがあります 📩', 'seller_intro_html' => '<strong>:buyer</strong> があなたの広告 <strong>「:ad」</strong> について連絡しました:', 'seller_reply_hint' => 'このメールに直接返信して :buyer に連絡できます。', 'seller_button' => '広告を見る'],
    ];
}

<?php

namespace App\Support;

class MailTranslations
{
    /**
     * Runtime email translations for every frontend language supported by Mercasto.
     * Existing files in backend/lang remain valid; these lines add/override transactional email keys.
     */
    public static function lines(string $locale): array
    {
        $locale = MailLocale::normalize($locale);
        return self::OVERRIDES[$locale] ?? [];
    }

    private const OVERRIDES = [
        'fr' => [
            'emails.common.greeting' => 'Bonjour :name,',
            'emails.common.button_not_working' => 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
            'emails.layout.default_preheader' => 'Mercasto — Achetez, vendez et découvrez près de chez vous',
            'emails.layout.visit_site' => 'Visiter le site',
            'emails.layout.support' => 'Support',
            'emails.layout.footer_reason' => 'Vous recevez cet e-mail parce que vous avez un compte Mercasto.',
            'emails.layout.manage_preferences' => 'Gérer les préférences',
            'emails.layout.made_in_mexico' => 'Fait au Mexique',
            'emails.email_verify.subject' => 'Vérifiez votre e-mail sur Mercasto',
            'emails.email_verify.preheader' => 'Terminez votre inscription en vérifiant votre e-mail',
            'emails.email_verify.title' => 'Vérifiez votre adresse e-mail',
            'emails.email_verify.intro' => 'Merci de vous être inscrit sur Mercasto !',
            'emails.email_verify.description' => 'Pour terminer votre inscription et accéder à toutes les fonctions, cliquez sur le bouton ci-dessous.',
            'emails.email_verify.button' => 'Vérifier l’e-mail',
            'emails.email_verify.ignore' => 'Si vous n’avez pas demandé cela, vous pouvez ignorer cet e-mail.',
            'emails.password_reset.subject' => 'Réinitialiser le mot de passe - Mercasto',
            'emails.password_reset.preheader' => 'Demande de réinitialisation du mot de passe',
            'emails.password_reset.title' => 'Réinitialiser le mot de passe',
            'emails.password_reset.intro' => 'Nous avons reçu une demande de réinitialisation de votre mot de passe.',
            'emails.password_reset.description' => 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Mercasto. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
            'emails.password_reset.button' => 'Réinitialiser le mot de passe',
            'emails.password_reset.expires' => 'Ce lien expirera dans :minutes minutes.',
            'emails.password_reset.ignore' => 'Si vous n’avez pas demandé ce changement, vous pouvez ignorer ou supprimer cet e-mail. Votre compte restera protégé.',
            'emails.email_change.subject' => 'Confirmer le nouvel e-mail - Mercasto',
            'emails.email_change.preheader' => 'Confirmez la nouvelle adresse e-mail de votre compte',
            'emails.email_change.title' => 'Confirmez votre nouvel e-mail',
            'emails.email_change.description' => 'Vous avez demandé à changer l’e-mail associé à votre compte Mercasto. Pour terminer, vérifiez cette adresse avec le bouton ci-dessous.',
            'emails.email_change.button' => 'Confirmer l’e-mail',
            'emails.email_change.ignore' => 'Si vous n’avez pas demandé ce changement, ignorez ce message. Votre e-mail actuel restera principal.',
            'emails.seller_contact.subject' => ':buyer s’intéresse à votre annonce “:ad”',
            'emails.seller_contact.preheader' => ':buyer vous a écrit depuis Mercasto',
            'emails.seller_contact.title' => 'Vous avez une nouvelle demande 📩',
            'emails.seller_contact.intro_html' => '<strong>:buyer</strong> vous a écrit au sujet de votre annonce <strong>“:ad”</strong> :',
            'emails.seller_contact.reply_hint' => 'Vous pouvez répondre directement à cet e-mail pour contacter :buyer.',
            'emails.seller_contact.button' => 'Voir l’annonce',
            'emails.seller_contact.privacy' => 'Vous recevez cet e-mail parce qu’un acheteur a utilisé le formulaire de contact Mercasto. Votre adresse e-mail n’a pas été partagée avec l’acheteur.',
            'emails.seller_contact.safety' => 'Ne partagez jamais de données de paiement par e-mail et méfiez-vous des paiements anticipés.',
            'emails.welcome.subject' => 'Bienvenue sur Mercasto, :name !',
            'emails.welcome.preheader' => 'Votre compte est prêt. Commencez à acheter et vendre dès aujourd’hui.',
            'emails.welcome.title' => 'Bienvenue sur Mercasto, :name !',
            'emails.welcome.intro' => 'Nous sommes heureux de vous accueillir dans la communauté Mercasto !',
            'emails.welcome.description' => 'Votre compte est prêt et vous pouvez utiliser la plateforme maintenant.',
            'emails.welcome.features_title' => 'Voici ce que vous pouvez faire sur Mercasto :',
            'emails.welcome.feature_1_title' => 'Publier des annonces',
            'emails.welcome.feature_1_desc' => 'Vendez ce dont vous n’avez plus besoin en quelques minutes.',
            'emails.welcome.feature_2_title' => 'Trouver des offres',
            'emails.welcome.feature_2_desc' => 'Découvrez des articles uniques près de chez vous.',
            'emails.welcome.feature_3_title' => 'Messagerie sécurisée',
            'emails.welcome.feature_3_desc' => 'Négociez directement avec les acheteurs et vendeurs.',
            'emails.welcome.feature_4_title' => 'IA pour vendeurs',
            'emails.welcome.feature_4_desc' => 'Générez automatiquement des descriptions professionnelles.',
            'emails.welcome.button' => 'Explorer Mercasto',
            'emails.welcome.tip_title' => '💡 Astuce :',
            'emails.welcome.tip_desc' => 'Complétez votre profil et vérifiez votre téléphone pour vendre plus vite.',
            'emails.welcome.help' => 'Besoin d’aide ? Contactez-nous à',
            'emails.waitlist.subject' => 'Vous êtes sur la liste d’attente Mercasto !',
            'emails.waitlist.preheader' => 'Votre position actuelle : #:position. Partagez votre code pour monter.',
            'emails.waitlist.title' => 'Vous êtes sur la liste ! 🎉',
            'emails.waitlist.intro' => 'Merci pour votre intérêt pour Mercasto. Vous avez bien rejoint notre liste d’attente.',
            'emails.waitlist.your_position' => 'Votre position actuelle',
            'emails.waitlist.next_steps' => 'Que se passe-t-il ensuite ?',
            'emails.waitlist.step_1' => 'Nous examinerons votre demande',
            'emails.waitlist.step_2' => 'Vous recevrez une invitation quand ce sera votre tour',
            'emails.waitlist.step_3' => 'Vous obtiendrez un accès anticipé à Mercasto',
            'emails.waitlist.referral' => 'Vous voulez monter dans la liste ?',
            'emails.waitlist.referral_help' => 'Partagez votre code de parrainage pour gagner des places.',
            'emails.waitlist.share_link' => 'Partager mon lien',
            'emails.waitlist.bonus' => '🎁 Bonus :',
            'emails.waitlist.bonus_desc' => 'Chaque ami inscrit vous fait monter de 5 places.',
            'emails.waitlist.check_status' => 'Voir ma position',
        ],
    ];
}

<?php

namespace App\Traits;

trait LocaleHelper
{
    /**
     * Determine user locale for emails
     * Priority: user preference > browser language > default
     */
    protected function getUserLocale($user = null): string
    {
        // 1. Check if user has explicit locale preference
        if ($user && isset($user->locale)) {
            return $user->locale;
        }

        // 2. Check session/request locale
        if (request()->hasHeader('Accept-Language')) {
            $browserLang = substr(request()->header('Accept-Language'), 0, 2);
            $supported = ['en', 'es', 'pt'];
            if (in_array($browserLang, $supported)) {
                return $browserLang;
            }
        }

        // 3. Check app locale
        $appLocale = app()->getLocale();
        if (in_array($appLocale, ['en', 'es', 'pt'])) {
            return $appLocale;
        }

        // 4. Default to Spanish (primary market)
        return 'es';
    }

    /**
     * Set locale for email sending
     */
    protected function setEmailLocale($user = null): void
    {
        $locale = $this->getUserLocale($user);
        app()->setLocale($locale);
    }
}

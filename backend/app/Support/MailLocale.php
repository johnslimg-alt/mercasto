<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class MailLocale
{
    public const SUPPORTED = [
        'es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja',
    ];

    public const FALLBACK = 'es';

    public static function normalize(?string $locale): string
    {
        $locale = strtolower(trim((string) $locale));
        if ($locale === '') {
            return self::FALLBACK;
        }

        $locale = str_replace('_', '-', $locale);
        $primary = explode('-', $locale)[0] ?? $locale;
        if (in_array($primary, ['he', 'yi'], true)) {
            return self::FALLBACK;
        }

        return in_array($primary, self::SUPPORTED, true)
            ? $primary
            : self::FALLBACK;
    }

    public static function resolve(?Request $request = null, mixed $user = null): string
    {
        $requestLocale = $request?->input('lang')
            ?: $request?->input('locale')
            ?: $request?->header('X-Mercasto-Lang')
            ?: $request?->header('X-Locale');

        if ($requestLocale) {
            return self::normalize($requestLocale);
        }

        $preferences = $user?->notification_preferences ?? [];
        if (is_string($preferences)) {
            $preferences = json_decode($preferences, true) ?: [];
        }
        if (is_array($preferences) && ! empty($preferences['locale'])) {
            return self::normalize((string) $preferences['locale']);
        }

        foreach (['locale', 'language', 'preferred_locale', 'preferred_language'] as $field) {
            if ($user && isset($user->{$field}) && $user->{$field}) {
                return self::normalize($user->{$field});
            }
        }

        $acceptLanguage = $request?->header('Accept-Language');
        if ($acceptLanguage) {
            foreach (explode(',', $acceptLanguage) as $part) {
                $candidate = trim(explode(';', $part)[0] ?? '');
                $normalized = self::normalize($candidate);
                if (in_array($normalized, self::SUPPORTED, true)) {
                    return $normalized;
                }
            }
        }

        return self::normalize(App::getLocale());
    }

    public static function rtl(string $locale): bool
    {
        return self::normalize($locale) === 'ar';
    }
}

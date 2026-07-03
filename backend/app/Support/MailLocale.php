<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class MailLocale
{
    public const SUPPORTED = [
        'es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja',
    ];

    public static function normalize(?string $locale): string
    {
        $locale = strtolower(trim((string) $locale));
        if ($locale === '') {
            return config('app.fallback_locale', 'es');
        }

        $locale = str_replace('_', '-', $locale);
        $primary = explode('-', $locale)[0] ?? $locale;

        return in_array($primary, self::SUPPORTED, true)
            ? $primary
            : config('app.fallback_locale', 'es');
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
        return in_array(self::normalize($locale), ['ar', 'he', 'yi'], true);
    }
}

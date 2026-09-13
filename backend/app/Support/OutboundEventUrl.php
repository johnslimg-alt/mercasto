<?php

namespace App\Support;

/**
 * Sanitises the page URL that Mercasto forwards to advertising vendors.
 *
 * Why this exists: on this site the page query string carries the visitor's own
 * input — the free-text `search` term, `subcategory` and the `filters[...]`
 * selections built by App.jsx::buildHomeFilterPath. The ad-detail view is a hash
 * overlay over the listing page, so those parameters are still in the address bar
 * when a contact event fires. Forwarding the raw URL to Meta or TikTok therefore
 * transfers a visitor's search terms (health, religious, financial, ...) to a
 * third party, which is exactly the kind of personal data the aviso does not
 * disclose and the visitor never agreed to transfer.
 *
 * The rule: keep the page's own origin and path, drop the query string and the
 * fragment. App\Services\OpenAiAdsCapiService applied the "origin + path" half of
 * this already; Meta and TikTok are brought to the same rule here, in one audited
 * place.
 *
 * Note on `app.frontend_url`: that value resolves through the cached config array,
 * so it is only the public origin when the cache was built while the deployment's
 * environment was visible to the process. A cache built without it silently falls
 * back to the framework's non-public default, and comparing against that would
 * rewrite real page URLs to a non-public host. Keeping the candidate's own origin
 * avoids depending on that layered mechanism at all; configuration is consulted
 * only when there is no usable URL.
 *
 * Legitimate behaviour that must NOT be lost, and is not: the vendor still learns
 * the page the conversion happened on (origin + path), and TikTok click
 * attribution still works because `ttclid` is read from the raw referer before the
 * URL is sanitised — it is a click identifier the vendor is entitled to, not this
 * visitor's search input.
 */
final class OutboundEventUrl
{
    /**
     * Origin + path only, or null when the input cannot be used as a URL.
     *
     * @param  string|null  $url  Raw browser-supplied URL (page location or referer).
     */
    public static function sanitize(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        $candidate = trim($url);
        if ($candidate === '' || ! filter_var($candidate, FILTER_VALIDATE_URL)) {
            return null;
        }

        $parts = parse_url($candidate);
        $origin = self::originFromParts($parts);
        if ($origin === null) {
            return null;
        }

        $path = isset($parts['path']) && is_string($parts['path']) ? $parts['path'] : '/';
        if ($path === '' || $path[0] !== '/') {
            $path = '/';
        }

        return $origin.($path === '/' ? '' : $path);
    }

    /**
     * Origin + path, falling back to the configured frontend origin when there is no
     * usable URL at all. Never returns null, for fields the vendors expect to be
     * populated.
     */
    public static function sanitizeOrOrigin(?string $url): string
    {
        return self::sanitize($url) ?? self::configuredOrigin();
    }

    private static function configuredOrigin(): string
    {
        $configured = rtrim((string) config('app.frontend_url', 'https://mercasto.com'), '/');

        return self::originFromParts(parse_url($configured)) ?? 'https://mercasto.com';
    }

    private static function originFromParts(array|false $parts): ?string
    {
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return null;
        }

        $port = isset($parts['port']) ? ':'.(int) $parts['port'] : '';

        return $scheme.'://'.$host.$port;
    }
}

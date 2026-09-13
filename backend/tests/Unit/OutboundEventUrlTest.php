<?php

namespace Tests\Unit;

use App\Support\OutboundEventUrl;
use Tests\TestCase;

/**
 * Contract for the URL that may be forwarded to advertising vendors.
 *
 * The page query string on this site carries the visitor's own search term and
 * filter selections, so it must never be part of an outbound vendor payload. Only
 * origin + path leave the server; the fragment goes with the query.
 */
class OutboundEventUrlTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.frontend_url' => 'https://mercasto.com']);
    }

    public function test_it_strips_the_query_string_and_fragment_and_keeps_origin_and_path(): void
    {
        $this->assertSame(
            'https://mercasto.com/listings',
            OutboundEventUrl::sanitize('https://mercasto.com/listings?search=tamazcal+espiritual&filters%5Benfoque_retiro%5D=Espiritual#ad-42'),
        );

        $this->assertSame(
            'https://mercasto.com/ads/123',
            OutboundEventUrl::sanitize('https://mercasto.com/ads/123?utm_source=newsletter#contact'),
        );
    }

    public function test_it_returns_the_bare_origin_for_a_root_url(): void
    {
        $this->assertSame('https://mercasto.com', OutboundEventUrl::sanitize('https://mercasto.com/?payment=success'));
        $this->assertSame('https://mercasto.com', OutboundEventUrl::sanitize('https://mercasto.com'));
    }

    public function test_it_keeps_the_real_origin_of_another_site_but_drops_its_query(): void
    {
        // A referer from a search engine carries the visitor's query too.
        $this->assertSame('https://www.google.com/search', OutboundEventUrl::sanitize('https://www.google.com/search?q=tamazcal'));
    }

    public function test_it_returns_null_for_values_it_cannot_use(): void
    {
        $this->assertNull(OutboundEventUrl::sanitize('not a url'));
        $this->assertNull(OutboundEventUrl::sanitize('javascript:alert(1)'));
        $this->assertNull(OutboundEventUrl::sanitize(''));
        $this->assertNull(OutboundEventUrl::sanitize(null));
    }

    public function test_sanitize_or_origin_falls_back_to_the_configured_origin(): void
    {
        $this->assertSame('https://mercasto.com', OutboundEventUrl::sanitizeOrOrigin(null));
        $this->assertSame('https://mercasto.com', OutboundEventUrl::sanitizeOrOrigin(''));
        $this->assertSame('https://mercasto.com', OutboundEventUrl::sanitizeOrOrigin('not a url'));
        $this->assertSame('https://mercasto.com/listings', OutboundEventUrl::sanitizeOrOrigin('https://mercasto.com/listings?search=x'));
    }

    public function test_it_preserves_a_non_default_port(): void
    {
        $this->assertSame(
            'http://localhost:8080/listings',
            OutboundEventUrl::sanitize('http://localhost:8080/listings?search=tamazcal'),
        );
    }

    public function test_a_valid_page_url_is_not_rewritten_to_a_misconfigured_frontend_origin(): void
    {
        // Laravel's base config defaults app.frontend_url to http://localhost:3000
        // and this repository never sets FRONTEND_URL, so a "canonical origin"
        // rewrite would replace real page URLs with localhost in production.
        config(['app.frontend_url' => 'http://localhost:3000']);

        $this->assertSame(
            'https://mercasto.com/listings',
            OutboundEventUrl::sanitize('https://mercasto.com/listings?search=tamazcal'),
        );
    }
}

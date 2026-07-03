<?php

namespace Tests\Feature;

use Tests\TestCase;

class SitemapTest extends TestCase
{
    public function test_main_sitemap_includes_public_legal_pages(): void
    {
        $response = $this->get('/sitemap-main.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml');
        $response->assertSee('<loc>http://localhost/terminos</loc>', false);
        $response->assertSee('<loc>http://localhost/reembolsos</loc>', false);
        $response->assertSee('<loc>http://localhost/moderacion</loc>', false);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\OgPreviewComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The crawler-facing og:image wired into the SERVED HTML.
 *
 * RC-3 "wrong observation surface": PR #1151 shipped a working compositor at
 * /share/ads/{id}/og.jpg with tests that called OgPreviewComposer::urlFor()
 * directly. Those tests passed while production kept advertising the raw stored
 * photo, because nothing asserted on the bytes a crawler actually receives.
 * Every test here therefore performs a real GET against the two public routes
 * and parses the HTML response - it never calls the service.
 *
 * RC-4 "a test that cannot fail": these assertions are proven to fail against
 * the unwired code; see the negative control in the PR body.
 */
class ServedShareImageWiringTest extends TestCase
{
    use RefreshDatabase;

    private const FRAME_WIDTH = 1200;

    private const FRAME_HEIGHT = 630;

    private const PHOTO = 'ads/catalog/photos/served-wiring.jpg';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'https://mercasto.test',
            'app.frontend_shell_url' => 'http://frontend.test/index.html',
        ]);

        Http::fake([
            'http://frontend.test/index.html' => Http::response($this->frontendShell(), 200),
        ]);

        Storage::fake('public');
        Storage::fake('local');

        // A real 1200x1800 portrait - the exact size live listings use, and the
        // shape Facebook/WhatsApp crop down to a middle band.
        Storage::disk('public')->put(self::PHOTO, $this->portraitBytes());
    }

    // ------------------------------------------------- /share/ads/{id} surface

    public function test_share_card_served_html_advertises_the_composited_preview(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertOk();
        $this->assertCompositedOgImage($response->getContent(), $ad);
    }

    public function test_share_card_declares_the_composited_preview_as_1200x630(): void
    {
        $ad = $this->activeAd();

        $served = $this->get("https://mercasto.test/share/ads/{$ad->id}")->getContent();

        // The raw portrait must not have its own (1200x1800) size advertised
        // next to the composited URL.
        $this->assertStringNotContainsString('og:image:height" content="1800"', $served);
        $this->assertSame(
            [self::FRAME_WIDTH, self::FRAME_HEIGHT],
            $this->declaredImageSize($served),
            'the served share card must declare the composited frame size, not omit it or guess',
        );
    }

    public function test_the_advertised_preview_actually_decodes_to_a_1200x630_jpeg(): void
    {
        $ad = $this->activeAd();
        $served = $this->get("https://mercasto.test/share/ads/{$ad->id}")->getContent();

        // Follow the advertised URL exactly as a crawler would.
        $image = $this->get(html_entity_decode($this->metaContent($served, 'og:image')));

        $image->assertOk();
        $image->assertHeader('Content-Type', 'image/jpeg');

        $bytes = (string) $image->getContent();
        $this->assertSame('ffd8ff', bin2hex(substr($bytes, 0, 3)), 'must be a JPEG');

        $dimensions = getimagesizefromstring($bytes);
        $this->assertIsArray($dimensions);
        $this->assertSame(
            [self::FRAME_WIDTH, self::FRAME_HEIGHT],
            [(int) $dimensions[0], (int) $dimensions[1]],
            'the advertised og:image must decode to the advertised size',
        );
    }

    // ------------------------------------------------------- /ads/{id} surface

    public function test_listing_shell_served_html_advertises_the_composited_preview(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/ads/{$ad->id}");

        $response->assertOk();
        // Positive control that this really is the server-decorated listing shell
        // and not the bare SPA document.
        $response->assertSee('data-mercasto-seo-owner="listing"', false);

        $this->assertCompositedOgImage($response->getContent(), $ad);
    }

    public function test_listing_shell_declares_the_composited_preview_as_1200x630(): void
    {
        $ad = $this->activeAd();

        $served = $this->get("https://mercasto.test/ads/{$ad->id}")->getContent();

        $this->assertStringNotContainsString('og:image:height" content="1800"', $served);
        $this->assertSame(
            [self::FRAME_WIDTH, self::FRAME_HEIGHT],
            $this->declaredImageSize($served),
            'the served listing shell must declare the composited frame size',
        );
    }

    // ------------------------------- fallback: a photo we must not composite

    public function test_a_third_party_hosted_photo_keeps_todays_served_behaviour(): void
    {
        $url = 'https://cdn.example.com/photos/1234.jpg';
        $ad = $this->activeAd($url);

        $share = $this->get("https://mercasto.test/share/ads/{$ad->id}")->getContent();
        $shell = $this->get("https://mercasto.test/ads/{$ad->id}")->getContent();

        foreach (['share card' => $share, 'listing shell' => $shell] as $surface => $served) {
            // Byte-identical to the unwired emitters: the exact tag the old code
            // produced, with no dimension tags added next to it.
            $this->assertStringContainsString(
                '<meta property="og:image" content="' . $url . '"',
                $served,
                "{$surface} must keep the foreign photo as og:image, byte for byte",
            );
            $this->assertSame($url, $this->metaContent($served, 'og:image'), "{$surface} og:image");
            $this->assertStringNotContainsString('/og.jpg', $served, "{$surface} must not advertise a composited URL");
            $this->assertStringNotContainsString(
                'og:image:width',
                $served,
                "{$surface} must not declare dimensions it has not measured",
            );
            $this->assertNull($this->declaredImageSize($served), "{$surface} must declare no size");
        }
    }

    public function test_a_listing_without_a_photo_advertises_the_branded_preview(): void
    {
        $ad = $this->activeAd(null);

        // No photo is composable: OgPreviewComposer::canCompose() returns true (the
        // branded card is the intended result) and urlFor() hands out `?v=brand`.
        // Both surfaces therefore move to it. That is also an upgrade for the shell,
        // which used to advertise /icon-512x512.png - below every platform's
        // large-preview minimum, so it rendered as a small or centre-cropped card.
        foreach (
            [
                'share card' => $this->get("https://mercasto.test/share/ads/{$ad->id}")->getContent(),
                'listing shell' => $this->get("https://mercasto.test/ads/{$ad->id}")->getContent(),
            ] as $surface => $served
        ) {
            $this->assertCompositedOgImage($served, $ad);
            $this->assertSame(
                'brand',
                $this->queryParam($this->metaContent($served, 'og:image'), 'v'),
                "{$surface} must advertise the deterministic branded card",
            );
            $this->assertSame(
                [self::FRAME_WIDTH, self::FRAME_HEIGHT],
                $this->declaredImageSize($served),
                "{$surface} must declare the branded card's real size",
            );
        }

        // And that declared size is the size of the bytes actually served, not just
        // the configured frame: fetch one of them the way a crawler would.
        $image = $this->get("https://mercasto.test/share/ads/{$ad->id}/og.jpg?v=brand");
        $image->assertOk();

        $decoded = getimagesizefromstring((string) $image->getContent());
        $this->assertIsArray($decoded);
        $this->assertSame(
            [self::FRAME_WIDTH, self::FRAME_HEIGHT],
            [(int) $decoded[0], (int) $decoded[1]],
            'the branded preview must really decode to the size both surfaces declare',
        );
    }

    // ------------------------------------------------------------- assertions

    private function assertCompositedOgImage(string $served, Ad $ad): void
    {
        $image = $this->metaContent($served, 'og:image');
        $expectedPath = "/share/ads/{$ad->id}/og.jpg";

        $this->assertStringContainsString(
            $expectedPath,
            (string) parse_url($image, PHP_URL_PATH),
            "the served og:image must be the composited preview ({$expectedPath})",
        );
        $this->assertSame(
            app(OgPreviewComposer::class)->versionToken($ad),
            $this->queryParam($image, 'v'),
            'the advertised URL must carry the photo version token that defeats edge caches',
        );
        $this->assertStringNotContainsString(
            self::PHOTO,
            $served,
            'the raw stored photo must no longer be advertised to crawlers',
        );
    }

    // ---------------------------------------------------------------- helpers

    /**
     * @return array{0:int,1:int}|null
     */
    private function declaredImageSize(string $html): ?array
    {
        $width = $this->metaContent($html, 'og:image:width');
        $height = $this->metaContent($html, 'og:image:height');

        if ($width === null || $height === null) {
            return null;
        }

        return [(int) $width, (int) $height];
    }

    /**
     * Reads a meta tag's content out of SERVED HTML (either attribute order, self
     * closing or not). Deliberately an HTML read, not a service call: RC-3.
     */
    private function metaContent(string $html, string $key): ?string
    {
        $quoted = preg_quote($key, '#');

        // Either attribute order, self closing or not.
        $pattern = '#<meta\s+(?:property="' . $quoted . '"\s+content="([^"]*)"|content="([^"]*)"\s+property="' . $quoted . '")#i';

        if (preg_match($pattern, $html, $matches) !== 1) {
            return null;
        }

        $content = $matches[1] !== '' ? $matches[1] : ($matches[2] ?? '');

        // The alternation stops before the closing quote so the branch used does
        // not matter.
        return rtrim($content, '"');
    }

    private function queryParam(string $url, string $name): ?string
    {
        $query = (string) parse_url($url, PHP_URL_QUERY);
        parse_str($query, $params);

        return isset($params[$name]) && is_string($params[$name]) ? $params[$name] : null;
    }

    private function activeAd(?string $imageUrl = self::PHOTO): Ad
    {
        // is_catalog_filler keeps this fixture on the non-indexable branch that
        // production actually takes for listing 6376 (og:type=website), so the
        // shell under test is the one a crawler really gets.
        return Ad::create([
            'user_id' => User::factory()->create()->id,
            'title' => 'Fundas para Asientos de Piel Sintética - Modelo G',
            'description' => 'Cubreasientos para asientos de auto, material piel sintética, color negro con vivos rojos.',
            'price' => 1450,
            'location' => 'Ciudad de México',
            'category' => 'motor',
            'condition' => 'nuevo',
            'image_url' => $imageUrl,
            'status' => 'active',
            'expires_at' => now()->addDays(30),
            'is_catalog_filler' => true,
        ]);
    }

    /** 1200x1800 portrait, the shape that loses 65% of its height to a platform crop. */
    private function portraitBytes(): string
    {
        $image = imagecreatetruecolor(1200, 1800);
        imagefilledrectangle($image, 0, 0, 1199, 1799, imagecolorallocate($image, 240, 240, 240));
        imagefilledrectangle($image, 0, 0, 360, 1799, imagecolorallocate($image, 220, 20, 20));
        imagefilledrectangle($image, 840, 0, 1199, 1799, imagecolorallocate($image, 20, 20, 220));

        ob_start();
        imagejpeg($image, null, 90);
        $bytes = (string) ob_get_clean();
        imagedestroy($image);

        return $bytes;
    }

    private function frontendShell(): string
    {
        return <<<'HTML'
<!doctype html><html lang="es"><head>
<title>Mercasto home</title>
<meta name="description" content="home description" />
<link rel="canonical" href="https://mercasto.test/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Mercasto home" />
<meta property="og:description" content="home description" />
<meta property="og:url" content="https://mercasto.test/" />
<meta property="og:image" content="https://mercasto.test/home.png" />
<meta name="twitter:title" content="Mercasto home" />
<meta name="twitter:description" content="home description" />
<meta name="twitter:image" content="https://mercasto.test/home.png" />
<script type="application/ld+json" id="schema-ld-json">{"@type":"WebSite"}</script>
</head><body><div id="root"></div><script type="module" src="/assets/app-current.js"></script></body></html>
HTML;
    }
}

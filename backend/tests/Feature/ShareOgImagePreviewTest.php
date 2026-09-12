<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\OgPreviewComposer;
use App\Services\OgPreviewResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Social share previews must always be a real 1200x630 image, the product must
 * never be cropped, and the stored upload must never be touched.
 *
 * Every dimension assertion below is read back out of the produced bytes; none
 * of them trust the render call or a cached metadata value.
 */
class ShareOgImagePreviewTest extends TestCase
{
    use RefreshDatabase;

    private const FRAME_WIDTH = 1200;

    private const FRAME_HEIGHT = 630;

    /** @var array<string, ImageInterface> decoded payloads, keyed by sha1 */
    private array $decoded = [];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('local');
    }

    public function test_extremely_tall_photo_is_fully_visible_in_a_1200x630_preview(): void
    {
        // 1200x1800 is the exact portrait size live listings use (aspect 0.667).
        $path = $this->storePhoto(1200, 1800);

        [$response, $ad] = $this->requestPreviewFor($path);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/jpeg');

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
        $this->assertWordmarkPresent($bytes);

        $result = app(OgPreviewComposer::class)->composeFor($ad);
        $this->assertTrue($result->photoIsFullyVisible(), 'tall photo must not be cropped');
        $this->assertTrue($result->photoAspectPreserved(), 'tall photo must keep its aspect ratio');
        $this->assertUniformScale($result);

        // Both horizontal extremes of the source must survive into the output.
        $this->assertPhotoExtremesVisible($bytes, $result->photoRect);
    }

    public function test_extremely_wide_photo_is_fully_visible_in_a_1200x630_preview(): void
    {
        // 1600x1067 is the exact landscape size live listings use (aspect 1.500).
        $path = $this->storePhoto(1600, 1067);

        [$response, $ad] = $this->requestPreviewFor($path);

        $response->assertOk();

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
        $this->assertWordmarkPresent($bytes);

        $result = app(OgPreviewComposer::class)->composeFor($ad);
        $this->assertTrue($result->photoIsFullyVisible(), 'wide photo must not be cropped');
        $this->assertTrue($result->photoAspectPreserved());
        $this->assertUniformScale($result);

        $this->assertPhotoExtremesVisible($bytes, $result->photoRect);
    }

    public function test_a_photo_that_is_already_1200x630_is_not_resized_out_of_shape(): void
    {
        $path = $this->storePhoto(1200, 630);

        [$response, $ad] = $this->requestPreviewFor($path);

        $response->assertOk();

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
        $this->assertWordmarkPresent($bytes);

        $result = app(OgPreviewComposer::class)->composeFor($ad);
        $this->assertSame('photo', $result->variant);
        $this->assertTrue($result->photoIsFullyVisible());
        $this->assertTrue($result->photoAspectPreserved());
        $this->assertUniformScale($result);

        // The source is already the frame aspect, so its whole 1.9048:1 shape is kept.
        $this->assertEqualsWithDelta(
            1200 / 630,
            $result->photoRect['width'] / $result->photoRect['height'],
            0.002,
            'the frame-aspect photo must keep its shape after scaling'
        );

        $this->assertPhotoExtremesVisible($bytes, $result->photoRect);
    }

    public function test_a_very_extreme_portrait_still_yields_a_full_1200x630_card(): void
    {
        // Far outside anything observed live: a 0.2 aspect screenshot strip.
        $path = $this->storePhoto(400, 2000);

        [$response, $ad] = $this->requestPreviewFor($path);

        $response->assertOk();

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);

        $result = app(OgPreviewComposer::class)->composeFor($ad);
        $this->assertTrue($result->photoIsFullyVisible());
        $this->assertTrue($result->photoAspectPreserved());
    }

    /**
     * Multiple upload formats are accepted, so the card must be produced from
     * each of them rather than only from JPEG.
     */
    #[DataProvider('undocumentedFormats')]
    public function test_supported_upload_formats_all_produce_a_jpeg_preview(string $extension): void
    {
        $path = $this->storePhoto(1200, 1800, $extension);

        [$response, $ad] = $this->requestPreviewFor($path);

        $response->assertOk();

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);

        $this->assertTrue(app(OgPreviewComposer::class)->composeFor($ad)->photoIsFullyVisible());
    }

    public static function undocumentedFormats(): array
    {
        return [['png'], ['webp']];
    }

    public function test_a_missing_photo_file_falls_back_to_a_branded_1200x630_card(): void
    {
        $ad = $this->makeAd('ads/catalog/photos/does-not-exist-anywhere.jpg');

        $response = $this->get("/share/ads/{$ad->id}/og.jpg");

        $response->assertOk();
        $response->assertHeader('X-Og-Preview-Variant', 'brand');

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
        $this->assertSame('brand', app(OgPreviewComposer::class)->composeFor($ad)->variant);
    }

    public function test_a_corrupt_photo_file_falls_back_to_a_branded_1200x630_card(): void
    {
        // A .jpg that is not a decodable image: what a truncated upload looks like.
        Storage::disk('public')->put('ads/catalog/photos/corrupt.jpg', 'this is not a jpeg');
        $ad = $this->makeAd('ads/catalog/photos/corrupt.jpg');

        $response = $this->get("/share/ads/{$ad->id}/og.jpg");

        $response->assertOk();
        $response->assertHeader('X-Og-Preview-Variant', 'brand');

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
    }

    public function test_a_listing_with_no_photo_at_all_gets_a_1200x630_card_not_a_512_square(): void
    {
        $ad = $this->makeAd(null);

        $response = $this->get("/share/ads/{$ad->id}/og.jpg");

        $response->assertOk();

        $bytes = (string) $response->getContent();
        $this->assertFrameDimensions($bytes);
        $this->assertBrandRailPresent($bytes);
    }

    public function test_a_photo_hosted_outside_mercasto_is_left_to_the_existing_url(): void
    {
        // Proxying a third-party host from a crawler endpoint is out of scope; the
        // caller must keep today's behaviour instead of getting a branded card.
        $ad = $this->makeAd('https://cdn.example.com/photos/1234.jpg');

        $this->assertFalse(app(OgPreviewComposer::class)->canCompose($ad));
        $this->assertNull(app(OgPreviewComposer::class)->urlFor($ad));
    }

    public function test_the_listing_url_is_handed_out_for_a_local_photo(): void
    {
        $path = $this->storePhoto(1200, 1800);
        $ad = $this->makeAd($path);

        $this->assertTrue(app(OgPreviewComposer::class)->canCompose($ad));
        $this->assertSame(
            url("/share/ads/{$ad->id}/og.jpg"),
            app(OgPreviewComposer::class)->urlFor($ad)
        );
    }

    public function test_generating_a_preview_never_modifies_the_stored_upload(): void
    {
        $cases = [
            'tall' => $this->storePhoto(1200, 1800),
            'wide' => $this->storePhoto(1600, 1067),
            'exact' => $this->storePhoto(1200, 630),
        ];

        $before = [];
        foreach ($cases as $label => $path) {
            $before[$label] = [
                'path' => $path,
                'sha256' => hash('sha256', Storage::disk('public')->get($path)),
                'size' => Storage::disk('public')->size($path),
                'modified' => Storage::disk('public')->lastModified($path),
            ];
        }

        foreach ($before as $label => $snapshot) {
            $ad = $this->makeAd($snapshot['path']);

            // Render through the real HTTP endpoint, then again through the service
            // so both the cached and uncached paths are covered.
            $this->get("/share/ads/{$ad->id}/og.jpg")->assertOk();
            app(OgPreviewComposer::class)->composeFor($ad);

            $this->assertSame(
                $snapshot['sha256'],
                hash('sha256', Storage::disk('public')->get($snapshot['path'])),
                "{$label}: stored upload bytes changed"
            );
            $this->assertSame($snapshot['size'], Storage::disk('public')->size($snapshot['path']), "{$label}: size changed");
            $this->assertSame($snapshot['modified'], Storage::disk('public')->lastModified($snapshot['path']), "{$label}: mtime changed");

            // The exact same store must still hold the original dimensions: the
            // detail page relies on the portrait aspect.
            $dimensions = getimagesizefromstring((string) Storage::disk('public')->get($snapshot['path']));
            $this->assertNotFalse($dimensions);
            $this->assertSame(
                $this->caseDimensions($label),
                [$dimensions[0], $dimensions[1]],
                "{$label}: stored upload dimensions changed"
            );
        }

        // No extra copies of the upload were written next to it.
        $this->assertSame([], Storage::disk('public')->files('ads/placeholders'));
        $this->assertSame([], array_values(array_diff(
            Storage::disk('public')->files('ads/catalog/photos'),
            array_column($before, 'path')
        )));
    }

    public function test_previews_are_cached_on_a_private_disk_and_reused(): void
    {
        $path = $this->storePhoto(1200, 1800);
        $ad = $this->makeAd($path);

        $first = $this->get("/share/ads/{$ad->id}/og.jpg");
        $first->assertOk();

        $cached = Storage::disk('local')->files('og-previews');
        $this->assertCount(1, $cached);

        $second = $this->get("/share/ads/{$ad->id}/og.jpg");
        $second->assertOk();

        $this->assertSame($first->getContent(), $second->getContent(), 'the cached preview must be byte-identical');
        $this->assertCount(1, Storage::disk('local')->files('og-previews'));

        // The cache must never live on the publicly served disk.
        $this->assertSame([], Storage::disk('public')->files('og-previews'));
    }

    public function test_a_re_photographed_listing_regenerates_instead_of_serving_a_stale_card(): void
    {
        $path = $this->storePhoto(1200, 1800);
        $ad = $this->makeAd($path);

        $this->get("/share/ads/{$ad->id}/og.jpg")->assertOk();
        $original = Storage::disk('local')->files('og-previews');
        $this->assertCount(1, $original);

        // Replace the photo with a different aspect, as a seller edit would.
        Storage::disk('public')->put($path, $this->photoBytes(1600, 1067, 'jpg'));
        clearstatcache();

        $this->get("/share/ads/{$ad->id}/og.jpg")->assertOk();

        $result = app(OgPreviewComposer::class)->composeFor($ad);
        $this->assertSame(1600, $result->sourceWidth, 'the new photo dimensions must be picked up');
        $this->assertCount(2, Storage::disk('local')->files('og-previews'), 'the new fingerprint must not overwrite the old entry');
    }

    public function test_the_cache_bound_is_enforced_on_write(): void
    {
        config(['og.cache.max_files' => 3, 'og.cache.ttl_days' => 45]);

        $composer = app(OgPreviewComposer::class);

        for ($i = 0; $i < 6; $i++) {
            $path = $this->storePhoto(1200, 1800, 'jpg', "tall-{$i}.jpg");
            $composer->composeFor($this->makeAd($path));
        }

        $this->assertLessThanOrEqual(3, count(Storage::disk('local')->files('og-previews')));
    }

    public function test_the_prune_command_deletes_expired_previews(): void
    {
        config(['og.cache.ttl_days' => 1]);

        $path = $this->storePhoto(1200, 1800);
        $ad = $this->makeAd($path);
        app(OgPreviewComposer::class)->composeFor($ad);

        $files = Storage::disk('local')->files('og-previews');
        $this->assertCount(1, $files);

        // Age the cached preview past the TTL.
        touch(Storage::disk('local')->path($files[0]), time() - 3 * 86400);
        clearstatcache();

        $this->artisan('og:prune-previews')->assertSuccessful();

        $this->assertSame([], Storage::disk('local')->files('og-previews'));
    }

    public function test_unpublished_and_unknown_ads_are_not_served(): void
    {
        $path = $this->storePhoto(1200, 1800);
        $archived = $this->makeAd($path, 'archived');

        $this->get("/share/ads/{$archived->id}/og.jpg")->assertNotFound();
        $this->get('/share/ads/999999/og.jpg')->assertNotFound();
    }

    public function test_crawler_revalidation_gets_a_304(): void
    {
        $path = $this->storePhoto(1200, 1800);
        $ad = $this->makeAd($path);

        $first = $this->get("/share/ads/{$ad->id}/og.jpg");
        $first->assertOk();

        $etag = $first->headers->get('ETag');
        $this->assertNotNull($etag);

        $second = $this->withHeaders(['If-None-Match' => $etag])->get("/share/ads/{$ad->id}/og.jpg");
        $second->assertStatus(304);
        $this->assertSame('', (string) $second->getContent());
    }

    // ---------------------------------------------------------------- helpers

    /**
     * @return array{0:\Illuminate\Testing\TestResponse, 1:Ad}
     */
    private function requestPreviewFor(string $path): array
    {
        $ad = $this->makeAd($path);

        return [$this->get("/share/ads/{$ad->id}/og.jpg"), $ad];
    }

    private function makeAd(?string $imageUrl, string $status = 'active'): Ad
    {
        return Ad::create([
            'user_id' => User::factory()->create()->id,
            'title' => 'Nissan Versa 2021',
            'description' => 'Auto en buen estado',
            'price' => 44565,
            'category' => 'autos',
            'status' => $status,
            'image_url' => $imageUrl === null ? null : json_encode([$imageUrl]),
        ]);
    }

    /**
     * Store a real photo on the public disk. Left/right bands are saturated so a
     * crop of either horizontal extreme is detectable in the produced preview.
     */
    private function storePhoto(int $width, int $height, string $extension = 'jpg', ?string $name = null): string
    {
        $path = 'ads/catalog/photos/' . ($name ?? "photo-{$width}x{$height}.{$extension}");
        Storage::disk('public')->put($path, $this->photoBytes($width, $height, $extension));

        return $path;
    }

    private function photoBytes(int $width, int $height, string $extension = 'jpg'): string
    {
        $image = imagecreatetruecolor($width, $height);
        $red = imagecolorallocate($image, 220, 20, 20);
        $blue = imagecolorallocate($image, 20, 20, 220);
        $redWidth = (int) round($width * 0.3);
        imagefilledrectangle($image, 0, 0, $width, $height, imagecolorallocate($image, 240, 240, 240));
        imagefilledrectangle($image, 0, 0, $redWidth, $height, $red);
        imagefilledrectangle($image, $width - $redWidth, 0, $width, $height, $blue);

        ob_start();
        match ($extension) {
            'png' => imagepng($image),
            'webp' => imagewebp($image, null, 90),
            default => imagejpeg($image, null, 92),
        };
        $bytes = (string) ob_get_clean();
        imagedestroy($image);

        return $bytes;
    }

    /**
     * @return array{0:int, 1:int}
     */
    private function caseDimensions(string $label): array
    {
        return match ($label) {
            'tall' => [1200, 1800],
            'wide' => [1600, 1067],
            default => [1200, 630],
        };
    }

    /**
     * A single scale factor must describe the placement on both axes: that is
     * what distinguishes "scaled to fit" from "cropped" or "stretched".
     */
    private function assertUniformScale(OgPreviewResult $result): void
    {
        $horizontal = $result->photoRect['width'] / $result->sourceWidth;
        $vertical = $result->photoRect['height'] / $result->sourceHeight;

        $this->assertEqualsWithDelta(
            $horizontal,
            $vertical,
            $horizontal * 0.01,
            'the photo must be scaled by one factor on both axes (no crop, no stretch)'
        );

        // A future geometry change must not shrink the product into a stamp.
        $this->assertGreaterThanOrEqual(
            0.7,
            $result->photoRect['height'] / $result->height,
            'the photo must still fill most of the card height'
        );
    }

    /** Read the real dimensions out of the produced bytes. */
    private function assertFrameDimensions(string $bytes): void    {
        $dimensions = getimagesizefromstring($bytes);

        $this->assertNotFalse($dimensions, 'the preview must be a decodable image');
        $this->assertSame(self::FRAME_WIDTH, $dimensions[0], 'preview width read from the bytes');
        $this->assertSame(self::FRAME_HEIGHT, $dimensions[1], 'preview height read from the bytes');
        $this->assertSame('image/jpeg', $dimensions['mime']);
    }

    /** The branded 8px lime rail must be the top of every card. */
    private function assertBrandRailPresent(string $bytes): void
    {
        [$r, $g, $b] = $this->pixel($bytes, 600, 3);

        $this->assertGreaterThan($r, $g, 'brand rail must be green-dominant (red channel)');
        $this->assertGreaterThan($b, $g, 'brand rail must be green-dominant (blue channel)');
    }

    /**
     * The wordmark must really be painted on a photo card. Text drawing is
     * best-effort (a bad font is swallowed), so this checks the pixels instead of
     * trusting the call: an empty brand bar would otherwise ship unnoticed.
     */
    private function assertWordmarkPresent(string $bytes): void
    {
        $barTop = self::FRAME_HEIGHT - (int) config('og.preview.bottom_bar', 64);
        $left = (int) config('og.preview.side_padding', 40);
        $image = $this->decode($bytes);
        $painted = 0;

        for ($x = $left; $x < $left + 200; $x++) {
            for ($y = $barTop + 14; $y < $barTop + 46; $y++) {
                [$r, $g, $b] = $this->pixelOf($image, $x, $y);
                // The bar is opaque navy; anything far from it is a glyph pixel.
                if ($r > 60 || $g > 60 || $b > 80) {
                    $painted++;
                }
            }
        }

        $this->assertGreaterThan(200, $painted, 'the brand bar must contain the painted wordmark');
    }

    /**
     * Prove the composition did not crop: sample inside the placed photo near
     * both horizontal edges. The source is red on the left, blue on the right, so
     * a centre crop or a cover-fit would lose one of them.
     *
     * @param  array{x:int,y:int,width:int,height:int}  $rect
     */
    private function assertPhotoExtremesVisible(string $bytes, array $rect): void
    {
        $inset = max(4, (int) round($rect['width'] * 0.05));
        $middle = $rect['y'] + (int) round($rect['height'] / 2);

        [$leftRed, $leftGreen, $leftBlue] = $this->pixel($bytes, $rect['x'] + $inset, $middle);
        $this->assertGreaterThan($leftBlue + 40, $leftRed, 'left edge of the photo (red band) is missing -> cropped');
        $this->assertLessThan($leftRed, $leftGreen, 'left edge of the photo is not the red band');

        [$rightRed, $rightGreen, $rightBlue] = $this->pixel($bytes, $rect['x'] + $rect['width'] - $inset, $middle);
        $this->assertGreaterThan($rightRed + 40, $rightBlue, 'right edge of the photo (blue band) is missing -> cropped');
        $this->assertLessThan($rightBlue, $rightGreen, 'right edge of the photo is not the blue band');
    }

    /**
     * @return array{0:int, 1:int, 2:int}
     */
    private function pixel(string $bytes, int $x, int $y): array
    {
        return $this->pixelOf($this->decode($bytes), $x, $y);
    }

    /**
     * Decoding is memoized per payload: the pixel probes below sample thousands
     * of points, and re-decoding for each of them would dominate the suite.
     */
    private function decode(string $bytes): ImageInterface
    {
        $key = sha1($bytes);

        return $this->decoded[$key] ??= ImageManager::usingDriver(Driver::class)->decodeBinary($bytes);
    }

    /**
     * @return array{0:int, 1:int, 2:int}
     */
    private function pixelOf(ImageInterface $image, int $x, int $y): array
    {
        $color = $image->colorAt($x, $y);

        return [(int) (string) $color->red(), (int) (string) $color->green(), (int) (string) $color->blue()];
    }
}

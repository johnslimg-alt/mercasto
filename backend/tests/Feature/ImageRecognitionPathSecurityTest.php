<?php

namespace Tests\Feature;

use App\Services\AI\ImageRecognitionService;
use App\Services\AI\OllamaClient;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ImageRecognitionPathSecurityTest extends TestCase
{
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    public function test_allowed_public_image_is_analyzed_without_path_escape(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('ads/listing.png', base64_decode(self::PNG, true));

        $result = $this->service()->analyze('ads/listing.png');

        $this->assertTrue($result['success']);
        $this->assertSame('listing.png', $result['metadata']['filename']);
        $this->assertGreaterThan(0, $result['metadata']['size']);
    }

    #[DataProvider('unsafePaths')]
    public function test_unsafe_or_non_owned_paths_are_rejected(string $path): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('ads/listing.png', base64_decode(self::PNG, true));

        $this->expectException(InvalidArgumentException::class);
        $this->service()->analyze($path);
    }

    public static function unsafePaths(): array
    {
        return [
            'traversal' => ['ads/../.env'],
            'absolute' => ['/etc/passwd'],
            'url' => ['file:///etc/passwd'],
            'backslash traversal' => ['ads\\..\\.env'],
            'unowned prefix' => ['kyc_documents/passport.png'],
            'unsupported extension' => ['ads/listing.php'],
            'missing object' => ['ads/missing.png'],
        ];
    }

    private function service(): ImageRecognitionService
    {
        return new ImageRecognitionService(new OllamaClient());
    }
}

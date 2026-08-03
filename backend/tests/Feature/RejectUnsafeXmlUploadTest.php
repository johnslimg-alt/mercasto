<?php

namespace Tests\Feature;

use App\Http\Middleware\RejectUnsafeXmlUpload;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class RejectUnsafeXmlUploadTest extends TestCase
{
    public function test_it_rejects_doctype_and_entity_declarations_for_bulk_uploads(): void
    {
        $xml = <<<'XML'
<?xml version="1.0"?>
<!DOCTYPE ads [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<ads><ad><title>&xxe;</title></ad></ads>
XML;

        $response = $this->runMiddleware('/api/ads/bulk-upload', $xml);

        $this->assertSame(Response::HTTP_UNPROCESSABLE_ENTITY, $response->getStatusCode());
        $this->assertStringContainsString('declaraciones no permitidas', (string) $response->getContent());
    }

    public function test_it_detects_declarations_split_across_stream_chunks(): void
    {
        $xml = str_repeat(' ', 8188).'<!DOCTYPE ads><ads />';

        $response = $this->runMiddleware('/api/ads/bulk-upload', $xml);

        $this->assertSame(Response::HTTP_UNPROCESSABLE_ENTITY, $response->getStatusCode());
    }

    public function test_it_allows_regular_bulk_xml(): void
    {
        $xml = '<?xml version="1.0"?><ads><ad><title>Producto seguro</title></ad></ads>';

        $response = $this->runMiddleware('/api/ads/bulk-upload', $xml);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('next', $response->getContent());
    }

    public function test_it_does_not_apply_to_other_api_routes(): void
    {
        $xml = '<!DOCTYPE ads><ads />';

        $response = $this->runMiddleware('/api/other-upload', $xml);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    private function runMiddleware(string $path, string $xml): Response
    {
        $request = Request::create(
            $path,
            'POST',
            [],
            [],
            ['file' => UploadedFile::fake()->createWithContent('ads.xml', $xml)],
        );

        return (new RejectUnsafeXmlUpload())->handle(
            $request,
            static fn (): Response => new Response('next', Response::HTTP_OK),
        );
    }
}

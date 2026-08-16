<?php

namespace Tests\Feature;

use App\Services\PublicImageModerationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PublicImageModerationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
    }

    public function test_high_confidence_approved_image_is_allowed(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response($this->aiResponse('approved', 0.97, 'Retrato apropiado.')),
        ]);

        app(PublicImageModerationService::class)->assertApproved(
            UploadedFile::fake()->image('avatar.jpg', 640, 640),
            'avatar público de usuario',
            'avatar',
        );

        Http::assertSent(function ($request): bool {
            $images = data_get($request->data(), 'messages.1.images', []);

            return $request->url() === 'http://ollama.test/api/chat'
                && count($images) === 1
                && $request['model'] === 'qwen3-vl:4b-instruct';
        });

        $this->addToAssertionCount(1);
    }

    public function test_low_confidence_or_manual_image_is_blocked(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response($this->aiResponse('approved', 0.72, 'No hay suficiente certeza.')),
        ]);

        try {
            app(PublicImageModerationService::class)->assertApproved(
                UploadedFile::fake()->image('logo.png', 500, 500),
                'logotipo público de negocio',
                'logo',
            );
            $this->fail('Low confidence public image must be blocked.');
        } catch (ValidationException $error) {
            $this->assertArrayHasKey('logo', $error->errors());
        }
    }

    public function test_rejected_image_is_blocked(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response($this->aiResponse('rejected', 0.99, 'Documento sensible.')),
        ]);

        $this->expectException(ValidationException::class);
        app(PublicImageModerationService::class)->assertApproved(
            UploadedFile::fake()->image('banner.jpg', 1200, 400),
            'portada pública de negocio',
            'banner',
        );
    }

    public function test_ai_unavailability_fails_closed_with_503(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response(['message' => 'unavailable'], 503),
        ]);

        try {
            app(PublicImageModerationService::class)->assertApproved(
                UploadedFile::fake()->image('avatar.webp', 400, 400),
                'avatar público de usuario',
                'avatar',
            );
            $this->fail('Unavailable local AI must fail closed.');
        } catch (HttpException $error) {
            $this->assertSame(503, $error->getStatusCode());
            $this->assertStringContainsString('imagen anterior se mantiene', $error->getMessage());
        }
    }

    private function aiResponse(string $decision, float $confidence, string $reason): array
    {
        return [
            'model' => 'qwen3-vl:4b-instruct',
            'message' => [
                'role' => 'assistant',
                'content' => json_encode([
                    'decision' => $decision,
                    'reason' => $reason,
                    'confidence' => $confidence,
                    'flags' => [],
                ]),
            ],
        ];
    }
}

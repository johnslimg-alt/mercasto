<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicImageUploadHappyPathTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);

        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => [
                    'role' => 'assistant',
                    'content' => json_encode([
                        'decision' => 'approved',
                        'reason' => 'Imagen pública apropiada.',
                        'confidence' => 0.98,
                        'flags' => [],
                    ]),
                ],
            ]),
        ]);
    }

    public function test_ai_approved_profile_and_business_images_are_processed_and_stored(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => 'business']);
        $this->actingAs($user, 'sanctum');

        $avatar = $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 640, 640),
        ])->assertOk();
        Storage::disk('public')->assertExists($avatar->json('avatar_url'));

        $logo = $this->post('/api/user/business-profile/logo', [
            'logo' => UploadedFile::fake()->image('logo.png', 800, 500),
        ])->assertOk();
        Storage::disk('public')->assertExists($logo->json('business_logo_url'));

        $banner = $this->post('/api/user/business-profile/banner', [
            'banner' => UploadedFile::fake()->image('banner.jpg', 1600, 600),
        ])->assertOk();
        Storage::disk('public')->assertExists($banner->json('business_banner_url'));

        Http::assertSentCount(3);
    }
}

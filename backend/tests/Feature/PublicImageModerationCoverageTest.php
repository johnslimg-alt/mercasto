<?php

namespace Tests\Feature;

use Tests\TestCase;

class PublicImageModerationCoverageTest extends TestCase
{
    public function test_public_image_upload_routes_are_covered_by_fail_closed_ai_middleware(): void
    {
        $middleware = file_get_contents(app_path('Http/Middleware/ModeratePublicImageUploads.php'));
        $bootstrap = file_get_contents(base_path('bootstrap/app.php'));
        $profile = file_get_contents(app_path('Http/Controllers/Api/ProfileController.php'));
        $business = file_get_contents(app_path('Http/Controllers/Api/BusinessProfileController.php'));
        $banners = file_get_contents(app_path('Http/Controllers/Api/AdBannerController.php'));

        $this->assertStringContainsString('ModeratePublicImageUploads::class', $bootstrap);

        foreach ([
            "'api/user/avatar' => [",
            "'api/user/profile' => [",
            "'api/user/business-profile/logo' => [",
            "'api/user/business-profile/banner' => [",
            "'api/admin/banners/upload' => [",
        ] as $marker) {
            $this->assertStringContainsString($marker, $middleware, $marker);
        }

        $this->assertStringContainsString("Auth::guard('sanctum')->user()", $middleware);
        $this->assertStringContainsString('Validator::make', $middleware);
        $this->assertStringContainsString("['admin']", $middleware);
        $this->assertStringContainsString("\$user->role !== 'admin'", $middleware);
        $this->assertStringContainsString('RateLimiter::tooManyAttempts', $middleware);
        $this->assertStringContainsString('RateLimiter::hit', $middleware);
        $this->assertStringContainsString('ImageManager::usingDriver(Driver::class)', $profile);
        $this->assertStringContainsString('ImageManager::usingDriver(Driver::class)', $business);
        $this->assertStringNotContainsString('ImageManager::withDriver(Driver::class)', $profile);
        $this->assertStringNotContainsString('ImageManager::withDriver(Driver::class)', $business);
        $this->assertStringContainsString('function uploadAvatar', $profile);
        $this->assertStringContainsString("'avatar' => 'nullable|file|mimes:jpg,jpeg,png,webp", $profile);
        $this->assertStringContainsString('function uploadLogo', $business);
        $this->assertStringContainsString('function uploadBanner', $business);
        $this->assertStringContainsString('function uploadImage', $banners);
    }

    public function test_specialized_document_and_listing_moderation_remain_separate(): void
    {
        $profile = file_get_contents(app_path('Http/Controllers/Api/ProfileController.php'));
        $business = file_get_contents(app_path('Http/Controllers/Api/BusinessProfileController.php'));
        $adJob = file_get_contents(app_path('Jobs/ModerateAdWithAI.php'));

        $this->assertStringContainsString('PreScreenKycDocumentWithAI::dispatch', $profile);
        $this->assertStringContainsString('crossCheckCsfWithAi', $business);
        $this->assertStringContainsString('AiModerationGatewayClient $aiGateway', $adJob);
        $this->assertStringContainsString('$aiGateway->moderateListing', $adJob);
        $this->assertStringContainsString('policySignals: $canonicalPolicySignals', $adJob);
        $this->assertStringNotContainsString('$ai->chatPro', $adJob);
        $this->assertStringContainsString('array_merge($images, $videoFrames)', $adJob);
        $this->assertStringContainsString('moderationVideoFrames', $adJob);
    }
}

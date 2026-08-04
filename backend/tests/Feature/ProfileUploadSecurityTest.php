<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_image_routes_reject_unsafe_or_oversized_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => 'business']);
        $this->actingAs($user, 'sanctum');

        $script = UploadedFile::fake()->createWithContent('avatar.php', '<?php echo "unsafe";');
        $this->post('/api/user/avatar', ['avatar' => $script])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);

        $oversizedLogo = UploadedFile::fake()->image('logo.jpg', 1200, 900)->size(5121);
        $this->post('/api/user/business-profile/logo', ['logo' => $oversizedLogo])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['logo']);

        $oversizedBanner = UploadedFile::fake()->image('banner.jpg', 1600, 600)->size(10241);
        $this->post('/api/user/business-profile/banner', ['banner' => $oversizedBanner])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['banner']);
    }

    public function test_identity_routes_reject_non_document_payloads(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['role' => 'business']);
        $this->actingAs($user, 'sanctum');

        $script = UploadedFile::fake()->createWithContent('identity.php', '<?php echo "unsafe";');
        $this->post('/api/user/kyc', ['document' => $script])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['document']);

        $image = UploadedFile::fake()->image('not-a-csf.jpg');
        $this->post('/api/user/business-profile/csf', ['csf' => $image])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['csf']);
    }

    public function test_profile_upload_budget_is_shared_across_profile_image_routes(): void
    {
        $user = User::factory()->create(['role' => 'business']);
        $this->actingAs($user, 'sanctum');

        $routes = [
            ['/api/user/avatar', 'avatar'],
            ['/api/user/business-profile/logo', 'logo'],
            ['/api/user/business-profile/banner', 'banner'],
        ];

        for ($attempt = 0; $attempt < 10; $attempt++) {
            [$route] = $routes[$attempt % count($routes)];
            $this->postJson($route, [])->assertUnprocessable();
        }

        $this->postJson('/api/user/avatar', [])->assertTooManyRequests();
    }

    public function test_identity_upload_budget_is_shared_between_kyc_and_csf(): void
    {
        $user = User::factory()->create(['role' => 'business']);
        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/user/kyc', [])->assertUnprocessable();
        $this->postJson('/api/user/business-profile/csf', [])->assertUnprocessable();
        $this->postJson('/api/user/kyc', [])->assertUnprocessable();

        $this->postJson('/api/user/business-profile/csf', [])->assertTooManyRequests();
    }
}

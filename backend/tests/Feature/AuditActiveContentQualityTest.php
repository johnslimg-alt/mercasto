<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class AuditActiveContentQualityTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_separates_genuine_and_catalog_contact_gaps_and_prints_missing_geo_groups(): void
    {
        $catalogUser = User::factory()->create();
        $genuineUser = User::factory()->create();
        $contactedUser = User::factory()->create();
        $contactedUser->forceFill(['whatsapp' => '+5215555550101'])->saveQuietly();

        $this->makeAd($catalogUser, true, 'Zona Centro', null, null);
        $this->makeAd($genuineUser, false, 'Guadalajara, Jalisco', 'Guadalajara', 'Jalisco');
        $this->makeAd($contactedUser, false, 'Monterrey, Nuevo León', 'Monterrey', 'Nuevo León');

        $this->assertSame(0, Artisan::call('ads:audit-active-content-quality', ['--limit-groups' => 12]));
        $output = Artisan::output();

        $this->assertStringContainsString('no_external_contact', $output);
        $this->assertStringContainsString('genuine_no_external_contact', $output);
        $this->assertStringContainsString('catalog_refs_no_external_contact', $output);
        $this->assertMatchesRegularExpression('/genuine_no_external_contact\s*\|\s*1/', $output);
        $this->assertMatchesRegularExpression('/catalog_refs_no_external_contact\s*\|\s*1/', $output);
        $this->assertStringContainsString('missing_geo_location_groups=1', $output);
        $this->assertStringContainsString('missing geo location=Zona Centro count=1', $output);
    }

    private function makeAd(User $user, bool $filler, string $location, ?string $city, ?string $state): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Referencia editorial de auditoría' : 'Publicación real de auditoría',
            'description' => 'Descripción completa de auditoría para comprobar métricas de calidad sin generar falsos positivos en producción.',
            'price' => 2100,
            'location' => $location,
            'city' => $city,
            'state' => $state,
            'category' => 'ocio',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode(['audit-quality.jpg']),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => 'approved',
        ]);
    }
}

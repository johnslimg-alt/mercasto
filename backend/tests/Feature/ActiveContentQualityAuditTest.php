<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ActiveContentQualityAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_reports_duplicates_without_mutating_ads(): void
    {
        $user = User::factory()->create([
            'whatsapp' => null,
            'business_whatsapp' => null,
            'telegram_username' => null,
        ]);

        $beforeIds = [];
        foreach ([1, 2] as $index) {
            $ad = Ad::query()->create([
                'user_id' => $user->id,
                'title' => 'Bicicleta urbana editorial',
                'description' => 'Bicicleta urbana en buen estado, con frenos revisados y lista para recorridos diarios dentro de la ciudad.',
                'price' => 2500,
                'location' => 'Veracruz, Veracruz',
                'state' => 'Veracruz',
                'city' => 'Veracruz',
                'latitude' => 19.1738,
                'longitude' => -96.1342,
                'category' => 'ocio',
                'condition' => 'usado',
                'attributes' => ['subcategory' => 'Ciclismo'],
                'image_url' => json_encode(["https://images.unsplash.com/photo-demo?w=600&sig={$index}"]),
                'status' => 'active',
                'ai_moderation_status' => 'approved',
                'is_catalog_filler' => false,
                'generated_cover' => false,
            ]);
            $beforeIds[] = $ad->id;
        }

        $exit = Artisan::call('ads:audit-active-content-quality', ['--limit-groups' => 5]);
        $output = Artisan::output();

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('duplicate_primary_image_groups=1', $output);
        $this->assertStringContainsString('duplicate_content_groups=1', $output);
        $this->assertStringContainsString('unsplash_primary_image', $output);
        $this->assertStringContainsString('no_external_contact', $output);
        $this->assertStringContainsString('read-only mode', $output);
        $this->assertSame($beforeIds, Ad::query()->orderBy('id')->pluck('id')->all());
        $this->assertSame(2, Ad::query()->where('status', 'active')->count());
    }

    public function test_legacy_global_image_rewrite_is_disabled(): void
    {
        $exit = Artisan::call('mercasto:fix-images');

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('disabled', Artisan::output());
    }
}

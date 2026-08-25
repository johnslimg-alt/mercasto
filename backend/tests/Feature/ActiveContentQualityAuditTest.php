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

    public function test_audit_reports_canonical_and_known_placeholder_copy_without_exposing_text_or_mutating(): void
    {
        $user = User::factory()->create([
            'whatsapp' => '521234567890',
            'business_whatsapp' => null,
            'telegram_username' => null,
        ]);

        $common = [
            'user_id' => $user->id,
            'description' => 'Descripción suficientemente detallada para representar un anuncio completo durante la auditoría de calidad.',
            'price' => 1250,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'electronica',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'active',
            'ai_moderation_status' => 'approved',
            'generated_cover' => false,
        ];

        $numeric = Ad::query()->create(array_merge($common, [
            'title' => '1111',
            'image_url' => json_encode(['/storage/ads/audit-numeric.svg']),
            'is_catalog_filler' => true,
        ]));
        $legacy = Ad::query()->create(array_merge($common, [
            'title' => 'wrefrg',
            'image_url' => json_encode(['/storage/ads/audit-legacy.svg']),
            'is_catalog_filler' => false,
        ]));
        $legitimate = Ad::query()->create(array_merge($common, [
            'title' => 'BMW X5',
            'image_url' => json_encode(['/storage/ads/audit-legitimate.svg']),
            'is_catalog_filler' => false,
        ]));

        $before = Ad::query()->orderBy('id')->get(['id', 'title', 'description', 'status', 'is_catalog_filler'])->toArray();

        $exit = Artisan::call('ads:audit-active-content-quality', ['--limit-groups' => 10]);
        $output = Artisan::output();

        $this->assertSame(0, $exit);
        $this->assertStringContainsString('title_missing_letters', $output);
        $this->assertStringContainsString('legacy_placeholder_title', $output);
        $this->assertStringContainsString("copy quality candidate id={$numeric->id} kind=catalog reasons=title_missing_letters", $output);
        $this->assertStringContainsString("copy quality candidate id={$legacy->id} kind=genuine reasons=legacy_placeholder_title", $output);
        $this->assertStringNotContainsString("copy quality candidate id={$legitimate->id}", $output);
        $this->assertStringNotContainsString('wrefrg', $output);
        $this->assertStringNotContainsString('BMW X5', $output);
        $this->assertSame($before, Ad::query()->orderBy('id')->get(['id', 'title', 'description', 'status', 'is_catalog_filler'])->toArray());
    }

    public function test_legacy_global_image_rewrite_is_disabled(): void
    {
        $exit = Artisan::call('mercasto:fix-images');

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('disabled', Artisan::output());
    }
}

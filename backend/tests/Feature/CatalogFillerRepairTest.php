<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogFillerRepairTest extends TestCase
{
    use RefreshDatabase;

    public function test_repair_is_opt_in_preserves_usable_photos_and_never_changes_genuine_listings(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $genuine = $this->makeAd($user, false, 'https://example.com/genuine.jpg', 'pending');
        $external = $this->makeAd($user, true, 'https://images.unsplash.com/photo-legacy?sig=1', 'pending');
        Storage::disk('public')->put('ads/catalog/photos/local.jpg', 'local-photo');
        $local = $this->makeAd($user, true, 'ads/catalog/photos/local.jpg', null);
        $fallback = $this->makeAd($user, true, 'ads/catalog/reference-stale.svg', null);
        $local->forceFill([
            'location' => null,
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
        ])->saveQuietly();

        $originalGenuine = $genuine->getRawOriginal('image_url');
        $originalExternal = $external->getRawOriginal('image_url');
        $originalLocal = $local->getRawOriginal('image_url');

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers'));
        $this->assertSame($originalExternal, $external->fresh()->getRawOriginal('image_url'));
        $this->assertSame('pending', $external->fresh()->ai_moderation_status);
        $this->assertNull($local->fresh()->location);

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers', ['--apply' => true]));

        $external = $external->fresh();
        $local = $local->fresh();
        $fallback = $fallback->fresh();
        $genuine = $genuine->fresh();

        $this->assertSame($originalExternal, $external->getRawOriginal('image_url'));
        $this->assertSame($originalLocal, $local->getRawOriginal('image_url'));
        $this->assertFalse($external->generated_cover);
        $this->assertFalse($local->generated_cover);
        $this->assertSame('approved', $external->ai_moderation_status);
        $this->assertSame('approved', $local->ai_moderation_status);
        $this->assertSame('Boca del Río, Veracruz', $local->location);

        $fallbackImage = json_decode((string) $fallback->getRawOriginal('image_url'), true)[0] ?? null;
        $this->assertSame('ads/catalog/reference-' . $fallback->id . '.svg', $fallbackImage);
        $this->assertTrue(Storage::disk('public')->exists($fallbackImage));
        $this->assertTrue($fallback->generated_cover);
        $this->assertTrue((bool) ($fallback->attributes['editorial_reference'] ?? false));

        $this->assertSame($originalGenuine, $genuine->getRawOriginal('image_url'));
        $this->assertSame('pending', $genuine->ai_moderation_status);
        $this->assertFalse($genuine->generated_cover);
    }

    public function test_repair_restores_only_known_legacy_seed_geography(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $known = $this->makeAd($user, true, 'legacy-known.jpg', 'approved');
        $known->forceFill([
            'location' => 'Guadalajara, JAL',
            'city' => null,
            'state' => null,
        ])->saveQuietly();

        $unknown = $this->makeAd($user, true, 'legacy-unknown.jpg', 'approved');
        $unknown->forceFill([
            'location' => 'Zona Centro',
            'city' => null,
            'state' => null,
        ])->saveQuietly();

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers', ['--apply' => true]));

        $known = $known->fresh();
        $unknown = $unknown->fresh();

        $this->assertSame('Guadalajara', $known->city);
        $this->assertSame('Jalisco', $known->state);
        $this->assertSame('Guadalajara, Jalisco', $known->location);

        $this->assertNull($unknown->city);
        $this->assertNull($unknown->state);
        $this->assertSame('Zona Centro', $unknown->location);
    }

    public function test_deploy_migration_restores_only_legacy_catalog_fillers(): void
    {
        $user = User::factory()->create();

        $known = $this->makeAd($user, true, 'legacy-migration.jpg', 'approved');
        $known->forceFill([
            'location' => 'Monterrey, NL',
            'city' => null,
            'state' => null,
        ])->saveQuietly();

        $genuine = $this->makeAd($user, false, 'genuine-migration.jpg', 'approved');
        $genuine->forceFill([
            'location' => 'Monterrey, NL',
            'city' => null,
            'state' => null,
        ])->saveQuietly();

        $unknown = $this->makeAd($user, true, 'unknown-migration.jpg', 'approved');
        $unknown->forceFill([
            'location' => 'Zona Centro',
            'city' => null,
            'state' => null,
        ])->saveQuietly();

        $migration = require database_path('migrations/2026_08_16_183500_restore_legacy_catalog_filler_geography.php');
        $migration->up();

        $known = $known->fresh();
        $genuine = $genuine->fresh();
        $unknown = $unknown->fresh();

        $this->assertSame('Monterrey', $known->city);
        $this->assertSame('Nuevo León', $known->state);
        $this->assertSame('Monterrey, Nuevo León', $known->location);

        $this->assertNull($genuine->city);
        $this->assertNull($genuine->state);
        $this->assertSame('Monterrey, NL', $genuine->location);

        $this->assertNull($unknown->city);
        $this->assertNull($unknown->state);
        $this->assertSame('Zona Centro', $unknown->location);
    }

    private function makeAd(User $user, bool $filler, string $image, ?string $moderation): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Bicicleta urbana de referencia' : 'Bicicleta real del usuario',
            'description' => 'Bicicleta urbana en buen estado con frenos revisados, asiento cómodo y componentes listos para recorridos diarios.',
            'price' => 2500,
            'location' => 'Veracruz, Veracruz',
            'category' => 'ocio',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode([$image]),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => $moderation,
        ]);
    }
}

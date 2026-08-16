<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExtendedCatalogFillerGeographyTest extends TestCase
{
    use RefreshDatabase;

    public function test_extended_migration_restores_only_incomplete_exact_historical_locations(): void
    {
        $user = User::factory()->create();

        $expected = [
            'Mexicali, BC' => ['Mexicali', 'Baja California'],
            'La Paz, BCS' => ['La Paz', 'Baja California Sur'],
            'Toluca, EDOMEX' => ['Toluca', 'Estado de México'],
            'Playa del Carmen, ROO' => ['Playa del Carmen', 'Quintana Roo'],
            'Tampico, TAMPS' => ['Tampico', 'Tamaulipas'],
            'Xalapa, VER' => ['Xalapa', 'Veracruz'],
        ];

        $fillers = [];
        foreach ($expected as $legacy => $geography) {
            $fillers[$legacy] = $this->makeAd($user, true, $legacy, null, null);
        }

        $genuine = $this->makeAd($user, false, 'Toluca, EDOMEX', null, null);
        $unknown = $this->makeAd($user, true, 'Zona Centro', null, null);
        $complete = $this->makeAd($user, true, 'Mexicali, BC', 'Ciudad conservada', 'Estado conservado');

        $migration = require database_path('migrations/2026_08_16_185000_restore_extended_legacy_catalog_filler_geography.php');
        $migration->up();

        foreach ($expected as $legacy => [$city, $state]) {
            $ad = $fillers[$legacy]->fresh();
            $this->assertSame($city, $ad->city);
            $this->assertSame($state, $ad->state);
            $this->assertSame("{$city}, {$state}", $ad->location);
        }

        $genuine = $genuine->fresh();
        $this->assertNull($genuine->city);
        $this->assertNull($genuine->state);
        $this->assertSame('Toluca, EDOMEX', $genuine->location);

        $unknown = $unknown->fresh();
        $this->assertNull($unknown->city);
        $this->assertNull($unknown->state);
        $this->assertSame('Zona Centro', $unknown->location);

        $complete = $complete->fresh();
        $this->assertSame('Ciudad conservada', $complete->city);
        $this->assertSame('Estado conservado', $complete->state);
        $this->assertSame('Mexicali, BC', $complete->location);
    }

    public function test_repair_command_recognizes_extended_historical_location(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $ad = $this->makeAd($user, true, 'San Pedro Garza García, NL', null, null);

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers', ['--apply' => true]));

        $ad = $ad->fresh();
        $this->assertSame('San Pedro Garza García', $ad->city);
        $this->assertSame('Nuevo León', $ad->state);
        $this->assertSame('San Pedro Garza García, Nuevo León', $ad->location);
    }

    private function makeAd(User $user, bool $filler, string $location, ?string $city, ?string $state): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Referencia editorial histórica' : 'Publicación real del usuario',
            'description' => 'Descripción suficientemente completa para validar la restauración segura de geografía histórica del catálogo.',
            'price' => 1800,
            'location' => $location,
            'city' => $city,
            'state' => $state,
            'category' => 'ocio',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode(['legacy-location-test.jpg']),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => 'approved',
        ]);
    }
}

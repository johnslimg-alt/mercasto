<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CityOnlyCatalogFillerGeographyTest extends TestCase
{
    use RefreshDatabase;

    public function test_historical_seeder_city_keys_are_unique(): void
    {
        $source = file_get_contents(database_path('seeders/TestAdsSeeder.php'));
        $this->assertIsString($source);
        $this->assertSame(1, preg_match('/\$locations\s*=\s*\[(.*?)\];/su', $source, $block));
        $this->assertSame(57, preg_match_all("/'([^']+)'/u", $block[1], $matches));

        $cities = array_map(
            fn (string $location): string => trim(explode(',', $location, 2)[0]),
            $matches[1]
        );

        $this->assertCount(57, $cities);
        $this->assertCount(57, array_unique($cities));
    }

    public function test_city_only_migration_restores_exact_historical_geography(): void
    {
        $user = User::factory()->create();

        $hermosillo = $this->makeAd($user, true, 'Hermosillo', null, null);
        $merida = $this->makeAd($user, true, 'Mérida', null, null);
        $polanco = $this->makeAd($user, true, 'Polanco', null, null);
        $lowerCase = $this->makeAd($user, true, 'guadalajara', null, null);

        $migration = require database_path('migrations/2026_08_16_193000_restore_city_only_catalog_filler_geography.php');
        $migration->up();

        $hermosillo = $hermosillo->fresh();
        $this->assertSame('Hermosillo', $hermosillo->city);
        $this->assertSame('Sonora', $hermosillo->state);
        $this->assertSame('Hermosillo, Sonora', $hermosillo->location);

        $merida = $merida->fresh();
        $this->assertSame('Mérida', $merida->city);
        $this->assertSame('Yucatán', $merida->state);
        $this->assertSame('Mérida, Yucatán', $merida->location);

        $polanco = $polanco->fresh();
        $this->assertSame('Polanco', $polanco->city);
        $this->assertSame('Ciudad de México', $polanco->state);
        $this->assertSame('Polanco, Ciudad de México', $polanco->location);

        $lowerCase = $lowerCase->fresh();
        $this->assertSame('Guadalajara', $lowerCase->city);
        $this->assertSame('Jalisco', $lowerCase->state);
        $this->assertSame('Guadalajara, Jalisco', $lowerCase->location);
    }

    public function test_city_only_migration_never_touches_genuine_unknown_or_complete_rows(): void
    {
        $user = User::factory()->create();

        $genuine = $this->makeAd($user, false, 'Hermosillo', null, null);
        $unknown = $this->makeAd($user, true, 'Zona Centro', null, null);
        $complete = $this->makeAd($user, true, 'Hermosillo', 'Ciudad conservada', 'Estado conservado');

        $migration = require database_path('migrations/2026_08_16_193000_restore_city_only_catalog_filler_geography.php');
        $migration->up();

        $genuine = $genuine->fresh();
        $this->assertNull($genuine->city);
        $this->assertNull($genuine->state);
        $this->assertSame('Hermosillo', $genuine->location);

        $unknown = $unknown->fresh();
        $this->assertNull($unknown->city);
        $this->assertNull($unknown->state);
        $this->assertSame('Zona Centro', $unknown->location);

        $complete = $complete->fresh();
        $this->assertSame('Ciudad conservada', $complete->city);
        $this->assertSame('Estado conservado', $complete->state);
        $this->assertSame('Hermosillo', $complete->location);
    }

    private function makeAd(User $user, bool $filler, string $location, ?string $city, ?string $state): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Referencia editorial city-only' : 'Publicación real city-only',
            'description' => 'Descripción completa para validar de forma segura la restauración exacta de geografía city-only del catálogo.',
            'price' => 1900,
            'location' => $location,
            'city' => $city,
            'state' => $state,
            'category' => 'ocio',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode(['city-only-geography-test.jpg']),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => 'approved',
        ]);
    }
}

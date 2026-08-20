<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class AdWriteSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_owner_cannot_read_or_mutate_another_users_ad(): void
    {
        $owner = User::factory()->create(['role' => 'individual']);
        $attacker = User::factory()->create(['role' => 'individual']);
        $ad = $this->createAd($owner, ['status' => 'active']);

        $this->actingAs($attacker, 'sanctum');

        $this->getJson("/api/ads/{$ad->id}/edit")->assertForbidden();
        $this->postJson("/api/ads/{$ad->id}", [])->assertForbidden();
        $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/pause")->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/activate")->assertForbidden();
        $this->postJson("/api/ads/{$ad->id}/republish")->assertForbidden();
        $this->putJson("/api/ads/{$ad->id}/renew")->assertForbidden();
        $this->deleteJson("/api/ads/{$ad->id}")->assertForbidden();

        $this->assertDatabaseHas('ads', [
            'id' => $ad->id,
            'user_id' => $owner->id,
            'status' => 'active',
        ]);
    }

    public function test_ad_creation_rejects_non_image_and_oversized_image_uploads(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => 'individual']);
        $this->createCategory();

        $basePayload = $this->validAdPayload();

        $script = UploadedFile::fake()->createWithContent('payload.php', '<?php echo "unsafe";');
        $this->actingAs($user, 'sanctum')
            ->post('/api/ads', [...$basePayload, 'images' => [$script]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['images.0']);

        $oversizedImage = UploadedFile::fake()
            ->image('oversized.jpg', 1200, 900)
            ->size(5121);

        $this->actingAs($user, 'sanctum')
            ->post('/api/ads', [...$basePayload, 'images' => [$oversizedImage]])
            ->assertUnprocessable()
             ->assertJsonValidationErrors(['images.0']);

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_ad_mutation_routes_enforce_burst_rate_limit(): void
    {
        $user = User::factory()->create(['role' => 'individual']);
        $ad = $this->createAd($user, ['status' => 'active']);

        $this->actingAs($user, 'sanctum');

        for ($attempt = 1; $attempt <= 30; $attempt++) {
            $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])
                ->assertOk();
        }

        $this->patchJson("/api/ads/{$ad->id}/status", ['status' => 'paused'])
            ->assertTooManyRequests()
            ->assertJsonPath('error', 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
    }

    public function test_bulk_upload_route_enforces_upload_rate_limit_before_processing(): void
    {
        $user = User::factory()->create(['role' => 'business']);

        $this->actingAs($user, 'sanctum');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/ads/bulk-upload', [])
                ->assertUnprocessable();
        }

        $this->postJson('/api/ads/bulk-upload', [])
            ->assertTooManyRequests()
            ->assertJsonPath('error', 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
    }

    public function test_bulk_upload_rejects_invalid_listing_copy_before_any_rows_are_persisted(): void
    {
        $user = User::factory()->create(['role' => 'business']);
        $csv = implode("\n", [
            'title,price,description,location,category',
            'Bicicleta urbana,1500,Bicicleta en buen estado,Veracruz,general',
            '123456,2000,9876543210,Veracruz,general',
        ]);
        $file = UploadedFile::fake()->createWithContent('bulk.csv', $csv);

        $this->actingAs($user, 'sanctum')
            ->post('/api/ads/bulk-upload', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'bulk_listing_quality_failed')
            ->assertJsonPath('rejected_rows.0.row', 3)
            ->assertJsonPath('rejected_rows.0.errors.0', 'title_missing_letters')
            ->assertJsonPath('rejected_rows.0.errors.1', 'description_missing_letters');

        $this->assertDatabaseCount('ads', 0);
    }

    public function test_bulk_xml_quality_scan_covers_xml_rows_before_persistence_phase(): void
    {
        $xml = '<ads><ad><title>123456</title><price>20</price><description>9876543210</description><location>Veracruz</location><category>general</category></ad></ads>';
        $path = tempnam(sys_get_temp_dir(), 'bulk-xml-');
        file_put_contents($path, $xml);

        $controller = app(\App\Http\Controllers\Api\AdController::class);
        $method = new \ReflectionMethod($controller, 'validateBulkListingQuality');
        $method->setAccessible(true);
        $rejected = $method->invoke($controller, $path, 'xml', 10);

        $this->assertSame(1, $rejected[0]['row']);
        $this->assertSame(['title_missing_letters', 'description_missing_letters'], $rejected[0]['errors']);
    }

    public function test_bulk_xlsx_upload_applies_listing_text_quality_before_persistence(): void
    {
        $user = User::factory()->create(['role' => 'business']);
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([
            ['title', 'price', 'description', 'location', 'category'],
            ['123456', 20, '9876543210', 'Veracruz', 'general'],
        ]);
        $path = tempnam(sys_get_temp_dir(), 'bulk-xlsx-');
        (new Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();
        $file = new UploadedFile($path, 'bulk.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $this->actingAs($user, 'sanctum')
            ->post('/api/ads/bulk-upload', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonPath('rejected_rows.0.row', 2)
            ->assertJsonPath('rejected_rows.0.errors.0', 'title_missing_letters');

        $this->assertDatabaseCount('ads', 0);
    }

    private function createAd(User $user, array $overrides = []): Ad
    {
        return Ad::create([
            'user_id' => $user->id,
            'title' => 'Anuncio protegido',
            'description' => 'Descripción de seguridad.',
            'price' => 1000,
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'subcategory' => 'Telefonía',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Telefonía'],
            'status' => 'active',
            ...$overrides,
        ]);
    }

    private function createCategory(): Category
    {
        return Category::create([
            'slug' => 'electronica',
            'name' => ['es' => 'Electrónica', 'en' => 'Electronics'],
            'icon' => 'Monitor',
        ]);
    }

    /** @return array<string, mixed> */
    private function validAdPayload(): array
    {
        return [
            'title' => 'Teléfono de prueba',
            'price' => 1000,
            'description' => 'Descripción de prueba.',
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'category' => 'electronica',
            'subcategory' => 'Telefonía',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Telefonía'],
      ];
    }
}

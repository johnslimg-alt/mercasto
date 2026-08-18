<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportSubmissionReferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_report_returns_stable_reference_and_starts_new(): void
    {
        $seller = User::factory()->create();
        $ad = $this->createAd($seller);

        $response = $this->postJson("/api/ads/{$ad->id}/report", [
            'reason' => 'fraud',
            'comments' => 'Please review this listing.',
        ])->assertOk()
            ->assertJsonPath('message', 'Reporte enviado exitosamente. Gracias por ayudarnos a mantener la plataforma segura.');

        $reference = (string) $response->json('report_reference');
        $this->assertMatchesRegularExpression('/^RPT-A-\d{8}$/', $reference);
        $reportId = (int) substr($reference, 6);

        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'ad_id' => $ad->id,
            'status' => 'new',
            'reason' => 'fraud',
        ]);
    }

    public function test_user_report_returns_stable_reference_and_starts_new(): void
    {
        $reported = User::factory()->create();

        $response = $this->postJson("/api/users/{$reported->id}/report", [
            'reason' => 'spam',
            'comments' => 'Please review this profile.',
        ])->assertOk()
            ->assertJsonPath('message', 'Reporte enviado exitosamente. Revisaremos el perfil de este usuario.');

        $reference = (string) $response->json('report_reference');
        $this->assertMatchesRegularExpression('/^RPT-U-\d{8}$/', $reference);
        $reportId = (int) substr($reference, 6);

        $this->assertDatabaseHas('user_reports', [
            'id' => $reportId,
            'reported_user_id' => $reported->id,
            'status' => 'new',
            'reason' => 'spam',
        ]);
    }

    public function test_missing_report_targets_keep_existing_not_found_contracts(): void
    {
        $this->postJson('/api/ads/999999/report', ['reason' => 'other'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Anuncio no encontrado');

        $this->postJson('/api/users/999999/report', ['reason' => 'other'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Usuario no encontrado');
    }

    private function createAd(User $seller): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Report reference fixture',
            'description' => 'Deterministic report submission fixture',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'active',
        ]));
    }
}

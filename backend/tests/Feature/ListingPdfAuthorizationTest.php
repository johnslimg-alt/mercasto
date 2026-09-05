<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingPdfAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_export_listing_pdf(): void
    {
        $owner = User::factory()->create();
        $ad = $this->createRealEstateAd($owner);

        $this->get("/api/ads/{$ad->id}/pdf")->assertUnauthorized();
    }

    public function test_authenticated_non_owner_cannot_export_listing_pdf(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ad = $this->createRealEstateAd($owner);

        $this->actingAs($other, 'sanctum')
            ->get("/api/ads/{$ad->id}/pdf")
            ->assertForbidden();
    }

    private function createRealEstateAd(User $owner): Ad
    {
        return Ad::create([
            'user_id' => $owner->id,
            'title' => 'Casa protegida',
            'description' => 'Ficha privada para exportación.',
            'price' => 1500000,
            'location' => 'Boca del Río',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'category' => 'inmobiliaria',
            'subcategory' => 'Casas',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Casas'],
            'status' => 'active',
        ]);
    }
}

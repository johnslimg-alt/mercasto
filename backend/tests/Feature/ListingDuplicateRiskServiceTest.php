<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\ListingDuplicateRiskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingDuplicateRiskServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_seller_title_category_and_location_is_flagged(): void
    {
        $user = User::factory()->create();
        $this->ad($user, 'Mesa Robusta', 'Boca del Río', 'Veracruz');

        $risk = app(ListingDuplicateRiskService::class)->hasRisk($user->id, [
            'title' => ' mesa robusta ',
            'category' => 'productos',
            'city' => 'Boca del Rio',
            'state' => 'Veracruz',
        ]);

        $this->assertTrue($risk);
    }

    public function test_other_seller_or_location_does_not_trigger(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();
        $this->ad($other, 'Mesa Robusta', 'Boca del Río', 'Veracruz');
        $this->ad($seller, 'Mesa Robusta', 'Xalapa', 'Veracruz');

        $risk = app(ListingDuplicateRiskService::class)->hasRisk($seller->id, [
            'title' => 'Mesa Robusta',
            'category' => 'productos',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
        ]);

        $this->assertFalse($risk);
    }

    public function test_edit_excludes_the_current_listing(): void
    {
        $user = User::factory()->create();
        $ad = $this->ad($user, 'Mesa Robusta', 'Boca del Río', 'Veracruz');

        $risk = app(ListingDuplicateRiskService::class)->hasRisk($user->id, [
            'title' => 'Mesa Robusta',
            'category' => 'productos',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
        ], $ad->id);

        $this->assertFalse($risk);
    }

    private function ad(User $user, string $title, string $city, string $state): Ad
    {
        return Ad::create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Descripción suficientemente completa para la prueba.',
            'price' => 1000,
            'location' => "$city, $state",
            'city' => $city,
            'state' => $state,
            'category' => 'productos',
            'status' => 'active',
        ]);
    }
}

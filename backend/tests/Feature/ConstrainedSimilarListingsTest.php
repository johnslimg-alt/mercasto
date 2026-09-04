<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AdController;
use App\Http\Controllers\Api\ConstrainedSimilarAdController;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConstrainedSimilarListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_ad_controller_resolves_to_constrained_similar_controller(): void
    {
        $this->assertInstanceOf(ConstrainedSimilarAdController::class, app(AdController::class));
    }

    public function test_similar_results_keep_category_price_condition_and_public_inventory_constraints(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 8,
            'semantic_discovery.similar.price_min_ratio' => 0.5,
            'semantic_discovery.similar.price_max_ratio' => 1.75,
        ]);

        $source = $this->ad([
            'title' => 'Toyota Corolla origen',
            'price' => 200000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $city = $this->ad([
            'title' => 'Toyota Corolla local',
            'price' => 210000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $state = $this->ad([
            'title' => 'Toyota Corolla estatal',
            'price' => 190000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Xalapa',
        ]);
        $remote = $this->ad([
            'title' => 'Toyota Corolla nacional',
            'price' => 220000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Puebla',
            'city' => 'Puebla',
        ]);

        $excluded = [
            $this->ad(['category' => 'electronica']),
            $this->ad(['category' => 'motor', 'condition' => 'new']),
__CONTINUE__
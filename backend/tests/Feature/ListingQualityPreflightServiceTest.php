<?php

namespace Tests\Feature;

use App\Services\ListingQualityPreflightService;
use Tests\TestCase;

class ListingQualityPreflightServiceTest extends TestCase
{
    private ListingQualityPreflightService $preflight;

    protected function setUp(): void
    {
        parent::setUp();
        $this->preflight = app(ListingQualityPreflightService::class);
    }

    public function test_valid_minimal_listing_passes_without_warnings(): void
    {
        $result = $this->preflight->evaluate([
            'title' => 'Mesa de madera sólida',
            'description' => 'Mesa usada en buen estado, lista para entrega local.',
            'price' => 1500,
            'category' => 'servicios',
            'photo_count' => 0,
        ]);

        $this->assertTrue($result['passes_hard_validation']);
        $this->assertSame([], $result['errors']);
        $this->assertSame([], $result['warnings']);
    }

    public function test_structural_failures_are_separate_from_quality_warnings(): void
    {
        $result = $this->preflight->evaluate([
            'title' => 'x',
            'description' => 'corta',
            'price' => -1,
            'category' => 'productos',
            'photo_count' => 0,
        ]);

        $this->assertFalse($result['passes_hard_validation']);
        $this->assertEqualsCanonicalizing([
            'title_too_short',
            'description_too_short',
            'price_negative',
        ], $result['errors']);
        $this->assertContains('photo_recommended', $result['warnings']);
    }

    public function test_non_destructive_quality_signals_are_language_neutral(): void
    {
        $result = $this->preflight->evaluate([
            'title' => 'Camera camera camera camera camera lens',
            'description' => 'Camera lens camera kit camera body. Contact +52 229 123 4567 or https://example.com.',
            'price' => 0,
            'category' => 'productos',
            'photo_count' => 0,
        ]);

        $this->assertTrue($result['passes_hard_validation']);
        $this->assertEqualsCanonicalizing([
            'price_zero',
            'contact_data_in_copy',
            'keyword_stuffing',
            'photo_recommended',
        ], $result['warnings']);
    }

    public function test_repeated_title_description_is_warning_only(): void
    {
        $result = $this->preflight->evaluate([
            'title' => 'Bicicleta urbana ligera',
            'description' => 'Bicicleta urbana ligera',
            'price' => 3500,
            'category' => 'otros',
            'photo_count' => 1,
        ]);

        $this->assertTrue($result['passes_hard_validation']);
        $this->assertSame([], $result['errors']);
        $this->assertContains('title_repeated_as_description', $result['warnings']);
    }
}

<?php

namespace Tests\Unit;

use App\Services\AI\ListingAutofillTaxonomy;
use Tests\TestCase;

class ListingAutofillTaxonomyTest extends TestCase
{
    public function test_low_confidence_and_hallucinated_fields_are_never_suggested(): void
    {
        config(['listing_autofill.min_field_confidence' => 0.55]);
        $schema = [
            'categories' => ['motor' => ['label' => 'Motor']],
            'subcategories' => ['motor' => ['SUV']],
            'attributes' => [
                'motor' => [
                    'marca' => ['type' => 'select', 'options' => ['Toyota']],
                    'modelo' => ['type' => 'text', 'options' => []],
                ],
            ],
        ];
        $proposal = [
            'category' => ['value' => 'motor', 'confidence' => 0.99],
            'subcategory' => ['value' => 'Flying cars', 'confidence' => 0.99],
            'attributes' => [
                'marca' => ['value' => 'ImaginaryBrand', 'confidence' => 0.99],
                'serial_number' => ['value' => '123', 'confidence' => 0.99],
                'modelo' => ['value' => 'RAV4', 'confidence' => 0.90],
            ],
            'title' => ['value' => 'Toyota SUV', 'confidence' => 0.30],
        ];

        $result = app(ListingAutofillTaxonomy::class)->sanitize($proposal, $schema);

        $this->assertSame('motor', $result['category']['value']);
        $this->assertNull($result['subcategory']);
        $this->assertSame(['modelo' => ['value' => 'RAV4', 'confidence' => 0.9]], $result['attributes']);
        $this->assertNull($result['title']);
    }
}

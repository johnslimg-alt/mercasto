<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightNoDestructiveActionContractTest extends TestCase
{
    public function test_preflight_middleware_does_not_delete_or_mutate_persisted_listing_data(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertStringNotContainsString('Storage::', $source);
        $this->assertStringNotContainsString('->delete(', $source);
        $this->assertStringNotContainsString('->update(', $source);
        $this->assertStringNotContainsString('Ad::create(', $source);

        $duplicateRisk = file_get_contents(__DIR__ . '/../../app/Services/ListingDuplicateRiskService.php');
        $this->assertStringNotContainsString('->delete(', $duplicateRisk);
        $this->assertStringNotContainsString('->update(', $duplicateRisk);
        $this->assertStringNotContainsString('::create(', $duplicateRisk);
    }
}

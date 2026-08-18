<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightBootstrapContractTest extends TestCase
{
    public function test_listing_preflight_middleware_stays_in_api_group(): void
    {
        $source = file_get_contents(__DIR__ . '/../../bootstrap/app.php');

        $this->assertStringContainsString(
            "appendToGroup('api', \\App\\Http\\Middleware\\ApplyListingQualityPreflight::class)",
            $source,
        );
    }
}

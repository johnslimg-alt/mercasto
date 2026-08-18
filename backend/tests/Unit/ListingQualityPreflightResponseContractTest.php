<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightResponseContractTest extends TestCase
{
    public function test_successful_listing_write_response_keeps_warnings_additive(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertStringContainsString('$response = $next($request);', $source);
        $this->assertStringContainsString('$response->isSuccessful()', $source);
        $this->assertStringContainsString("'quality_preflight'", $source);
        $this->assertStringContainsString('$response->setData($payload);', $source);
    }
}

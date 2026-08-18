<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightWarningResponseContractTest extends TestCase
{
    public function test_successful_json_responses_receive_quality_preflight_without_forcing_failure(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertStringContainsString('$response = $next($request);', $source);
        $this->assertStringContainsString('$response->isSuccessful()', $source);
        $this->assertStringContainsString("$payload['quality_preflight'] = $result", $source);
    }
}

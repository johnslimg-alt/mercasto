<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightWritePathSafetyContractTest extends TestCase
{
    public function test_hard_preflight_failure_returns_before_controller_write_path(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');
        $failure = strpos($source, "if (! $result['passes_hard_validation'])");
        $next = strpos($source, '$response = $next($request);');

        $this->assertNotFalse($failure);
        $this->assertNotFalse($next);
        $this->assertLessThan($next, $failure);
    }
}

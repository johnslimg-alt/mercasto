<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityPreflightMachineCodeContractTest extends TestCase
{
    public function test_write_path_returns_structured_machine_readable_quality_result(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertStringContainsString("'quality_preflight' => \$result", $source);
        $this->assertStringContainsString("'passes_hard_validation'", file_get_contents(__DIR__ . '/../../app/Services/ListingQualityPreflightService.php'));
    }
}

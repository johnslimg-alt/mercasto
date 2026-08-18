<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ApplyListingQualityPreflightMiddlewareContractTest extends TestCase
{
    public function test_middleware_remains_scoped_to_authenticated_ad_create_and_edit_paths_only(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertStringContainsString("$path === 'api/ads'", $source);
        $this->assertStringContainsString("preg_match('#^api/ads/[0-9]+$#', $path)", $source);
        $this->assertStringContainsString("$request->user('sanctum')", $source);
        $this->assertStringContainsString("'quality_preflight' => \$result", $source);
    }
}

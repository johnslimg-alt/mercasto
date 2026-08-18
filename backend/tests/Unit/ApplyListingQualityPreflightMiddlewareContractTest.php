<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ApplyListingQualityPreflightMiddlewareContractTest extends TestCase
{
    public function test_middleware_remains_scoped_to_ad_create_and_edit_only(): void
    {
        $source = file_get_contents(base_path('app/Http/Middleware/ApplyListingQualityPreflight.php'));

        $this->assertStringContainsString("getControllerClass() === AdController::class", $source);
        $this->assertStringContainsString("['store', 'update']", $source);
        $this->assertStringContainsString("auth('sanctum')->user()", $source);
        $this->assertStringContainsString("'quality_preflight' => \$result", $source);
    }
}

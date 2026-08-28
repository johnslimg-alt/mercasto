<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class RecommendationSafetyContractTest extends TestCase
{
    public function test_recommendation_fallback_is_genuine_only_and_privacy_minimized(): void
    {
        $service = file_get_contents(__DIR__ . '/../../app/Services/RecommendationService.php');
        $controller = file_get_contents(__DIR__ . '/../../app/Http/Controllers/Api/RecommendationController.php');

        $this->assertGreaterThanOrEqual(5, substr_count($service, "where('is_catalog_filler', false)"));
        $this->assertStringNotContainsString("'ip_address' =>", $service);
        $this->assertStringNotContainsString("'user_agent' =>", $service);
        $this->assertStringNotContainsString('$request->ip()', $controller);
        $this->assertStringNotContainsString('$request->userAgent()', $controller);
        $this->assertStringNotContainsString('array_intersect_key', $service);
        $this->assertStringContainsString('deduplicateRecommendations', $service);
        $this->assertStringContainsString('recommendations:user:{$userId}:version', $service);
    }
}

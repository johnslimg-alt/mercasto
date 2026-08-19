<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AIModerationAssistOnlySellerGuidanceContractTest extends TestCase
{
    public function test_assist_only_model_output_cannot_become_a_seller_change_request(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Services/AdModerationGuidanceService.php');

        $this->assertStringContainsString("\$rollout = is_array(\$decision?->metadata['rollout']", $source);
        $this->assertStringContainsString("if ((\$rollout['assist_only'] ?? false) === true)", $source);
        $this->assertStringContainsString('return null;', $source);
        $this->assertStringContainsString("\$ad->ai_moderation_status === 'admin_changes_requested'", $source);
    }
}

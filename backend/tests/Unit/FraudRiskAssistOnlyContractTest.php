<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class FraudRiskAssistOnlyContractTest extends TestCase
{
    public function test_fraud_risk_service_is_shadow_assist_only_and_privacy_minimized(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Services/AI/FraudDetectionService.php');
        $config = require __DIR__ . '/../../config/fraud_risk.php';

        $this->assertSame('shadow_assist', $config['mode']);
        $this->assertStringNotContainsString("['status' => 'under_review']", $source);
        $this->assertStringContainsString("'authoritative_action' => null", $source);
        $this->assertStringContainsString("'reason_codes' => \$reasonCodes", $source);
        $this->assertStringContainsString("'listing_risk_score' => \$listingScore", $source);
        $this->assertStringContainsString("'account_risk_score' => \$accountScore", $source);
        $this->assertStringNotContainsString('account ' . '$accountAgeDays' . ' days old', $source);
    }
}

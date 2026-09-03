<?php

namespace Tests\Unit;

use Tests\TestCase;

class FraudRiskReviewFollowupContractTest extends TestCase
{
    public function test_resolved_report_window_uses_resolution_time(): void
    {
        $source = file_get_contents(app_path('Services/AI/FraudRiskFeatureExtractor.php'));

        $this->assertStringContainsString("->where('resolved_at', '>=', \$since)", $source);
        $this->assertStringContainsString("->where('reports.resolved_at', '>=', \$since)", $source);
        $this->assertStringContainsString("Schema::hasColumn(\$table, 'resolved_at')", $source);
    }

    public function test_disabled_python_and_gateway_outage_remain_retry_eligible(): void
    {
        $source = file_get_contents(app_path('Services/AI/PythonFraudDetectionService.php'));

        $this->assertStringContainsString("'private_risk_gateway_unavailable'", $source);
        $this->assertStringContainsString("'python_risk_disabled'", $source);
        $this->assertStringContainsString("\$ad->forceFill(['last_fraud_check_at' => \$previousFraudCheckAt])", $source);
    }

    public function test_neutral_fallback_guidance_is_derived_from_retained_score(): void
    {
        $source = file_get_contents(app_path('Services/AI/PythonFraudDetectionService.php'));

        $this->assertStringContainsString('$recommendedAction = $this->recommendedAction($score);', $source);
        $this->assertStringContainsString("'requires_manual_review' => in_array(\$recommendedAction, ['manual_review', 'urgent_review'], true)", $source);
        $this->assertStringContainsString("'recommended_action' => \$recommendedAction", $source);
    }

    public function test_admin_batch_jobs_are_serialized_without_being_discarded(): void
    {
        $source = file_get_contents(app_path('Jobs/ScoreFraudRiskBatch.php'));

        $this->assertStringContainsString('WithoutOverlapping', $source);
        $this->assertStringNotContainsString('ShouldBeUnique', $source);
        $this->assertStringContainsString("onQueue('ai-moderation')", $source);
    }
}

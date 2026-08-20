<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PolicyRolloutAssistOnlyContractTest extends TestCase
{
    public function test_first_policy_rollout_cannot_enable_model_only_enforcement_by_environment(): void
    {
        $config = file_get_contents(__DIR__ . '/../../config/ai_moderation.php');
        $job = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertIsString($config);
        $this->assertIsString($job);
        $this->assertStringContainsString("'assist_only' => true", $config);
        $this->assertStringNotContainsString('AI_MODERATION_ASSIST_ONLY', $config);
        $this->assertStringContainsString("'destructive_model_only_actions' => false", $config);
        $this->assertStringContainsString("config('ai_moderation.assist_only', true)", $job);
        $this->assertStringContainsString("if (\$assistOnly && \$decision !== 'manual_review')", $job);
        $this->assertStringContainsString("\$decision = 'manual_review';", $job);
        $this->assertStringContainsString("'proposed_decision' => \$proposedDecision", $job);
        $this->assertStringContainsString("'authoritative_decision' => \$decision", $job);
    }
}

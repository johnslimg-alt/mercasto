<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AIModerationAssistOnlyContractTest extends TestCase
{
    public function test_rollout_is_hardcoded_human_authoritative_assist_only(): void
    {
        $source = file_get_contents(__DIR__ . '/../../config/ai_moderation.php');

        $this->assertStringContainsString("env('AI_MODERATION_ENABLED', true)", $source);
        $this->assertStringContainsString("'assist_only' => true", $source);
        $this->assertStringNotContainsString('AI_MODERATION_ASSIST_ONLY', $source);
        $this->assertStringContainsString("'mode' => 'assist'", $source);
        $this->assertStringContainsString("'human_authoritative' => true", $source);
        $this->assertStringContainsString("'destructive_model_only_actions' => false", $source);
    }

    public function test_job_keeps_model_decision_as_proposal(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');
        $this->assertStringContainsString("config('ai_moderation.assist_only', true)", $source);
        $this->assertStringContainsString('$proposedDecision = $this->safeDecision', $source);
        $this->assertStringContainsString("if (\$assistOnly && \$decision !== 'manual_review')", $source);
        $this->assertStringContainsString("'authoritative_decision' => \$decision", $source);
    }
}
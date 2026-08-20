<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AIModerationAssistOnlyContractTest extends TestCase
{
    public function test_default_rollout_is_human_authoritative_assist_only(): void
    {
        $source = file_get_contents(__DIR__ . '/../../config/ai_moderation.php');

        $this->assertStringContainsString("env('AI_MODERATION_ENABLED', true)", $source);
        $this->assertStringContainsString("! env('AI_MODERATION_ENFORCEMENT_APPROVED', false)", $source);
        $this->assertStringContainsString("env('AI_MODERATION_ASSIST_ONLY', true)", $source);
        $this->assertStringContainsString("env('AI_MODERATION_ROLLOUT_MODE', 'assist')", $source);
        $this->assertStringContainsString("'human_authoritative' => true", $source);
        $this->assertStringContainsString("'enforcement_approved' => (bool) env('AI_MODERATION_ENFORCEMENT_APPROVED', false)", $source);
        $this->assertStringContainsString("'destructive_model_only_actions' => false", $source);
    }

    public function test_job_keeps_model_decision_as_proposal_in_assist_only_mode(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString("config('ai_moderation.assist_only', true)", $source);
        $this->assertStringContainsString('$proposedDecision = $this->safeDecision', $source);
        $this->assertStringContainsString("if (\$assistOnly && \$decision !== 'manual_review')", $source);
        $this->assertStringContainsString("\$decision = 'manual_review';", $source);
        $this->assertStringContainsString("'human_authoritative' => true", $source);
        $this->assertStringContainsString("'proposed_decision' => \$proposedDecision", $source);
        $this->assertStringContainsString("'authoritative_decision' => \$decision", $source);
        $this->assertStringContainsString("'human_confirmation_required'", $source);
    }

    public function test_kill_switch_degrades_to_manual_review_without_model_authority(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString("config('ai_moderation.enabled', true)", $source);
        $this->assertStringContainsString('La asistencia automática de moderación está desactivada', $source);
        $this->assertStringContainsString("'rollout_mode' => 'disabled'", $source);
    }
}

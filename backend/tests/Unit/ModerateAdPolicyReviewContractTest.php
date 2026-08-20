<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

// Regression contract for #693: deterministic and model policy signals must
// survive the async moderation boundary and remain human-authoritative.
class ModerateAdPolicyReviewContractTest extends TestCase
{
    public function test_policy_matches_force_background_moderation_to_manual_review(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString('ListingPolicySignalService $policySignals', $source);
        $this->assertStringContainsString('ListingPolicyMatrixService $policyMatrix', $source);
        $this->assertStringContainsString('$textPolicyReview = $policySignals->assessListing', $source);
        $this->assertStringContainsString('$modelPolicyReview = $policyMatrix->assessment', $source);
        $this->assertStringContainsString("\$decision = 'manual_review';", $source);
        $this->assertStringContainsString("'policy_review' => [", $source);
        $this->assertStringContainsString("'policy_ids' => \$policyIds", $source);
        $this->assertStringContainsString("'authoritative_action' => null", $source);
        $this->assertStringContainsString("'activate_on_human_approval' => \$this->activateOnApproval", $source);
    }

    public function test_activation_intent_survives_disabled_and_provider_failure_paths(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertGreaterThanOrEqual(3, substr_count($source, "'activate_on_human_approval' => \$this->activateOnApproval"));
        $this->assertStringContainsString("'mode' => 'disabled'", $source);
        $this->assertStringContainsString("Log::error('AI moderation failed'", $source);
    }

    public function test_text_policy_evidence_is_captured_before_kill_switch_and_provider_calls(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $assessment = strpos($source, '$textPolicyReview = $policySignals->assessListing');
        $killSwitch = strpos($source, "config('ai_moderation.enabled', true)");
        $providerCall = strpos($source, '$ai->chatPro');

        $this->assertNotFalse($assessment);
        $this->assertNotFalse($killSwitch);
        $this->assertNotFalse($providerCall);
        $this->assertLessThan($killSwitch, $assessment);
        $this->assertLessThan($providerCall, $assessment);
        $this->assertStringContainsString('$textPolicyMetadata', $source);
        $this->assertStringContainsString("'text_policy_ids' => \$textPolicyIds", $source);
        $this->assertGreaterThanOrEqual(2, substr_count($source, '], $textPolicyMetadata)'));
    }

    public function test_prompt_requests_canonical_policy_signal_ids(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString('canonicalPolicySignals', $source);
        $this->assertStringContainsString('exclusivamente estos IDs canónicos en flags', $source);
        $this->assertStringContainsString('en vez de inventar un flag', $source);
    }
}

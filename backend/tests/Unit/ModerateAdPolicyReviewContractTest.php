<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ModerateAdPolicyReviewContractTest extends TestCase
{
    public function test_policy_matches_force_background_moderation_to_manual_review(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString('ListingPolicySignalService $policySignals', $source);
        $this->assertStringContainsString('ListingPolicyMatrixService $policyMatrix', $source);
        $this->assertStringContainsString('$textPolicyReview = $policySignals->assessListing', $source);
        $this->assertStringContainsString('$modelPolicyReview = $policyMatrix->assessment', $source);
        $this->assertStringContainsString("$decision = 'manual_review';", $source);
        $this->assertStringContainsString("'policy_review' => [", $source);
        $this->assertStringContainsString("'policy_ids' => $policyIds", $source);
        $this->assertStringContainsString("'authoritative_action' => null", $source);
    }

    public function test_prompt_requests_canonical_policy_signal_ids(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Jobs/ModerateAdWithAI.php');

        $this->assertStringContainsString('canonicalPolicySignals', $source);
        $this->assertStringContainsString('exclusivamente estos IDs canónicos en flags', $source);
        $this->assertStringContainsString('en vez de inventar un flag', $source);
    }
}

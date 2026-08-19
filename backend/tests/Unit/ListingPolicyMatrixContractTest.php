<?php

namespace Tests\Unit;

use App\Services\ListingPolicyMatrixService;
use PHPUnit\Framework\TestCase;

class ListingPolicyMatrixContractTest extends TestCase
{
    public function test_matrix_has_stable_schema_and_pending_legal_review(): void
    {
        $matrix = require __DIR__ . '/../../config/listing_policy.php';

        $this->assertSame('internal_draft', $matrix['publication_status']);
        $this->assertSame('pending', $matrix['legal_review_status']);
        $this->assertFalse($matrix['enforcement']['ai_may_auto_approve']);
        $this->assertFalse($matrix['enforcement']['ai_may_auto_reject']);
        $this->assertTrue($matrix['enforcement']['human_authoritative']);
        $this->assertFalse($matrix['enforcement']['destructive_action_from_model_only']);
        $this->assertNotEmpty($matrix['next_review_on']);

        $allowed = $matrix['allowed_dispositions'];
        $this->assertContains('prohibited', $allowed);
        $this->assertContains('restricted_verification', $allowed);
        $this->assertContains('allowed_with_conditions', $allowed);
        $this->assertContains('manual_legal_review', $allowed);

        $this->assertGreaterThanOrEqual(8, count($matrix['policies']));
        foreach ($matrix['policies'] as $policyId => $policy) {
            $this->assertMatchesRegularExpression('/^[a-z0-9_]+$/', $policyId);
            $this->assertContains($policy['disposition'], $allowed, $policyId);
            $this->assertSame('pending', $policy['legal_review'], $policyId);
            $this->assertIsArray($policy['seller_evidence'], $policyId);
            $this->assertIsArray($policy['allowed_fields_media'], $policyId);
            $this->assertNotEmpty($policy['automated_signals'], $policyId);
            $this->assertNotEmpty($policy['moderator_action'], $policyId);
            $this->assertNotEmpty($policy['appeal_path'], $policyId);
            $this->assertNotEmpty($policy['retention'], $policyId);
        }
    }

    public function test_service_maps_signals_to_shared_policy_ids_without_automatic_decision(): void
    {
        $matrix = require __DIR__ . '/../../config/listing_policy.php';
        $service = new ListingPolicyMatrixService($matrix);

        $assessment = $service->assessment(['weapon', 'counterfeit']);

        $this->assertContains('weapons_ammunition_explosives', $assessment['policy_ids']);
        $this->assertContains('counterfeit_stolen_goods_false_documents', $assessment['policy_ids']);
        $this->assertTrue($assessment['requires_manual_review']);
        $this->assertTrue($assessment['prohibited_signal_present']);
        $this->assertTrue($assessment['human_authoritative']);
        $this->assertFalse($assessment['ai_may_auto_approve']);
        $this->assertFalse($assessment['ai_may_auto_reject']);
        $this->assertNull($assessment['authoritative_action']);
    }

    public function test_free_form_ai_flags_map_to_canonical_policy_signals(): void
    {
        $matrix = require __DIR__ . '/../../config/listing_policy.php';
        $service = new ListingPolicyMatrixService($matrix);

        foreach (['arma_de_fuego', 'armas de fuego', 'pistolas'] as $flag) {
            $assessment = $service->assessment([$flag]);
            $this->assertContains(
                'weapons_ammunition_explosives',
                $assessment['policy_ids'],
                'Expected canonical weapons match for: ' . $flag,
            );
            $this->assertTrue($assessment['requires_manual_review']);
        }
    }

    public function test_no_signal_is_never_promoted_into_an_authoritative_approval(): void
    {
        $matrix = require __DIR__ . '/../../config/listing_policy.php';
        $service = new ListingPolicyMatrixService($matrix);

        $assessment = $service->assessment([]);

        $this->assertSame([], $assessment['policy_ids']);
        $this->assertFalse($assessment['requires_manual_review']);
        $this->assertFalse($assessment['ai_may_auto_approve']);
        $this->assertNull($assessment['authoritative_action']);
    }
}

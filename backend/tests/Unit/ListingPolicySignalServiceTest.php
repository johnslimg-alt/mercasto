<?php

namespace Tests\Unit;

use App\Services\ListingPolicyMatrixService;
use App\Services\ListingPolicySignalService;
use PHPUnit\Framework\TestCase;

class ListingPolicySignalServiceTest extends TestCase
{
    private function service(): ListingPolicySignalService
    {
        $matrix = require __DIR__ . '/../../config/listing_policy.php';
        $terms = require __DIR__ . '/../../config/listing_policy_terms.php';

        return new ListingPolicySignalService(
            new ListingPolicyMatrixService($matrix),
            $terms,
        );
    }

    public function test_high_confidence_weapon_phrase_routes_to_shared_policy_id(): void
    {
        $assessment = $this->service()->assessListing([
            'title' => 'Pistola seminueva',
            'description' => 'Disponible para entrega local.',
        ]);

        $this->assertContains('weapons_ammunition_explosives', $assessment['policy_ids']);
        $this->assertTrue($assessment['requires_manual_review']);
        $this->assertTrue($assessment['prohibited_signal_present']);
        $this->assertNull($assessment['authoritative_action']);
    }

    public function test_plural_high_risk_terms_are_recognized(): void
    {
        foreach (['armas de fuego', 'firearms', 'explosives', 'grenades', 'pistolas'] as $term) {
            $assessment = $this->service()->assessListing([
                'title' => ucfirst($term) . ' seminuevas',
                'description' => 'Disponible para entrega local.',
            ]);

            $this->assertContains(
                'weapons_ammunition_explosives',
                $assessment['policy_ids'],
                'Expected policy match for: ' . $term,
            );
        }
    }

    public function test_benign_pistol_tool_contexts_are_not_flagged_as_weapons(): void
    {
        foreach (['Pistola de calor industrial', 'Pistola de silicón profesional', 'Pistola para pintar'] as $title) {
            $assessment = $this->service()->assessListing([
                'title' => $title,
                'description' => 'Herramienta usada en buen estado.',
            ]);

            $this->assertNotContains('weapons_ammunition_explosives', $assessment['policy_ids'], $title);
        }
    }

    public function test_benign_context_does_not_mask_a_separate_high_risk_match(): void
    {
        $assessment = $this->service()->assessListing([
            'title' => 'Pistola de calor y pistola 9mm',
            'description' => 'Se venden juntas para entrega local.',
        ]);

        $this->assertContains('weapons_ammunition_explosives', $assessment['policy_ids']);
        $this->assertTrue($assessment['requires_manual_review']);
        $this->assertNull($assessment['authoritative_action']);
    }

    public function test_html_tags_preserve_policy_phrase_boundaries(): void
    {
        foreach ([
            '<p>pistola</p><p>9mm</p>',
            'arma<br>de fuego',
        ] as $description) {
            $assessment = $this->service()->assessListing([
                'title' => 'Artículo en venta',
                'description' => $description,
            ]);

            $this->assertContains('weapons_ammunition_explosives', $assessment['policy_ids'], $description);
            $this->assertTrue($assessment['requires_manual_review']);
        }
    }

    public function test_normal_marketplace_copy_is_not_flagged(): void
    {
        $assessment = $this->service()->assessListing([
            'title' => 'Bicicleta urbana rodada 29',
            'description' => 'Usada en buen estado con factura y dos llantas nuevas.',
        ]);

        $this->assertSame([], $assessment['policy_ids']);
        $this->assertFalse($assessment['requires_manual_review']);
        $this->assertNull($assessment['authoritative_action']);
    }

    public function test_restricted_item_signal_routes_to_verification_without_auto_decision(): void
    {
        $assessment = $this->service()->assessListing([
            'title' => 'Pieza de marfil',
            'description' => 'Coleccion privada con documentos.',
        ]);

        $this->assertContains('regulated_wildlife', $assessment['policy_ids']);
        $this->assertTrue($assessment['verification_signal_present']);
        $this->assertTrue($assessment['human_authoritative']);
        $this->assertFalse($assessment['ai_may_auto_approve']);
        $this->assertFalse($assessment['ai_may_auto_reject']);
        $this->assertNull($assessment['authoritative_action']);
    }
}

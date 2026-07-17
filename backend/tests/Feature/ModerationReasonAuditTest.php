<?php

namespace Tests\Feature;

use App\Models\AdModerationDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationReasonAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_reason_and_confidence_are_cast_for_the_audit_log(): void
    {
        $decision = new AdModerationDecision([
            'reason' => 'Posible discrepancia entre texto y fotografía.',
            'confidence' => 0.875,
            'metadata' => ['flag' => 'mismatch'],
        ]);

        $this->assertSame('Posible discrepancia entre texto y fotografía.', $decision->reason);
        $this->assertSame(['flag' => 'mismatch'], $decision->metadata);
    }
}

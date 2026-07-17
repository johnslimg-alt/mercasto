<?php

namespace Tests\Feature;

use App\Models\Ad;
use Tests\TestCase;

class ModerationConfidenceCastTest extends TestCase
{
    public function test_confidence_uses_four_decimal_places(): void
    {
        $ad = new Ad(['ai_moderation_confidence' => 0.875]);
        $this->assertSame('0.8750', $ad->ai_moderation_confidence);
    }
}

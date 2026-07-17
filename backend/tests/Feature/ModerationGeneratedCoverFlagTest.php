<?php

namespace Tests\Feature;

use App\Models\Ad;
use Tests\TestCase;

class ModerationGeneratedCoverFlagTest extends TestCase
{
    public function test_generated_cover_is_boolean(): void
    {
        $ad = new Ad(['generated_cover' => 1]);
        $this->assertTrue($ad->generated_cover);
    }
}

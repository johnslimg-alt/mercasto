<?php

namespace Tests\Feature;

use App\Models\Ad;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Tests\TestCase;

class ModerationHistoryRelationshipTest extends TestCase
{
    public function test_ad_exposes_moderation_history(): void
    {
        $this->assertInstanceOf(HasMany::class, (new Ad())->moderationDecisions());
    }
}

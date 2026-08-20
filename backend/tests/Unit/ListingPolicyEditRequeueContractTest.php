<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingPolicyEditRequeueContractTest extends TestCase
{
    public function test_policy_matching_updates_invalidate_previous_approval_and_requeue(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertIsString($source);
        $this->assertStringContainsString("\$result['policy_review']['required']", $source);
        $this->assertStringContainsString("'status' => 'pending'", $source);
        $this->assertStringContainsString("'ai_moderation_status' => 'queued'", $source);
        $this->assertStringContainsString('ModerateAdWithAI::dispatch($ad->id, false)', $source);
        $this->assertStringContainsString("\$payload['moderation_status'] = 'queued'", $source);
        $this->assertStringContainsString("\$payload['ai_moderation_status'] = 'queued'", $source);
        $this->assertStringContainsString("\$payload['status'] = 'pending'", $source);
    }
}

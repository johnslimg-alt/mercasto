<?php

namespace Tests\Feature;

use Tests\TestCase;

class ModerationAdminAccessTest extends TestCase
{
    public function test_moderation_routes_require_authentication(): void
    {
        $this->getJson('/api/admin/moderation/ads')->assertUnauthorized();
    }
}

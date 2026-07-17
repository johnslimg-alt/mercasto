<?php

namespace Tests\Feature;

use App\Services\AdIllustrativeCoverService;
use Tests\TestCase;

class ModerationNoPhotoPolicyTest extends TestCase
{
    public function test_service_is_available_for_no_photo_ads(): void
    {
        $this->assertInstanceOf(AdIllustrativeCoverService::class, app(AdIllustrativeCoverService::class));
    }
}

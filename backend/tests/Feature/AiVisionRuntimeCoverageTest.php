<?php

namespace Tests\Feature;

use Tests\TestCase;

class AiVisionRuntimeCoverageTest extends TestCase
{
    public function test_post_merge_vision_prime_precedes_strict_probe_and_catalog_audits(): void
    {
        $workflow = file_get_contents(base_path('../.github/workflows/post-merge-production-verify.yml'));

        $this->assertIsString($workflow);
        $preload = strpos($workflow, 'php artisan ai:runtime-preload --timeout=90');
        $text = strpos($workflow, 'php artisan ai:runtime-check --timeout=45');
        $prime = strpos($workflow, 'php artisan ai:vision-runtime-check --timeout=120');
        $vision = strpos($workflow, 'php artisan ai:vision-runtime-check --timeout=60');
        $catalog = strpos($workflow, 'php artisan ads:ensure-catalog-coverage');

        $this->assertNotFalse($preload);
        $this->assertNotFalse($text);
        $this->assertNotFalse($prime);
        $this->assertNotFalse($vision);
        $this->assertNotFalse($catalog);
        $this->assertStringContainsString("Prime local AI vision path without user data\n        continue-on-error: true", $workflow);
        $this->assertLessThan($text, $preload);
        $this->assertLessThan($prime, $text);
        $this->assertLessThan($vision, $prime);
        $this->assertLessThan($catalog, $vision);
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class AiVisionRuntimeCoverageTest extends TestCase
{
    public function test_post_merge_vision_probe_allows_cold_vision_warmup_before_catalog_audits(): void
    {
        $workflow = file_get_contents(base_path('../.github/workflows/post-merge-production-verify.yml'));

        $this->assertIsString($workflow);
        $preload = strpos($workflow, 'php artisan ai:runtime-preload --timeout=90');
        $text = strpos($workflow, 'php artisan ai:runtime-check --timeout=45');
        $vision = strpos($workflow, 'php artisan ai:vision-runtime-check --timeout=120');
        $catalog = strpos($workflow, 'php artisan ads:ensure-catalog-coverage');

        $this->assertNotFalse($preload);
        $this->assertNotFalse($text);
        $this->assertNotFalse($vision);
        $this->assertNotFalse($catalog);
        $this->assertLessThan($text, $preload);
        $this->assertLessThan($vision, $text);
        $this->assertLessThan($catalog, $vision);
    }
}

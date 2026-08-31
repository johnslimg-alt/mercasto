<?php

namespace Tests\Feature;

use Tests\TestCase;

class AiRuntimePreloadCoverageTest extends TestCase
{
    public function test_scheduler_refreshes_model_before_keep_alive_can_expire(): void
    {
        $console = file_get_contents(base_path('routes/console.php'));

        $this->assertIsString($console);
        $this->assertStringContainsString("Schedule::command('ai:runtime-preload --timeout=90')", $console);
        $this->assertStringContainsString("->cron('17 */6 * * *')", $console);
        $this->assertStringContainsString('->withoutOverlapping(10)', $console);
    }

    public function test_post_merge_verifier_preloads_before_smoke_and_inference(): void
    {
        $workflow = file_get_contents(dirname(__DIR__, 3).'/.github/workflows/post-merge-production-verify.yml');

        $this->assertIsString($workflow);
        $preload = strpos($workflow, 'php artisan ai:runtime-preload --timeout=120');
        $smoke = strpos($workflow, 'npm run verify:quick');
        $readiness = strpos($workflow, 'php artisan ai:runtime-readiness');
        $inference = strpos($workflow, 'php artisan ai:runtime-check --timeout=45 --attempts=2');

        $this->assertNotFalse($preload);
        $this->assertNotFalse($smoke);
        $this->assertNotFalse($readiness);
        $this->assertNotFalse($inference);
        $this->assertLessThan($smoke, $preload);
        $this->assertLessThan($readiness, $smoke);
        $this->assertLessThan($inference, $readiness);
    }
}

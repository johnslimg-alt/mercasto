<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SemanticDiscoveryBenchmarkCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_benchmark_is_disabled_by_default_even_with_cli_confirmation(): void
    {
        config(['semantic_discovery.benchmark.enabled' => false]);

        $exit = Artisan::call('semantic:benchmark', ['--allow-production' => true]);

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('disabled', strtolower(Artisan::output()));
    }

    public function test_benchmark_refuses_non_postgresql_database(): void
    {
        config(['semantic_discovery.benchmark.enabled' => true]);

        $exit = Artisan::call('semantic:benchmark', ['--allow-production' => true]);

        $this->assertSame(1, $exit);
        $this->assertStringContainsString('requires postgresql', strtolower(Artisan::output()));
    }

    public function test_benchmark_source_is_read_only_and_never_prints_embedding_payload(): void
    {
        $source = file_get_contents(app_path('Console/Commands/SemanticDiscoveryBenchmark.php'));
        $this->assertIsString($source);
        $upper = strtoupper($source);

        $this->assertStringContainsString('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)', $source);
        $this->assertStringNotContainsString('DB::INSERT', $upper);
        $this->assertStringNotContainsString('DB::UPDATE', $upper);
        $this->assertStringNotContainsString('DB::DELETE', $upper);
        $this->assertStringNotContainsString('INSERT INTO ', $upper);
        $this->assertStringNotContainsString('UPDATE ADS ', $upper);
        $this->assertStringNotContainsString('DELETE FROM ', $upper);
        $this->assertStringNotContainsString("'embedding' =>", $source);
        $this->assertStringNotContainsString("'embedding_text' =>", $source);
        $this->assertStringContainsString("'shared_hit_blocks' => (int) (\$root['Shared Hit Blocks'] ?? 0)", $source);
        $this->assertStringContainsString("'shared_read_blocks' => (int) (\$root['Shared Read Blocks'] ?? 0)", $source);
    }
}

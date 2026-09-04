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
        $this->assertStringContainsString('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)', $source);
        $this->assertStringNotContainsString("DB::insert", $source);
        $this->assertStringNotContainsString("DB::update", $source);
        $this->assertStringNotContainsString("DB::delete", $this->withoutDescription($source));
        $this->assertStringNotContainsString("'embedding' =>", $source);
    }

    private function withoutDescription(string $source): string
    {
        return preg_replace('/protected \$description = .*?;/', '', $source) ?? $source;
    }
}

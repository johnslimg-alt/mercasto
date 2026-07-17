<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ModerationStatusSchemaDiagnosticTest extends TestCase
{
    use RefreshDatabase;

    public function test_prints_ad_status_constraint(): void
    {
        $schema = DB::selectOne("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'ads'");
        fwrite(STDERR, "\nADS_SCHEMA=" . ($schema->sql ?? 'missing') . "\n");
        $this->assertNotNull($schema);
    }
}

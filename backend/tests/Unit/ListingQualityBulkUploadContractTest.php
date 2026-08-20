<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityBulkUploadContractTest extends TestCase
{
    public function test_bulk_upload_is_covered_by_the_same_text_quality_gate_without_materializing_the_import(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertIsString($source);
        $this->assertStringContainsString("\$path === 'api/ads/bulk-upload'", $source);
        $this->assertStringContainsString('guardBulkUpload', $source);
        $this->assertStringContainsString("'title_too_short'", $source);
        $this->assertStringContainsString("'title_missing_letters'", $source);
        $this->assertStringContainsString("'description_too_short'", $source);
        $this->assertStringContainsString("'description_missing_letters'", $source);
        $this->assertStringContainsString("->lazyById(500, 'id')", $source);
        $this->assertStringNotContainsString("->get(['id', 'title', 'description', 'price', 'category'])", $source);
        $this->assertStringContainsString('DB::beginTransaction()', $source);
        $this->assertStringContainsString('DB::rollBack()', $source);
        $this->assertStringContainsString('DB::commit()', $source);
    }
}

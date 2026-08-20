<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ListingQualityBulkUploadContractTest extends TestCase
{
    public function test_bulk_upload_is_covered_by_the_same_missing_letter_gate(): void
    {
        $source = file_get_contents(__DIR__ . '/../../app/Http/Middleware/ApplyListingQualityPreflight.php');

        $this->assertIsString($source);
        $this->assertStringContainsString("\$path === 'api/ads/bulk-upload'", $source);
        $this->assertStringContainsString('guardBulkUpload', $source);
        $this->assertStringContainsString("'title_missing_letters'", $source);
        $this->assertStringContainsString("'description_missing_letters'", $source);
        $this->assertStringContainsString('DB::beginTransaction()', $source);
        $this->assertStringContainsString('DB::rollBack()', $source);
        $this->assertStringContainsString('DB::commit()', $source);
    }
}

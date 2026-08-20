<?php

namespace Tests\Unit;

use App\Services\ListingQualityPreflightService;
use PHPUnit\Framework\TestCase;

class ListingQualityPreflightTextQualityTest extends TestCase
{
    public function test_numeric_only_title_and_description_fail_hard_validation(): void
    {
        $result = (new ListingQualityPreflightService())->evaluate([
            'title' => '12345',
            'description' => '1234567890',
            'category' => 'servicios',
            'price' => 100,
            'photo_count' => 1,
        ]);

        $this->assertFalse($result['passes_hard_validation']);
        $this->assertContains('title_missing_letters', $result['errors']);
        $this->assertContains('description_missing_letters', $result['errors']);
    }

    public function test_mixed_letters_and_numbers_remain_valid(): void
    {
        $result = (new ListingQualityPreflightService())->evaluate([
            'title' => 'iPhone 15 Pro',
            'description' => 'Equipo 2026 en excelente estado',
            'category' => 'productos',
            'price' => 100,
            'photo_count' => 1,
        ]);

        $this->assertTrue($result['passes_hard_validation']);
        $this->assertNotContains('title_missing_letters', $result['errors']);
        $this->assertNotContains('description_missing_letters', $result['errors']);
    }

    public function test_unicode_letters_are_accepted_without_latin_only_assumptions(): void
    {
        $service = new ListingQualityPreflightService();

        foreach ([
            ['سيارة 2026', 'سيارة ممتازة بحالة جيدة للبيع'],
            ['宝马 X5 2026', '车辆状态良好可以正常使用出售'],
            ['Авто 2026', 'Автомобиль в отличном состоянии'],
        ] as [$title, $description]) {
            $result = $service->evaluate([
                'title' => $title,
                'description' => $description,
                'category' => 'autos',
                'price' => 100,
                'photo_count' => 1,
            ]);

            $this->assertTrue($result['passes_hard_validation'], $title);
            $this->assertNotContains('title_missing_letters', $result['errors']);
            $this->assertNotContains('description_missing_letters', $result['errors']);
        }
    }
}

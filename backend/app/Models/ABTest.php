<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ABTest extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_name',
        'variant',
        'variant_content',
        'views',
        'conversions',
        'conversion_rate',
        'status',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'variant_content' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'views' => 'integer',
        'conversions' => 'integer',
        'conversion_rate' => 'decimal:2',
    ];

    /**
     * Get active variant for a test (weighted random or winner)
     */
    public static function getVariant(string $testName): ?self
    {
        // Check if there's a winner
        $winner = self::where('test_name', $testName)
            ->where('status', 'winner')
            ->first();

        if ($winner) {
            return $winner;
        }

        // Get all active variants
        $variants = self::where('test_name', $testName)
            ->where('status', 'active')
            ->get();

        if ($variants->isEmpty()) {
            return null;
        }

        // Random selection (50/50 for 2 variants)
        return $variants->random();
    }

    /**
     * Record a view
     */
    public function recordView(): void
    {
        $this->increment('views');
        $this->updateConversionRate();
    }

    /**
     * Record a conversion
     */
    public function recordConversion(): void
    {
        $this->increment('conversions');
        $this->updateConversionRate();
    }

    /**
     * Update conversion rate
     */
    private function updateConversionRate(): void
    {
        if ($this->views > 0) {
            $this->conversion_rate = ($this->conversions / $this->views) * 100;
            $this->save();
        }
    }

    /**
     * Get test statistics
     */
    public static function getStats(string $testName): array
    {
        $variants = self::where('test_name', $testName)->get();
        
        return [
            'test_name' => $testName,
            'variants' => $variants->map(fn($v) => [
                'variant' => $v->variant,
                'views' => $v->views,
                'conversions' => $v->conversions,
                'conversion_rate' => round($v->conversion_rate, 2) . '%',
                'status' => $v->status,
            ]),
            'total_views' => $variants->sum('views'),
            'total_conversions' => $variants->sum('conversions'),
        ];
    }
}

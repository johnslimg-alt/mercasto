<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ABTest;
use Illuminate\Http\Request;

class ABTestController extends Controller
{
    /**
     * Get variant for a test
     */
    public function getVariant(string $testName)
    {
        $variant = ABTest::getVariant($testName);
        
        if (!$variant) {
            return response()->json([
                'error' => 'No active variants for this test'
            ], 404);
        }

        // Record view
        $variant->recordView();

        return response()->json([
            'variant' => $variant->variant,
            'content' => $variant->variant_content,
        ]);
    }

    /**
     * Record conversion
     */
    public function recordConversion(Request $request)
    {
        $request->validate([
            'test_name' => 'required|string',
            'variant' => 'required|string',
        ]);

        $variant = ABTest::where('test_name', $request->test_name)
            ->where('variant', $request->variant)
            ->first();

        if (!$variant) {
            return response()->json(['error' => 'Variant not found'], 404);
        }

        $variant->recordConversion();

        return response()->json(['success' => true]);
    }

    /**
     * Get test statistics
     */
    public function stats(string $testName)
    {
        return response()->json(ABTest::getStats($testName));
    }

    /**
     * Create or update variant
     */
    public function upsertVariant(Request $request)
    {
        $request->validate([
            'test_name' => 'required|string',
            'variant' => 'required|string',
            'content' => 'nullable|array',
            'status' => 'in:active,paused,winner,loser',
        ]);

        $variant = ABTest::updateOrCreate(
            [
                'test_name' => $request->test_name,
                'variant' => $request->variant,
            ],
            [
                'variant_content' => $request->content,
                'status' => $request->status ?? 'active',
                'started_at' => now(),
            ]
        );

        return response()->json($variant);
    }
}

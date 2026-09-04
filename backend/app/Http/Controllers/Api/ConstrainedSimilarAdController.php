<?php

namespace App\Http\Controllers\Api;

use App\Models\Ad;
use App\Services\AI\SimilarListingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConstrainedSimilarAdController extends AdController
{
    public function __construct(private SimilarListingService $similarListings)
    {
    }

    public function similar(Request $request, $id): JsonResponse
    {
        $source = Ad::query()->findOrFail($id);

        return response()->json($this->similarListings->find($source));
    }
}

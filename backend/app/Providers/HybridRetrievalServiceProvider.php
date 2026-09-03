<?php

namespace App\Providers;

use App\Http\Controllers\Api\HybridRecommendationController;
use App\Http\Controllers\Api\HybridSearchController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\ServiceProvider;

class HybridRetrievalServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SearchController::class, HybridSearchController::class);
        $this->app->bind(RecommendationController::class, HybridRecommendationController::class);
    }
}

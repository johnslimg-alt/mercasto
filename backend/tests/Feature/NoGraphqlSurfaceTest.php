<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class NoGraphqlSurfaceTest extends TestCase
{
    public function test_graphql_route_is_not_registered(): void
    {
        $uris = collect(Route::getRoutes())
            ->map(fn ($route) => ltrim($route->uri(), '/'))
            ->all();

        $this->assertNotContains('graphql', $uris);
    }
}

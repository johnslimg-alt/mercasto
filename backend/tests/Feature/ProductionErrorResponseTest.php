<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use RuntimeException;
use Tests\TestCase;

class ProductionErrorResponseTest extends TestCase
{
    public function test_unhandled_exception_hides_debug_details_when_debug_is_disabled(): void
    {
        config(['app.debug' => false]);

        Route::get('/api/__error-mode-test', function (): never {
            throw new RuntimeException(
                'SQLSTATE[HY000] secret diagnostic /var/www/mercasto/backend APP_KEY=do-not-leak'
            );
        });

        $response = $this->getJson('/api/__error-mode-test');

        $response->assertStatus(500);

        $body = $response->getContent();
        $this->assertIsString($body);
        $this->assertStringNotContainsString('SQLSTATE', $body);
        $this->assertStringNotContainsString('/var/www', $body);
        $this->assertStringNotContainsString('APP_KEY', $body);
        $this->assertStringNotContainsString('RuntimeException', $body);
        $this->assertStringNotContainsString('stack', strtolower($body));
    }
}

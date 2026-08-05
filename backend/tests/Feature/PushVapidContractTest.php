<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushVapidContractTest extends TestCase
{
    use RefreshDatabase;
    public function test_public_key_endpoint_is_unavailable_when_vapid_is_not_configured(): void
    {
        config([
            'services.webpush.vapid_public_key' => null,
            'services.webpush.vapid_private_key' => null,
        ]);

        $this->getJson('/api/push/vapid-key')
            ->assertStatus(503)
            ->assertJsonMissingPath('publicKey')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_public_key_endpoint_returns_only_the_public_key_without_caching(): void
    {
        config([
            'services.webpush.vapid_public_key' => 'test-public-vapid-key',
            'services.webpush.vapid_private_key' => 'test-private-vapid-key',
        ]);

        $this->getJson('/api/push/vapid-key')
            ->assertOk()
            ->assertExactJson(['publicKey' => 'test-public-vapid-key'])
            ->assertHeader('Cache-Control', 'no-store, private');
    }
}

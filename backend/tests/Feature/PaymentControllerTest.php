<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_fails_closed_when_clip_credentials_are_missing()
    {
        Config::set('services.clip.api_key', null);
        Config::set('services.clip.api_secret', null);

        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/payment/clip', [
            'amount' => 99,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
        ]);

        $response->assertStatus(503)->assertJson(['success' => false]);
        $this->assertDatabaseMissing('payments', ['user_id' => $user->id]);
    }

    public function test_checkout_request_enables_card_and_oxxo_cash_payment_methods()
    {
        Config::set('services.clip.api_key', 'test_key');
        Config::set('services.clip.api_secret', 'test_secret');

        Http::fake([
            'api.payclip.com/*' => Http::response([
                'payment_request_url' => 'https://checkout.payclip.com/abc123',
                'payment_request_id' => 'req_abc123',
            ], 200),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/payment/clip', [
            'amount' => 99,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
        ]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        // La UI promete "Paga con tarjeta o efectivo en OXXO" — Clip solo habilita OXXO
        // si se envía explícitamente 'cash' en custom_payment_options.payment_method_types.
        Http::assertSent(function ($request) {
            $types = $request->data()['custom_payment_options']['payment_method_types'] ?? [];

            return $request->url() === 'https://api.payclip.com/v2/checkout'
                && in_array('cash', $types, true)
                && in_array('debit', $types, true)
                && in_array('credit', $types, true);
        });
    }
}

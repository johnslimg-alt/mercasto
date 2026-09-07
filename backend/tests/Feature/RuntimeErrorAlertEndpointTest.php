<?php

namespace Tests\Feature;

use App\Mail\RuntimeErrorAlertMail;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RuntimeErrorAlertEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();

        config([
            'services.runtime_errors.alert_token' => str_repeat('t', 48),
            'services.runtime_errors.admin_email' => 'ops@example.test',
        ]);
        Mail::fake();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'friendly_id' => 'BACKEND-1',
            'project_name' => 'Backend Production',
            'calculated_type' => 'RuntimeException',
            'alert_reason' => 'NEW',
            'stored_event_count' => 1,
            'url' => 'https://mercasto.com/ops/errors/issues/1/',
            'calculated_value' => 'RAW-SECRET-MUST-NOT-BE-EMAILED',
        ], $overrides);
    }

    public function test_it_rejects_missing_or_wrong_token(): void
    {
        $this->postJson('/api/internal/runtime-alerts', $this->payload())
            ->assertForbidden();

        $this->postJson('/api/internal/runtime-alerts?token=wrong', $this->payload())
            ->assertForbidden();

        Mail::assertNothingSent();
    }

    public function test_it_sends_only_sanitized_runtime_alert_fields(): void
    {
        $response = $this->postJson(
            '/api/internal/runtime-alerts?token='.str_repeat('t', 48),
            $this->payload(),
        );

        $response->assertStatus(202)->assertJson(['ok' => true]);

        Mail::assertSent(RuntimeErrorAlertMail::class, function (RuntimeErrorAlertMail $mail): bool {
            return $mail->hasTo('ops@example.test')
                && $mail->friendlyId === 'BACKEND-1'
                && $mail->errorType === 'RuntimeException'
                && ! str_contains($mail->render(), 'RAW-SECRET-MUST-NOT-BE-EMAILED');
        });
    }

    public function test_it_rejects_non_local_issue_urls(): void
    {
        $this->postJson(
            '/api/internal/runtime-alerts?token='.str_repeat('t', 48),
            $this->payload(['url' => 'https://example.test/ops/errors/issues/1/']),
        )->assertStatus(422);

        $this->postJson(
            '/api/internal/runtime-alerts?token='.str_repeat('t', 48),
            $this->payload(['url' => 'http://mercasto.com/ops/errors/issues/1/']),
        )->assertStatus(422);

        Mail::assertNothingSent();
    }

    public function test_it_fails_closed_without_admin_recipient(): void
    {
        config(['services.runtime_errors.admin_email' => '']);

        $this->postJson(
            '/api/internal/runtime-alerts?token='.str_repeat('t', 48),
            $this->payload(),
        )->assertStatus(503);

        Mail::assertNothingSent();
    }
}

<?php

namespace Tests\Feature;

use App\Mail\SupportRequestMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SupportRequestIntakeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function payload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'QA User',
            'email' => 'qa@example.test',
            'subject' => 'Problema técnico',
            'message' => 'Necesito ayuda con un problema técnico en mi cuenta.',
        ], $overrides);
    }

    public function test_public_contact_creates_durable_case_and_returns_safe_acknowledgement(): void
    {
        $response = $this->postJson('/api/contact', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('status', 'received')
            ->assertJsonPath('follow_up', 'email')
            ->assertJsonMissingPath('id')
            ->assertJsonMissingPath('email')
            ->assertJsonMissingPath('message')
            ->assertJsonMissingPath('queue')
            ->assertJsonMissingPath('ip_hash');

        $reference = (string) $response->json('reference');
        $this->assertMatchesRegularExpression('/^MCS-\d{6}-[A-Z0-9]{8}$/', $reference);

        $this->assertDatabaseHas('support_requests', [
            'reference' => $reference,
            'email' => 'qa@example.test',
            'subject' => 'Problema técnico',
            'queue' => 'support',
            'status' => 'received',
        ]);

        Mail::assertQueued(SupportRequestMail::class, function (SupportRequestMail $mail) use ($reference) {
            return $mail->reference === $reference
                && $mail->queueName === 'support'
                && $mail->hasTo('soporte@mercasto.com');
        });
    }

    public function test_listing_report_routes_to_moderation_queue_without_exposing_queue(): void
    {
        $response = $this->postJson('/api/contact', $this->payload([
            'subject' => 'Reporte de anuncio',
            'message' => 'Quiero reportar un anuncio que parece infringir las reglas.',
        ]));

        $response->assertCreated()
            ->assertJsonPath('status', 'received')
            ->assertJsonMissingPath('queue');

        $this->assertDatabaseHas('support_requests', [
            'reference' => $response->json('reference'),
            'queue' => 'moderation',
            'status' => 'received',
        ]);
    }

    public function test_suggestion_routes_to_product_queue(): void
    {
        $response = $this->postJson('/api/contact', $this->payload([
            'subject' => 'Sugerencia',
            'message' => 'Tengo una sugerencia para mejorar la publicación de anuncios.',
        ]));

        $response->assertCreated();
        $this->assertDatabaseHas('support_requests', [
            'reference' => $response->json('reference'),
            'queue' => 'product',
        ]);
    }

    public function test_invalid_subject_preserves_validation_and_does_not_create_case(): void
    {
        $response = $this->postJson('/api/contact', $this->payload([
            'subject' => 'Billing override',
        ]));

        $response->assertUnprocessable()->assertJsonValidationErrors(['subject']);
        $this->assertDatabaseCount('support_requests', 0);
        Mail::assertNothingQueued();
    }

    public function test_short_message_preserves_validation_and_does_not_create_case(): void
    {
        $response = $this->postJson('/api/contact', $this->payload([
            'message' => 'corto',
        ]));

        $response->assertUnprocessable()->assertJsonValidationErrors(['message']);
        $this->assertDatabaseCount('support_requests', 0);
    }

    public function test_each_submission_gets_a_distinct_reference(): void
    {
        $first = $this->postJson('/api/contact', $this->payload())->assertCreated();
        $second = $this->postJson('/api/contact', $this->payload([
            'email' => 'qa2@example.test',
            'message' => 'Segundo caso válido para comprobar referencias distintas.',
        ]))->assertCreated();

        $this->assertNotSame($first->json('reference'), $second->json('reference'));
        $this->assertDatabaseCount('support_requests', 2);
    }
}

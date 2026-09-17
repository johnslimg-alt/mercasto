<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\ConsentProofRetention;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Psr\Log\LoggerInterface;
use Tests\TestCase;

/**
 * EG-04 / EG-05 — data-subject rights (LFPDPPP / ARCO) regression suite.
 *
 * Covers: consent proof surviving erasure, erasure still working end-to-end and being
 * idempotent, the server-side export being strictly self-scoped, secret-free, rate
 * limited and audit logged.
 */
class DataSubjectRightsTest extends TestCase
{
    use RefreshDatabase;

    private function consent(User $user, string $type = 'privacy', string $version = '2026-08-03'): void
    {
        DB::table('user_consents')->insert([
            'user_id' => $user->id,
            'consent_type' => $type,
            'document_version' => $version,
            'accepted_at' => now(),
            'source' => 'api',
            'ip_hash' => str_repeat('a', 64),
            'user_agent_hash' => str_repeat('b', 64),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function payment(User $user, string $checkoutId, string $description): void
    {
        DB::table('payments')->insert([
            'user_id' => $user->id,
            'clip_checkout_id' => $checkoutId,
            'amount' => 199.00,
            'description' => $description,
            'status' => 'paid',
            'webhook_payload' => json_encode(['card_canary' => 'CARD-CANARY-4242']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function ad(User $user, string $title): Ad
    {
        return Ad::create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'desc',
            'price' => 100,
            'location' => 'CDMX',
            'category' => 'general',
            'condition' => 'used',
            'status' => 'active',
            'is_catalog_filler' => false,
        ]);
    }

    // ---------------------------------------------------------------------
    // EG-04 — erasure must not destroy the consent proof
    // ---------------------------------------------------------------------

    public function test_account_deletion_preserves_demonstrable_consent_while_removing_personal_data(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $user = User::factory()->create([
            'password' => 'Correct-password-2026',
            'kyc_document_url' => 'kyc_documents/canary.pdf',
        ]);
        $other = User::factory()->create();

        $this->consent($user, 'privacy', '2026-08-03');
        $this->consent($user, 'terms', '2026-08-03');
        $this->payment($user, 'CHK-1', 'A-PAY');
        $ad = $this->ad($user, 'A-AD');

        $conversation = Conversation::create([
            'ad_id' => $ad->id,
            'buyer_id' => $user->id,
            'seller_id' => $other->id,
        ]);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'receiver_id' => $other->id,
            'content' => 'A-MSG',
        ]);

        $userId = $user->id;

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/user', ['password' => 'Correct-password-2026'])
            ->assertOk();

        // (a) Personal data is actually gone, as the privacy notice promises.
        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertDatabaseMissing('messages', ['sender_id' => $userId]);
        $this->assertDatabaseMissing('conversations', ['buyer_id' => $userId]);
        $this->assertDatabaseMissing('ads', ['user_id' => $userId]);

        // (b) The proof that consent was obtained survives, unlinked from the person.
        $this->assertDatabaseCount('user_consents', 2);

        foreach (['privacy', 'terms'] as $type) {
            $this->assertDatabaseHas('user_consents', [
                'consent_type' => $type,
                'document_version' => '2026-08-03',
                'user_id' => null,
                'subject_ref' => ConsentProofRetention::subjectRef($userId),
                'retention_basis' => ConsentProofRetention::BASIS_SELF_DELETION,
            ]);
        }

        $retained = DB::table('user_consents')->where('consent_type', 'privacy')->first();
        $this->assertNotNull($retained->retained_at);
        $this->assertNotNull($retained->retention_expires_at);
        $this->assertSame(
            now()->addMonths(ConsentProofRetention::RETENTION_MONTHS)->format('Y-m'),
            \Illuminate\Support\Carbon::parse($retained->retention_expires_at)->format('Y-m'),
        );

        // (c) The pseudonym is not a reversible/derivable id and is not the raw user id.
        $this->assertSame(64, strlen($retained->subject_ref));
        $this->assertNotSame((string) $userId, $retained->subject_ref);
        $this->assertNotSame(hash('sha256', (string) $userId), $retained->subject_ref);

        // (d) Financial retention still behaves as before.
        $this->assertDatabaseHas('payments', ['description' => 'A-PAY', 'user_id' => null]);
    }

    public function test_account_deletion_revokes_tokens_and_is_idempotent(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $user = User::factory()->create(['password' => 'Correct-password-2026']);
        $this->consent($user);
        $token = $user->createToken('device')->plainTextToken;
        $userId = $user->id;

        $headers = ['Authorization' => 'Bearer '.$token];

        $this->withHeaders($headers)
            ->deleteJson('/api/user', ['password' => 'Correct-password-2026'])
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertDatabaseCount('user_consents', 1);

        // Revocation is real: force the guard to re-resolve from the (now deleted) token.
        $this->app['auth']->forgetGuards();

        $this->withHeaders($headers)
            ->deleteJson('/api/user', ['password' => 'Correct-password-2026'])
            ->assertStatus(401);

        $this->assertDatabaseMissing('users', ['id' => $userId]);
        $this->assertDatabaseCount('user_consents', 1);

        // Repeating the pseudonymisation itself is a no-op, never a duplicate or an error.
        $this->assertSame(0, ConsentProofRetention::pseudonymiseForDeletedUser(
            $userId,
            ConsentProofRetention::BASIS_SELF_DELETION,
        ));
        $this->assertDatabaseCount('user_consents', 1);
    }

    public function test_admin_deletion_also_preserves_consent_proof(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create();
        $this->consent($target, 'privacy');
        $targetId = $target->id;

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/users/'.$targetId)
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $targetId]);
        $this->assertDatabaseHas('user_consents', [
            'user_id' => null,
            'subject_ref' => ConsentProofRetention::subjectRef($targetId),
            'retention_basis' => ConsentProofRetention::BASIS_ADMIN_DELETION,
        ]);
    }

    public function test_purge_command_removes_only_expired_pseudonymised_proofs(): void
    {
        $expired = User::factory()->create();
        $live = User::factory()->create();

        $this->consent($expired, 'privacy');
        DB::table('user_consents')->update([
            'user_id' => null,
            'subject_ref' => ConsentProofRetention::subjectRef($expired->id),
            'retention_basis' => ConsentProofRetention::BASIS_SELF_DELETION,
            'retained_at' => now()->subMonths(61),
            'retention_expires_at' => now()->subDay(),
        ]);
        $this->consent($live, 'privacy');

        $this->artisan('data-rights:purge-consent-proofs --dry-run')
            ->expectsOutputToContain('1 pseudonymised consent proof(s) are past retention')
            ->assertSuccessful();

        // Dry run reports without deleting.
        $this->assertDatabaseCount('user_consents', 2);

        $this->artisan('data-rights:purge-consent-proofs')->assertSuccessful();

        $this->assertDatabaseCount('user_consents', 1);
        $this->assertDatabaseHas('user_consents', ['user_id' => $live->id]);
    }

    // ---------------------------------------------------------------------
    // EG-05 — server-side export
    // ---------------------------------------------------------------------

    public function test_export_and_deletion_require_authentication(): void
    {
        $this->getJson('/api/user/data-export')->assertStatus(401);
        $this->deleteJson('/api/user')->assertStatus(401);
    }

    public function test_export_returns_the_callers_data_in_a_portable_document(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create(['name' => 'Partner Name']);
        $this->consent($user);
        $this->payment($user, 'CHK-A', 'A-PAY');
        $ad = $this->ad($user, 'A-AD');

        $conversation = Conversation::create([
            'ad_id' => $ad->id,
            'buyer_id' => $user->id,
            'seller_id' => $partner->id,
        ]);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'receiver_id' => $partner->id,
            'content' => 'A-MSG-TO-B',
        ]);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $partner->id,
            'receiver_id' => $user->id,
            'content' => 'B-MSG-TO-A',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/data-export')->assertOk();

        $body = $response->json('export');

        $this->assertSame('mercasto.data-subject-export', $body['format']);
        $this->assertSame($user->id, $body['subject']['user_id']);
        $this->assertSame($user->email, $body['subject']['email']);
        $this->assertNotEmpty($body['legal_basis']);

        $this->assertSame($user->email, $body['sections']['account']['record']['email']);
        $this->assertSame('A-AD', $body['sections']['ads']['items'][0]['title']);
        $this->assertSame('A-PAY', $body['sections']['payments']['items'][0]['description']);
        $this->assertSame('privacy', $body['sections']['consents']['items'][0]['consent_type']);
        $this->assertSame($conversation->id, $body['sections']['conversations']['items'][0]['id']);

        $messages = collect($body['sections']['messages']['items'])->keyBy('content');
        $this->assertSame('outbound', $messages['A-MSG-TO-B']['direction']);
        $this->assertSame('inbound', $messages['B-MSG-TO-A']['direction']);
        $this->assertSame('Partner Name', $messages['B-MSG-TO-A']['counterparty_name']);

        // Machine-readable download, never cached by an intermediary.
        $response->assertHeader('Content-Disposition', 'attachment; filename="mercasto-personal-data-'.$user->id.'.json"');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_export_never_returns_another_users_data_even_when_parameters_ask_for_it(): void
    {
        $caller = User::factory()->create();
        $stranger = User::factory()->create(['email' => 'stranger-canary@example.test', 'name' => 'Stranger Canary']);
        $partner = User::factory()->create();

        $this->consent($stranger);
        $this->payment($stranger, 'CHK-C', 'C-PAY');
        $strangerAd = $this->ad($stranger, 'C-AD');

        $strangerConversation = Conversation::create([
            'ad_id' => $strangerAd->id,
            'buyer_id' => $stranger->id,
            'seller_id' => $partner->id,
        ]);
        Message::create([
            'conversation_id' => $strangerConversation->id,
            'sender_id' => $stranger->id,
            'receiver_id' => $partner->id,
            'content' => 'C-PRIVATE-MSG',
        ]);

        $callerWithData = User::factory()->create();
        $this->consent($callerWithData);
        $this->ad($callerWithData, 'A-AD');

        foreach ([$caller, $callerWithData] as $index => $actor) {
            $this->flushSession();

            // IDOR attempt: no query parameter may widen the scope beyond the token owner.
            $response = $this->actingAs($actor, 'sanctum')
                ->getJson('/api/user/data-export?user_id='.$stranger->id.'&id='.$stranger->id.'&subject='.$stranger->id)
                ->assertOk();

            $raw = $response->getContent();

            $this->assertStringNotContainsString('stranger-canary@example.test', $raw);
            $this->assertStringNotContainsString('Stranger Canary', $raw);
            $this->assertStringNotContainsString('C-AD', $raw);
            $this->assertStringNotContainsString('C-PAY', $raw);
            $this->assertStringNotContainsString('C-PRIVATE-MSG', $raw);

            $this->assertSame($actor->id, $response->json('export.subject.user_id'));
            $this->assertSame($actor->email, $response->json('export.subject.email'));
        }

        // There is no parameterised variant of the endpoint to attack in the first place.
        $this->actingAs($caller, 'sanctum')
            ->getJson('/api/users/'.$stranger->id.'/data-export')
            ->assertNotFound();
    }

    public function test_export_excludes_secrets_tokens_and_provider_payloads(): void
    {
        $user = User::factory()->create([
            'password' => 'Correct-password-2026',
            'kyc_document_url' => 'kyc_documents/SECRET-PATH-canary.pdf',
        ]);
        $user->forceFill([
            'remember_token' => 'REMEMBER-TOKEN-CANARY-abc123',
            'business_csf_url' => 'business-csf/SECRET-CSF-canary.pdf',
        ])->save();

        $token = $user->createToken('device')->plainTextToken;
        $this->consent($user);
        $this->payment($user, 'CHK-CANARY-999', 'A-PAY');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/data-export')->assertOk();
        $raw = $response->getContent();

        foreach ([
            $user->password,
            'REMEMBER-TOKEN-CANARY-abc123',
            'SECRET-PATH-canary.pdf',
            'SECRET-CSF-canary.pdf',
            'CARD-CANARY-4242',
            'CHK-CANARY-999',
            $token,
            'personal_access_tokens',
        ] as $canary) {
            $this->assertStringNotContainsString($canary, $raw, 'Export leaked: '.$canary);
        }

        $account = $response->json('export.sections.account.record');
        foreach (['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
            'email_verification_token', 'phone_otp', 'phone_otp_hash', 'kyc_document_url',
            'business_csf_url', 'pending_email'] as $forbidden) {
            $this->assertArrayNotHasKey($forbidden, $account);
        }

        $payment = $response->json('export.sections.payments.items.0');
        foreach (['webhook_payload', 'clip_checkout_response', 'clip_checkout_id',
            'clip_payment_request_id', 'clip_payment_request_url'] as $forbidden) {
            $this->assertArrayNotHasKey($forbidden, $payment);
        }

        // The subject is told, in the document, what was withheld and why.
        $this->assertArrayHasKey('credentials', $response->json('export.excluded'));
        $this->assertArrayHasKey('provider_payloads', $response->json('export.excluded'));
    }

    public function test_export_is_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $this->actingAs($user, 'sanctum')->getJson('/api/user/data-export')->assertOk();
        }

        $this->actingAs($user, 'sanctum')->getJson('/api/user/data-export')->assertStatus(429);
    }

    public function test_export_is_audit_logged(): void
    {
        $user = User::factory()->create();
        $logger = Mockery::spy(LoggerInterface::class);

        \Illuminate\Support\Facades\Log::spy();
        \Illuminate\Support\Facades\Log::shouldReceive('channel')->with('security')->andReturn($logger);

        $this->actingAs($user, 'sanctum')->getJson('/api/user/data-export')->assertOk();

        $logger->shouldHaveReceived('info')->with(
            'data_subject_export',
            Mockery::on(fn ($context): bool => ($context['event'] ?? null) === 'data_subject_export'
                && (int) ($context['subject_id'] ?? 0) === $user->id
                && isset($context['record_counts'])
                && ! array_key_exists('email', $context)),
        )->once();
    }

    public function test_deletion_is_audit_logged(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $user = User::factory()->create(['password' => 'Correct-password-2026']);
        $this->consent($user);
        $userId = $user->id;
        $logger = Mockery::spy(LoggerInterface::class);

        \Illuminate\Support\Facades\Log::spy();
        \Illuminate\Support\Facades\Log::shouldReceive('channel')->with('security')->andReturn($logger);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/user', ['password' => 'Correct-password-2026'])
            ->assertOk();

        $logger->shouldHaveReceived('info')->with(
            'account_erasure_completed',
            Mockery::on(fn ($context): bool => ($context['event'] ?? null) === 'account_erasure_completed'
                && (int) ($context['subject_id'] ?? 0) === $userId
                && (int) ($context['retained_consent_proofs'] ?? 0) === 1),
        )->once();
    }
}

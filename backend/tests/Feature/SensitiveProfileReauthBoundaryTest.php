<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SensitiveProfileReauthBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_passwordless_social_account_requires_recent_real_token_for_email_change(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'password' => null,
            'google_id' => 'reauth-boundary-user',
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/user/email/request', ['new_email' => 'new@example.test'])
            ->assertForbidden()
            ->assertJsonPath('code', 'reauthentication_required');

        $this->assertNull($user->fresh()->pending_email);
        Mail::assertNothingSent();
    }
}

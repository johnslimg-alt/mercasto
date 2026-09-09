<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\EmailIdentity;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailIdentityIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_rejects_case_variant_of_existing_email(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'Mixed.Case@example.com']);

        $this->postJson('/api/register', [
            'name' => 'Case Variant',
            'email' => 'mixed.case@example.com',
            'password' => 'Password123!',
            ...$this->registrationConsent(),
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame(1, User::query()->whereRaw('LOWER(email) = ?', ['mixed.case@example.com'])->count());
    }


    public function test_registration_normalizes_email_and_login_is_case_insensitive(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Normalized User',
            'email' => 'Mixed.New@Example.com',
            'password' => 'Password123!',
            ...$this->registrationConsent(),
        ])->assertCreated()->assertJsonPath('user.email', 'mixed.new@example.com');

        $this->assertDatabaseHas('users', ['email' => 'mixed.new@example.com']);

        $this->postJson('/api/login', [
            'email' => 'MIXED.NEW@EXAMPLE.COM',
            'password' => 'Password123!',
        ])->assertOk()->assertJsonPath('user.email', 'mixed.new@example.com');
    }

    public function test_legacy_ambiguous_identity_requires_exact_historical_spelling_for_login(): void
    {
        User::factory()->create([
            'email' => 'legacy.login@example.com',
            'password' => Hash::make('Owner-password-2026'),
        ]);
        DB::table('users')->insert($this->rawUser(
            'Legacy.Login@example.com',
            true,
            Hash::make('Legacy-password-2026')
        ));

        $this->postJson('/api/login', [
            'email' => 'LEGACY.LOGIN@EXAMPLE.COM',
            'password' => 'Legacy-password-2026',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/login', [
            'email' => 'Legacy.Login@example.com',
            'password' => 'Legacy-password-2026',
        ])->assertOk()->assertJsonPath('user.email', 'Legacy.Login@example.com');
    }

    public function test_profile_email_change_rejects_case_variant_of_another_account(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'Target.User@example.com']);
        $actor = User::factory()->create([
            'email' => 'actor@example.com',
            'password' => Hash::make('Correct-password-2026'),
        ]);
        Sanctum::actingAs($actor);

        $this->postJson('/api/user/email/request', [
            'new_email' => 'target.user@example.com',
            'password' => 'Correct-password-2026',
        ])->assertUnprocessable()->assertJsonValidationErrors('new_email');

        $this->assertNull($actor->fresh()->pending_email);
    }

    public function test_database_unique_index_blocks_direct_case_variant_insert(): void
    {
        User::factory()->create(['email' => 'Db.Guard@example.com']);

        $this->expectException(QueryException::class);
        DB::table('users')->insert($this->rawUser('db.guard@example.com'));
    }

    public function test_legacy_duplicate_is_promoted_when_identity_owner_is_deleted(): void
    {
        $winner = User::factory()->create(['email' => 'legacy@example.com']);
        $loserId = DB::table('users')->insertGetId($this->rawUser('Legacy@example.com', true));

        $this->assertCount(2, EmailIdentity::matches('LEGACY@example.com'));
        DB::table('users')->where('id', $winner->id)->delete();

        $this->assertFalse((bool) DB::table('users')->where('id', $loserId)->value('email_case_legacy_exempt'));

        $this->expectException(QueryException::class);
        DB::table('users')->insert($this->rawUser('LEGACY@example.com'));
    }

    public function test_legacy_duplicate_leaves_exemption_after_changing_email(): void
    {
        User::factory()->create(['email' => 'shared@example.com']);
        $loserId = DB::table('users')->insertGetId($this->rawUser('Shared@example.com', true));

        DB::table('users')->where('id', $loserId)->update(['email' => 'Unique.Mixed@example.com']);

        $stored = DB::table('users')->where('id', $loserId)->first();
        $this->assertSame('Unique.Mixed@example.com', $stored->email);
        $this->assertFalse((bool) $stored->email_case_legacy_exempt);
    }

    /** @return array<string, mixed> */
    private function rawUser(string $email, bool $legacyExempt = false, ?string $password = null): array
    {
        return [
            ...User::factory()->raw([
                'email' => $email,
                ...($password !== null ? ['password' => $password] : []),
            ]),
            'email_case_legacy_exempt' => $legacyExempt,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /** @return array<string, mixed> */
    private function registrationConsent(): array
    {
        return [
            'age_confirmed' => true,
            'terms_version' => config('legal.registration_consent.terms_version'),
            'privacy_version' => config('legal.registration_consent.privacy_version'),
            'consent_accepted_at' => now()->toIso8601String(),
            'consent_source' => 'api',
        ];
    }
}

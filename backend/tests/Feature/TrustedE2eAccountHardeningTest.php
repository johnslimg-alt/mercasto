<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use App\Support\TrustedE2eAccount;
use Illuminate\Cache\RateLimiting\Unlimited;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TrustedE2eAccountHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.trusted_e2e_accounts', [
            'seller' => ['email' => 'seller_e2e@mercasto.com', 'role' => 'individual'],
            'admin' => ['email' => 'admin_e2e@mercasto.com', 'role' => 'admin'],
        ]);
    }

    public function test_only_exact_configured_e2e_accounts_are_trusted(): void
    {
        $seller = User::factory()->make(['email' => 'seller_e2e@mercasto.com', 'role' => 'individual']);
        $admin = User::factory()->make(['email' => 'admin_e2e@mercasto.com', 'role' => 'admin']);
        $prefixAttacker = User::factory()->make(['email' => 'e2e_attacker@example.com', 'role' => 'individual']);
        $suffixAttacker = User::factory()->make(['email' => 'attacker_e2e@example.com', 'role' => 'individual']);
        $wrongRole = User::factory()->make(['email' => 'seller_e2e@mercasto.com', 'role' => 'admin']);

        $this->assertTrue(TrustedE2eAccount::matches($seller));
        $this->assertTrue(TrustedE2eAccount::matches($admin));
        $this->assertFalse(TrustedE2eAccount::matches($prefixAttacker));
        $this->assertFalse(TrustedE2eAccount::matches($suffixAttacker));
        $this->assertFalse(TrustedE2eAccount::matches($wrongRole));
        $this->assertFalse(TrustedE2eAccount::matches(null));
    }

    public function test_wildcard_e2e_emails_do_not_get_named_rate_limiter_exemptions(): void
    {
        $trusted = User::factory()->make(['id' => 91, 'email' => 'seller_e2e@mercasto.com', 'role' => 'individual']);
        $attacker = User::factory()->make(['id' => 92, 'email' => 'e2e_attacker@example.com', 'role' => 'individual']);

        foreach (['api', 'ads', 'ad-mutations', 'uploads', 'profile-uploads', 'identity-uploads', 'search'] as $name) {
            $limiter = RateLimiter::limiter($name);
            $this->assertNotNull($limiter, "named limiter {$name} must exist");

            $trustedResult = $limiter($this->requestFor($trusted));
            $this->assertInstanceOf(Unlimited::class, $trustedResult, "trusted E2E account should remain unlimited for {$name}");

            $attackerResult = $limiter($this->requestFor($attacker));
            $limits = is_array($attackerResult) ? $attackerResult : [$attackerResult];
            $this->assertNotEmpty($limits, "ordinary account must retain limits for {$name}");
            foreach ($limits as $limit) {
                $this->assertNotInstanceOf(Unlimited::class, $limit, "wildcard E2E-like email must not bypass {$name}");
            }
        }
    }

    public function test_wildcard_e2e_email_cannot_bypass_monthly_ad_limit_but_trusted_seller_can(): void
    {
        Storage::fake('public');
        Queue::fake();
        Http::fake();

        Category::create([
            'slug' => 'e2e-limit-test',
            'name' => ['es' => 'Prueba E2E', 'en' => 'E2E Test'],
            'icon' => 'Shield',
        ]);

        $attacker = User::factory()->create([
            'email' => 'e2e_attacker@example.com',
            'role' => 'individual',
            'plan_code' => 'package_free',
        ]);
        $trusted = User::factory()->create([
            'email' => 'seller_e2e@mercasto.com',
            'role' => 'individual',
            'plan_code' => 'package_free',
        ]);

        $this->seedMonthlyAds($attacker, 3);
        $this->seedMonthlyAds($trusted, 3);

        $this->actingAs($attacker, 'sanctum')
            ->postJson('/api/ads', $this->validAdPayload('Bloqueado por límite'))
            ->assertForbidden()
            ->assertJsonFragment(['message' => 'Has alcanzado el límite de 3 anuncios mensuales de tu plan. Actualiza tu plan para publicar más.']);

        $this->actingAs($trusted, 'sanctum')
            ->postJson('/api/ads', $this->validAdPayload('E2E permitido'))
            ->assertCreated()
            ->assertJsonFragment(['title' => 'E2E permitido']);
    }

    public function test_wildcard_email_checks_are_absent_from_runtime_bypass_sources(): void
    {
        foreach ([
            app_path('Providers/AppServiceProvider.php'),
            app_path('Http/Controllers/Api/AdController.php'),
        ] as $path) {
            $source = file_get_contents($path);
            $this->assertIsString($source);
            $this->assertStringNotContainsString("str_starts_with(\$user->email, 'e2e_')", $source);
            $this->assertStringNotContainsString("str_contains(\$user->email, '_e2e@')", $source);
        }
    }

    private function requestFor(User $user): Request
    {
        $request = Request::create('/api/test', 'GET', server: ['REMOTE_ADDR' => '203.0.113.10']);
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    private function seedMonthlyAds(User $user, int $count): void
    {
        Ad::withoutEvents(function () use ($user, $count): void {
            foreach (range(1, $count) as $index) {
                Ad::query()->create([
                    'user_id' => $user->id,
                    'title' => "Existing {$index}",
                    'description' => 'Existing listing for monthly limit regression.',
                    'price' => 100 + $index,
                    'location' => 'Boca del Río',
                    'city' => 'Boca del Río',
                    'state' => 'Veracruz',
                    'category' => 'e2e-limit-test',
                    'subcategory' => 'General',
                    'condition' => 'usado',
                    'attributes' => ['subcategory' => 'General'],
                    'status' => 'active',
                ]);
            }
        });
    }

    private function validAdPayload(string $title): array
    {
        return [
            'title' => $title,
            'price' => 1200,
            'description' => 'Regression listing for trusted E2E bypass hardening.',
            'location' => 'Boca del Río, Veracruz',
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'e2e-limit-test',
            'subcategory' => 'General',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'General'],
        ];
    }
}

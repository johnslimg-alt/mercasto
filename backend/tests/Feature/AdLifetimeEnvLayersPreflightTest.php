<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * The activation preflight must not let an operator activate ads on a lifetime they did not
 * choose. This deployment has TWO env layers — the persistent file the operator edits and the
 * ephemeral runtime copy the application actually reads — and act on a lifetime that neither
 * layer nor the cached configuration agrees on:
 *
 *   - edit the persistent file, forget the runtime refresh, rebuild the cache  -> the OLD value is baked;
 *   - refresh the runtime copy, forget `config:cache`                          -> the CACHED value is still used.
 *
 * Every test below drives the real command against real files on disk, so the assertions are
 * about what the operator sees for a given on-disk state, not about the presence of a string.
 */
class AdLifetimeEnvLayersPreflightTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    private string $persistentEnv;

    private string $runtimeEnv;

    protected function setUp(): void
    {
        parent::setUp();

        $this->root = sys_get_temp_dir().'/mercasto-env-layers-'.bin2hex(random_bytes(6));
        $runtimeDir = $this->root.'/run';
        mkdir($runtimeDir, 0700, true);

        $this->persistentEnv = $this->root.'/.env';
        $this->runtimeEnv = $runtimeDir.'/.env';

        // Point the application at the temp "runtime copy" and the trait at the temp
        // "persistent file", i.e. at the same two layers production has.
        $this->app->useEnvironmentPath($runtimeDir);
        putenv('MERCASTO_PERSISTENT_ENV_FILE='.$this->persistentEnv);
        $_SERVER['MERCASTO_PERSISTENT_ENV_FILE'] = $this->persistentEnv;

        $this->assertSame($this->runtimeEnv, app()->environmentFilePath(), 'The runtime layer must be the temp file.');
    }

    protected function tearDown(): void
    {
        putenv('MERCASTO_PERSISTENT_ENV_FILE');
        unset($_SERVER['MERCASTO_PERSISTENT_ENV_FILE']);
        $this->removeDirectory($this->root);

        parent::tearDown();
    }

    private function removeDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $full = $path.'/'.$entry;
            is_dir($full) ? $this->removeDirectory($full) : @unlink($full);
        }

        @rmdir($path);
    }

    private function writePersistent(?int $days): void
    {
        file_put_contents($this->persistentEnv, $days === null
            ? "APP_NAME=Mercasto\n"
            : "APP_NAME=Mercasto\nAD_LIFETIME_DAYS={$days}\n");
    }

    private function writeRuntime(?int $days): void
    {
        file_put_contents($this->runtimeEnv, $days === null
            ? "APP_NAME=Mercasto\n"
            : "APP_NAME=Mercasto\nAD_LIFETIME_DAYS={$days}\n");
    }

    /**
     * Run the real command and return its output, asserting it never fails.
     *
     * A warning must never become a gate: the operator runs this under time pressure and a
     * blocked command is worse than a warning, so every case here also asserts exit success.
     */
    private function runPreflight(): string
    {
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility'), 'The preflight must never fail the command.');

        return Artisan::output();
    }

    private function collapsed(string $output): string
    {
        return (string) preg_replace('/\s+/', ' ', $output);
    }

    // ---------------------------------------------------------------------
    // Negative controls: the states that must NOT warn
    // ---------------------------------------------------------------------

    public function test_no_warning_when_both_layers_are_unset_and_the_default_is_used(): void
    {
        $this->writePersistent(null);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 7]);

        $output = $this->runPreflight();

        $this->assertStringContainsString('ad_lifetime_days : 7 day(s)', $output);
        $this->assertStringNotContainsString('WARNING', $output, 'A consistent default must not be reported as a desync.');
    }

    public function test_no_warning_when_both_layers_and_the_cache_agree_on_a_non_default_value(): void
    {
        // The control for the control: a warning that fires on every run would pass the test
        // above while being useless. This is the state an operator reaches after doing the
        // three steps correctly, and it must stay silent.
        $this->writePersistent(90);
        $this->writeRuntime(90);
        config(['marketplace.ad_lifetime_days' => 90]);

        $output = $this->runPreflight();

        $this->assertStringContainsString('ad_lifetime_days : 90 day(s)', $output);
        $this->assertStringNotContainsString('WARNING', $output, 'A fully refreshed and rebuilt 90-day setup must not warn.');
    }

    // ---------------------------------------------------------------------
    // The two desync states the fix exists for
    // ---------------------------------------------------------------------

    public function test_warns_when_the_persistent_file_was_edited_but_the_runtime_copy_was_not_refreshed(): void
    {
        // The expensive mistake: the operator set 90 in the persistent file, the application
        // still reads a stale runtime copy, and config:cache would bake the old 7.
        $this->writePersistent(90);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 7]);

        $output = $this->runPreflight();
        $text = $this->collapsed($output);

        $this->assertStringContainsString('WARNING', $output);
        $this->assertStringContainsString('the env layers disagree', $text);
        $this->assertStringContainsString($this->persistentEnv.' -> AD_LIFETIME_DAYS=90 day(s)', $text);
        $this->assertStringContainsString($this->runtimeEnv.' -> AD_LIFETIME_DAYS=not set', $text);
        // The invented scenario is only a trap if config:cache would bake the stale value.
        $this->assertStringContainsString('would bake 7 day(s)', $text);
    }

    public function test_warns_when_the_runtime_copy_was_refreshed_but_the_cache_was_not_rebuilt(): void
    {
        // The mirror image: both files say 90, the resolved value is still the cached 7.
        $this->writePersistent(90);
        $this->writeRuntime(90);
        config(['marketplace.ad_lifetime_days' => 7]);

        $output = $this->runPreflight();
        $text = $this->collapsed($output);

        $this->assertStringContainsString('WARNING', $output);
        $this->assertStringContainsString('the cached configuration is stale', $text);
        $this->assertStringContainsString('would bake 90 day(s)', $text);
    }

    public function test_warns_when_the_persistent_file_defines_the_variable_and_the_runtime_copy_does_not(): void
    {
        // Same trap caught one step later, and reported even though the resolved value happens
        // to match the persistent file: the next config:cache would silently drop it.
        $this->writePersistent(90);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 90]);

        $output = $this->runPreflight();

        $this->assertStringContainsString('WARNING', $output);
        $this->assertStringContainsString('the env layers disagree', $this->collapsed($output));
    }

    // ---------------------------------------------------------------------
    // The deliverable itself: the remedy the operator reads
    // ---------------------------------------------------------------------

    public function test_remedy_names_both_env_layers_the_refresh_and_the_verification_step(): void
    {
        $this->writePersistent(null);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 7]);

        $text = $this->collapsed($this->runPreflight());

        // Every step a bare "set AD_LIFETIME_DAYS and run config:cache" hint omits.
        $this->assertStringContainsString('/var/www/mercasto/backend/.env on the host', $text);
        $this->assertStringContainsString('the container mounts the same file as /var/www/.env', $text);
        $this->assertStringContainsString('refresh the runtime copy', $text);
        $this->assertStringContainsString('/var/www/docker/refresh-runtime-env.sh', $text);
        $this->assertStringContainsString('a redeploy also refreshes it', $text);
        $this->assertStringContainsString('php artisan config:cache', $text);
        $this->assertStringContainsString('confirm the ad_lifetime_days line above', $text);
        // The consequence of skipping the refresh, stated rather than implied.
        $this->assertStringContainsString('Skipping the refresh bakes the OLD value', $text);
        // The one-shot property the line exists to protect is still stated.
        $this->assertStringContainsString('re-running the command does not extend it', $text);
    }

    public function test_preflight_still_reports_the_lifetime_and_writes_nothing_while_warning(): void
    {
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio aprobado oculto',
            'description' => 'Descripción',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'status' => 'archived',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => null,
            'is_catalog_filler' => false,
            'attributes' => ['subcategory' => 'general'],
        ]));

        $this->writePersistent(90);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 7]);

        $output = $this->runPreflight();

        // The warning is additive: the rest of the preflight and the plan are still printed.
        $this->assertStringContainsString('PREFLIGHT', $output);
        $this->assertStringContainsString('WARNING', $output);
        $this->assertStringContainsString('expires_at', $output);
        $this->assertStringContainsString('Matched 1 ad(s) to reconcile.', $output);

        // And the warning is not a gate that wrote anything.
        $this->assertSame('archived', $ad->fresh()->status);
        $this->assertNull($ad->fresh()->expires_at);
    }

    public function test_second_command_in_the_runbook_reports_the_same_desync(): void
    {
        // The trait is shared, so the sweep that runs BEFORE activation must warn too: an
        // operator who only reads the first command's output must not miss the desync.
        $this->writePersistent(90);
        $this->writeRuntime(null);
        config(['marketplace.ad_lifetime_days' => 7]);

        $this->assertSame(0, Artisan::call('ads:resolve-duplicate-submissions'));
        $output = Artisan::output();

        $this->assertStringContainsString('WARNING', $output);
        $this->assertStringContainsString('the env layers disagree', $this->collapsed($output));
        $this->assertStringContainsString('refresh the runtime copy', $this->collapsed($output));
    }
}

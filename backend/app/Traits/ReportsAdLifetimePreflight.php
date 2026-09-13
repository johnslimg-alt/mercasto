<?php

namespace App\Traits;

use App\Models\Ad;
use Carbon\Carbon;

/**
 * Preflight report shared by the two commands in the operator's activation runbook:
 * `ads:resolve-duplicate-submissions`, then `ads:reconcile-moderation-visibility`.
 *
 * Why it exists: `ads:reconcile-moderation-visibility --apply` makes approved-but-hidden
 * ads public and stamps ONE lifetime on each of them — `Ad::freshExpiry()`, i.e. now plus
 * `marketplace.ad_lifetime_days` (env `AD_LIFETIME_DAYS`, code default 7 days). The
 * activation itself is one-shot as an action: the predicate requires status = 'archived'
 * and activation writes status = 'active', so a second run selects none of the rows it
 * just activated, and no command restores the archived state or the granted lifetime. An
 * operator who applies the command before deciding the lifetime therefore buys exactly one
 * lifetime of visibility with no way back, and neither command used to say so at the moment
 * of action.
 *
 * The report is deliberately additive output on stdout: that is the stream every other line
 * of these commands already uses, and the one captured by an operator's redirect, tee or
 * pasted log (an stderr-only warning would be missing from exactly the record the operator
 * keeps). It is printed before any write, and in dry-run as well as with --apply.
 */
trait ReportsAdLifetimePreflight
{
    /**
     * The literal fallback of config/marketplace.php (`env('AD_LIFETIME_DAYS', 7)`).
     *
     * It is declared here only to label WHERE the resolved value came from, so the operator
     * knows which knob to turn. The value that governs the write is always
     * Ad::lifetimeDays(), the same helper every publishing path uses.
     */
    private const CONFIG_DEFAULT_LIFETIME_DAYS = 7;

    /**
     * Defaults mirrored from docker/refresh-runtime-env.sh, which copies the persistent env
     * to the ephemeral path the application actually reads. They are duplicated here only to
     * name the two files in the warning below; the refresh script remains their owner.
     */
    private const DEFAULT_PERSISTENT_ENV_FILE = '/var/www/.env';

    /**
     * Provenance of the resolved lifetime.
     *
     * `env()` is not authoritative once the configuration is cached: Laravel skips loading
     * .env when bootstrap/cache/config.php exists, so a value that was cached from .env is
     * invisible to this process while config('marketplace.ad_lifetime_days') still holds it.
     * The value is therefore classified by comparing the resolved number against the code
     * default and by asking whether a config cache is in effect, never by trusting env()
     * alone — a wrong provenance label would be a false statement in an operator warning.
     */
    protected function adLifetimeSource(): string
    {
        $days = Ad::lifetimeDays();
        $env = env('AD_LIFETIME_DAYS');

        if (is_scalar($env) && trim((string) $env) !== '') {
            $fromEnv = max(1, (int) $env);

            return $fromEnv === $days
                ? sprintf('AD_LIFETIME_DAYS=%s', trim((string) $env))
                : sprintf(
                    'AD_LIFETIME_DAYS=%s in this process, but the resolved value is %d day(s): a cached configuration is in effect',
                    trim((string) $env),
                    $days
                );
        }

        if ($days === self::CONFIG_DEFAULT_LIFETIME_DAYS) {
            return sprintf(
                'code default in config/marketplace.php (%d day(s); AD_LIFETIME_DAYS is not set)',
                self::CONFIG_DEFAULT_LIFETIME_DAYS
            );
        }

        if (app()->configurationIsCached()) {
            return sprintf(
                'AD_LIFETIME_DAYS via the cached configuration (%d day(s)); the variable itself is not visible to this process',
                $days
            );
        }

        return sprintf(
            'a runtime override of config/marketplace.ad_lifetime_days (%d day(s)); AD_LIFETIME_DAYS is not set in this process',
            $days
        );
    }

    /**
     * The two env layers this deployment actually has, and the value each of them carries.
     *
     * The persistent file is the operator's source of truth; the runtime copy is what the
     * application reads (`bootstrap/app.php` points the environment path at it, and
     * docker/refresh-runtime-env.sh regenerates it from the persistent file on every deploy).
     * An operator who edits the persistent file and rebuilds the config cache WITHOUT
     * refreshing the runtime copy bakes the old value while believing they set the new one,
     * which is the precise mistake an irreversible activation must not make.
     *
     * Both values are read from the files themselves, not from `env()`: once the configuration
     * is cached, Laravel never loads either file, so `env('AD_LIFETIME_DAYS')` is null in
     * exactly the state that needs diagnosing and cannot be used to diagnose it.
     *
     * Never throws: an unreadable file yields null, which simply disables the check.
     *
     * @return array{runtime_path: string, runtime_value: ?string, persistent_path: string, persistent_value: ?string, resolved_days: int}
     */
    protected function adLifetimeEnvLayers(): array
    {
        $runtimePath = (string) app()->environmentFilePath();
        $persistentPath = $this->persistentEnvFilePath();

        return [
            'runtime_path' => $runtimePath,
            'runtime_value' => $this->envFileValue($runtimePath, 'AD_LIFETIME_DAYS'),
            'persistent_path' => $persistentPath,
            'persistent_value' => $this->envFileValue($persistentPath, 'AD_LIFETIME_DAYS'),
            'resolved_days' => Ad::lifetimeDays(),
        ];
    }

    /**
     * The value the two env layers disagree about, or null when they are consistent.
     *
     * Two independent inconsistencies are reported, because both silently bake a lifetime the
     * operator did not choose and neither is visible in the resolved value alone:
     *   - the layers disagree with each other (one file set, the other stale or unset), which is
     *     the state left behind by editing the persistent file without refreshing the copy;
     *   - both files agree but the resolved value differs, which is the state left behind by
     *     refreshing the copy without rebuilding the cache.
     *
     * @return list<string>|null Human-readable warning lines, or null when there is nothing to warn about.
     */
    protected function adLifetimeDesyncWarning(): ?array
    {
        $layers = $this->adLifetimeEnvLayers();

        $runtime = $this->normalizedLifetime($layers['runtime_value']);
        $persistent = $this->normalizedLifetime($layers['persistent_value']);
        $resolved = $layers['resolved_days'];

        $layersDisagree = $runtime !== $persistent;

        // What a `config:cache` run would read: the runtime copy whenever that file exists,
        // because that is the file bootstrap/app.php points the environment at — falling back
        // to the persistent file only when there is no readable runtime copy at all. A key
        // missing from a readable runtime copy resolves to the code default, NOT to whatever
        // the persistent file says, which is exactly how the stale-copy trap stays invisible.
        $runtimeIsReadable = is_readable($layers['runtime_path']);
        $readPath = $runtimeIsReadable ? $layers['runtime_path'] : $layers['persistent_path'];
        $readValue = $runtimeIsReadable ? $runtime : $persistent;
        $wouldBake = $readValue ?? self::CONFIG_DEFAULT_LIFETIME_DAYS;

        $cacheIsStale = $resolved !== $wouldBake;

        if (! $layersDisagree && ! $cacheIsStale) {
            return null;
        }

        $display = fn (?int $days): string => $days === null ? 'not set' : sprintf('%d day(s)', $days);
        $subject = match (true) {
            $layersDisagree && $cacheIsStale => 'the env layers disagree and the cached configuration is stale',
            $layersDisagree => 'the env layers disagree',
            default => 'the cached configuration is stale',
        };

        $lines = [
            sprintf('WARNING — %s, so the lifetime above may not be the one you set.', $subject),
            sprintf('    persistent : %s -> AD_LIFETIME_DAYS=%s', $layers['persistent_path'], $display($persistent)),
        ];

        if ($layers['runtime_path'] !== $layers['persistent_path']) {
            $lines[] = sprintf('    runtime    : %s -> AD_LIFETIME_DAYS=%s (the file the application reads)', $layers['runtime_path'], $display($runtime));
        } else {
            $lines[] = '    runtime    : none - no separate runtime copy is readable, so the persistent file is read directly';
        }

        $lines[] = sprintf(
            '    resolved   : %d day(s) now%s; a config:cache run now would bake %d day(s) from %s',
            $resolved,
            $resolved === $wouldBake ? '' : ' (from the cached configuration)',
            $wouldBake,
            $readPath
        );
        $lines[] = '    Refresh the runtime copy, rebuild the cache and re-run this dry run before applying.';
        $lines[] = '    See the change lifetime line above. Warning only: this command still runs.';

        return $lines;
    }

    /**
     * The persistent env file the refresh script copies from.
     *
     * Read through getenv()/$_SERVER rather than env(): this runs with the configuration
     * cached, where env() no longer sees the dotenv files, and a diagnostic must not go blind
     * in the state it exists to diagnose. Absent an override, the refresh script's own default.
     */
    private function persistentEnvFilePath(): string
    {
        $configured = getenv('MERCASTO_PERSISTENT_ENV_FILE');
        if (! is_string($configured) || $configured === '') {
            $configured = $_SERVER['MERCASTO_PERSISTENT_ENV_FILE'] ?? '';
        }

        return is_string($configured) && $configured !== ''
            ? $configured
            : self::DEFAULT_PERSISTENT_ENV_FILE;
    }

    /**
     * The value of one key in one .env file, or null when the file is unreadable or the key is
     * absent or empty. Deliberately mirrors the little that matters from dotenv parsing: an
     * optional `export`, optional surrounding quotes, and a trailing ` # comment`.
     */
    private function envFileValue(string $path, string $key): ?string
    {
        if (! is_readable($path)) {
            return null;
        }

        $contents = @file_get_contents($path);
        if (! is_string($contents)) {
            return null;
        }

        if (! preg_match('/^[ \t]*(?:export[ \t]+)?'.preg_quote($key, '/').'[ \t]*=[ \t]*(.*)$/m', $contents, $matches)) {
            return null;
        }

        $value = trim($matches[1]);

        if (preg_match('/^(["\'])(.*)\1$/s', $value, $quoted)) {
            $value = $quoted[2];
        } else {
            $value = trim((string) preg_replace('/[ \t]+#.*$/', '', $value));
        }

        return $value === '' ? null : $value;
    }

    /**
     * A file value collapsed to the number the application would use, so that `090`, ` 90 `
     * and `"90"` all compare equal. Null stays null: "not set" is a distinct state from "set to
     * the default", and one of the two layers being unset while the other is set is exactly the
     * desync worth reporting.
     */
    private function normalizedLifetime(?string $value): ?int
    {
        return $value === null ? null : max(1, (int) $value);
    }

    /**
     * The expiry the activation will stamp on each row it publishes.
     *
     * The exact same helper the command writes with, called at the same point in the run,
     * so the printed date is the date the rows receive (each row is stamped at its own
     * update time, a few seconds after the preflight).
     */
    protected function activationExpiry(): Carbon
    {
        return Ad::freshExpiry();
    }

    /**
     * Print the preflight block.
     *
     * MUST be called before any write of the command that uses it, and in dry-run mode too.
     *
     * @param  array<string, string>  $notes  Label => paragraph, written for the operator
     *                                        under time pressure: what this run will change,
     *                                        what it can never undo, which rows survive.
     *                                        Wrapped at a fixed width so the block renders
     *                                        identically in a terminal and in a pasted log.
     */
    protected function printActivationPreflight(array $notes = []): void
    {
        $this->newLine();
        $this->line('PREFLIGHT — activation lifetime and reversibility (no write has happened yet)');
        $this->line(sprintf('  ad_lifetime_days : %d day(s)', Ad::lifetimeDays()));
        $this->line(sprintf('  source           : %s', $this->adLifetimeSource()));
        $this->line(sprintf(
            '  expires_at       : %s (now + %d day(s); each activated row is stamped at its own update time)',
            $this->activationExpiry()->format('Y-m-d H:i:s T'),
            Ad::lifetimeDays()
        ));

        $lines = [
            'change lifetime' => implode("\n", [
                'edit the persistent env: /var/www/mercasto/backend/.env on the host',
                '(the container mounts the same file as /var/www/.env),',
                'then refresh the runtime copy the application reads: docker exec mercasto_backend_container',
                '/var/www/docker/refresh-runtime-env.sh (a redeploy also refreshes it),',
                'then rebuild the cache (php artisan config:cache), then re-run this dry run and confirm',
                'the ad_lifetime_days line above. Skipping the refresh bakes the OLD value: the lifetime is',
                'granted once, at activation, and re-running the command does not extend it.',
            ]),
        ] + $notes;

        // Above the notes: a desync contradicts the numbers printed just above it, and the
        // operator must meet the contradiction before reading what the run is about to change.
        foreach ($this->adLifetimeDesyncWarning() ?? [] as $warningLine) {
            $this->warn($warningLine);
        }

        foreach ($lines as $label => $paragraph) {
            foreach (explode("\n", wordwrap($paragraph, 100, "\n", false)) as $index => $line) {
                $this->line($index === 0
                    ? sprintf('  %-16s : %s', $label, $line)
                    : sprintf('  %-16s   %s', '', $line));
            }
        }

        $this->newLine();
    }
}

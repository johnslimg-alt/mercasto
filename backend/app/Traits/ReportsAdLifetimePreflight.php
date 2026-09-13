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
            'change lifetime' => 'set AD_LIFETIME_DAYS and rebuild the config cache (php artisan config:cache) before applying; the lifetime is granted once, at activation, and re-running the command does not extend it.',
        ] + $notes;

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

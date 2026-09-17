<?php

namespace App\Console\Commands;

use App\Support\ConsentProofRetention;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * EG-04 — enforce the documented retention window on pseudonymised consent proofs.
 *
 * Consent evidence kept after an account deletion is only defensible if it is actually
 * discarded once the records it justifies can no longer be audited. This command is the
 * enforceable half of that promise.
 */
class PurgeExpiredConsentProofs extends Command
{
    protected $signature = 'data-rights:purge-consent-proofs {--dry-run : Report what would be purged without deleting}';

    protected $description = 'Purge pseudonymised consent proofs whose LFPDPPP retention window has expired';

    public function handle(): int
    {
        if ($this->option('dry-run')) {
            $count = Schema::hasTable('user_consents')
                && Schema::hasColumn('user_consents', 'retention_expires_at')
                ? DB::table('user_consents')
                    ->whereNull('user_id')
                    ->whereNotNull('retention_expires_at')
                    ->where('retention_expires_at', '<=', now())
                    ->count()
                : 0;

            $this->info("Dry run: {$count} pseudonymised consent proof(s) are past retention.");

            return self::SUCCESS;
        }

        $purged = ConsentProofRetention::purgeExpired();

        $this->info("Purged {$purged} expired pseudonymised consent proof(s).");

        Log::channel('security')->info('consent_proof_purged', [
            'event' => 'consent_proof_purged',
            'purged' => $purged,
        ]);

        return self::SUCCESS;
    }
}

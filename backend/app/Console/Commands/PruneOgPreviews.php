<?php

namespace App\Console\Commands;

use App\Services\OgPreviewComposer;
use Illuminate\Console\Command;

/**
 * Keeps the on-demand social preview cache bounded.
 *
 * Generation itself is already bounded on the write path (OgPreviewComposer
 * prunes as soon as the directory passes og.cache.max_files). This command is
 * the scheduled sweep that also enforces the TTL on a quiet directory, so
 * previews for listings that stopped being shared still get cleaned up.
 *
 * Suggested schedule: daily.
 */
class PruneOgPreviews extends Command
{
    protected $signature = 'og:prune-previews';

    protected $description = 'Delete expired or over-cap cached 1200x630 social preview images';

    public function handle(OgPreviewComposer $composer): int
    {
        $deleted = $composer->pruneCache();

        $this->info("Pruned {$deleted} cached social preview(s).");

        return self::SUCCESS;
    }
}

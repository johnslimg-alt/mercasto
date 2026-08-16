<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class FixAdImages extends Command
{
    protected $signature = 'mercasto:fix-images';
    protected $description = 'Disabled legacy command that previously replaced listing images globally.';

    public function handle(): int
    {
        $this->error('This legacy image rewrite is disabled because it can replace genuine seller media and create repeated stock imagery.');
        $this->line('Use ads:audit-active-content-quality for a read-only report and repair only verified editorial records through a reviewed migration.');

        return self::FAILURE;
    }
}

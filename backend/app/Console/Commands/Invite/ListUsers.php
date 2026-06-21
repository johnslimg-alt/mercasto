<?php

namespace App\Console\Commands\Invite;

use Illuminate\Console\Command;
use App\Models\InviteWhitelist;

class ListUsers extends Command
{
    protected $signature = 'invite:list';
    protected $description = 'List all whitelisted emails';

    public function handle()
    {
        $whitelist = InviteWhitelist::orderBy('created_at', 'desc')->get();

        if ($whitelist->isEmpty()) {
            $this->info('No whitelisted emails');
            return 0;
        }

        $this->info("Whitelisted emails ({$whitelist->count()}):");
        $this->table(
            ['Email', 'Invite Code', 'Status', 'Created'],
            $whitelist->map(fn($w) => [
                $w->email,
                $w->invite_code,
                $w->status,
                $w->created_at->format('Y-m-d H:i'),
            ])
        );

        return 0;
    }
}

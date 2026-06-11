<?php

namespace App\Console\Commands\Invite;

use Illuminate\Console\Command;
use App\Models\InviteWhitelist;
use App\Models\WaitlistEmail;

class AddUser extends Command
{
    protected $signature = 'invite:add {email : The email to whitelist}';
    protected $description = 'Add an email to the invite whitelist';

    public function handle()
    {
        $email = strtolower(trim($this->argument('email')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email format');
            return 1;
        }

        $existing = InviteWhitelist::where('email', $email)->first();
        if ($existing) {
            $this->warn("Email already whitelisted. Invite code: {$existing->invite_code}");
            return 0;
        }

        $whitelist = InviteWhitelist::create([
            'email' => $email,
            'status' => 'active',
        ]);

        WaitlistEmail::where('email', $email)->update([
            'invited_at' => now(),
        ]);

        $this->info("Added {$email} to whitelist");
        $this->info("Invite code: {$whitelist->invite_code}");
        $this->info("Invite URL: https://mercasto.com/?invite={$whitelist->invite_code}");

        return 0;
    }
}

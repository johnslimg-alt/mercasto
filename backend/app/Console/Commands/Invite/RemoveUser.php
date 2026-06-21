<?php

namespace App\Console\Commands\Invite;

use Illuminate\Console\Command;
use App\Models\InviteWhitelist;

class RemoveUser extends Command
{
    protected $signature = 'invite:remove {email : The email to remove from whitelist}';
    protected $description = 'Remove an email from the invite whitelist';

    public function handle()
    {
        $email = strtolower(trim($this->argument('email')));

        $whitelist = InviteWhitelist::where('email', $email)->first();
        
        if (!$whitelist) {
            $this->error("Email not found in whitelist");
            return 1;
        }

        $whitelist->delete();

        $this->info("Removed {$email} from whitelist");

        return 0;
    }
}

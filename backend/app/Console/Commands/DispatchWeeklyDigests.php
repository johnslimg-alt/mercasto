<?php

namespace App\Console\Commands;

use App\Jobs\SendWeeklyDigestJob;
use App\Models\User;
use Illuminate\Console\Command;

class DispatchWeeklyDigests extends Command
{
    protected $signature = 'digest:weekly';

    protected $description = 'Dispatch weekly ad digest emails to all active verified users';

    public function handle(): int
    {
        $query = User::query()
            ->whereNotNull('email_verified_at')
            ->where('email_notifications', true);

        $total = $query->count();

        if ($total === 0) {
            $this->info('No eligible users found. Nothing dispatched.');
            return self::SUCCESS;
        }

        $this->info("Dispatching weekly digest jobs for {$total} users…");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $dispatched = 0;
        $query->chunkById(200, function ($users) use ($bar, &$dispatched) {
            foreach ($users as $user) {
                dispatch(new SendWeeklyDigestJob($user));
                $dispatched++;
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("✅ Dispatched {$dispatched} digest jobs to the queue.");

        return self::SUCCESS;
    }
}

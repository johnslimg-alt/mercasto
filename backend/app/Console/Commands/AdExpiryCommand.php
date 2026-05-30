<?php

namespace App\Console\Commands;

use App\Services\AdExpiryService;
use Illuminate\Console\Command;

class AdExpiryCommand extends Command
{
    protected $signature   = 'ads:process-expiry';
    protected $description = 'Expire overdue ads and send expiry reminder notifications';

    public function handle(AdExpiryService $service): int
    {
        $expired   = $service->expireOldAds();
        $reminders = $service->sendExpiryReminders();

        $this->info("{$expired} ads expired, {$reminders} reminders sent.");

        return self::SUCCESS;
    }
}

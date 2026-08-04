<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingPayments extends Command
{
    protected $signature = 'payments:expire-pending
                            {--hours=24 : Pending payment lifetime in hours}
                            {--limit=500 : Maximum payments to expire per run}';

    protected $description = 'Expire stale pending payments that have no webhook confirmation';

    public function handle(): int
    {
        $hours = max(1, (int) $this->option('hours'));
        $limit = max(1, min(5000, (int) $this->option('limit')));
        $cutoff = now()->subHours($hours);

        $ids = DB::table('payments')
            ->where('status', 'pending')
            ->whereNull('webhook_payload')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');

        if ($ids->isEmpty()) {
            $this->info('Expired 0 stale pending payment(s).');
            return self::SUCCESS;
        }

        $expired = DB::table('payments')
            ->whereIn('id', $ids)
            ->where('status', 'pending')
            ->whereNull('webhook_payload')
            ->update([
                'status' => 'expired',
                'clip_payment_request_url' => null,
                'updated_at' => now(),
            ]);

        $this->info("Expired {$expired} stale pending payment(s).");

        return self::SUCCESS;
    }
}

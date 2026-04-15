<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ArchiveOldAds extends Command
{
    /**
     * Имя и сигнатура консольной команды.
     *
     * @var string
     */
    protected $signature = 'ads:archive-old';

    /**
     * Описание команды.
     *
     * @var string
     */
    protected $description = 'Archiva automáticamente los anuncios activos que tienen más de 30 días';

    public function handle()
    {
        $dateLimit = Carbon::now()->subDays(30);

        $count = Ad::where('status', 'active')
            ->where('created_at', '<', $dateLimit)
            ->update(['status' => 'archived']);

        $message = "Se han archivado {$count} anuncios antiguos (más de 30 días).";
        
        $this->info($message);
        Log::info("Auto-Archive Job: " . $message);
    }
}
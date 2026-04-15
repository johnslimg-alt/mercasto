<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class BackupDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Realiza un backup automático de la base de datos MySQL y lo guarda en storage/app/backups';

    public function handle()
    {
        $filename = "backup-" . Carbon::now()->format('Y-m-d_H-i-s') . ".sql";
        $folder = storage_path("app/backups");
        
        if (!file_exists($folder)) {
            mkdir($folder, 0755, true);
        }
        
        $path = $folder . "/" . $filename;

        $command = sprintf(
            'mysqldump --user="%s" --password="%s" --host="%s" --port="%s" "%s" > "%s"',
            config('database.connections.mysql.username'),
            config('database.connections.mysql.password'),
            config('database.connections.mysql.host'),
            config('database.connections.mysql.port'),
            config('database.connections.mysql.database'),
            $path
        );

        $returnVar = NULL;
        $output  = NULL;
        exec($command, $output, $returnVar);

        if ($returnVar === 0) {
            $this->info("Backup de base de datos creado exitosamente: {$filename}");
            Log::info("DB Backup successfully created at: {$path}");
        } else {
            $this->error("Fallo al crear el backup. Código de error: {$returnVar}");
            Log::error("DB Backup failed with error code: {$returnVar}");
        }
    }
}
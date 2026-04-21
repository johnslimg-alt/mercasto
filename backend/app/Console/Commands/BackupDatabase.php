<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup';
    protected $description = 'Create a MySQL dump and upload it to AWS S3';

    public function handle()
    {
        $filename = 'mercasto-backup-' . now()->format('Y-m-d-H-i-s') . '.sql';
        $path = storage_path('app/' . $filename);

        $this->info("Generating database dump...");

        $process = new Process([
            'mysqldump',
            '-u', env('DB_USERNAME', 'mercasto_user'),
            '-p' . env('DB_PASSWORD', 'secret'),
            '-h', env('DB_HOST', 'mysql'),
            env('DB_DATABASE', 'mercasto'),
        ]);

        try {
            $process->mustRun();
            file_put_contents($path, $process->getOutput());

            $this->info("Uploading backup to S3...");
            Storage::disk('s3')->put('backups/' . $filename, file_get_contents($path));
            unlink($path); // Очищаем локальный диск
        } catch (ProcessFailedException $e) {
            \Illuminate\Support\Facades\Log::error('Database backup failed: ' . $e->getMessage());
        }
    }
}
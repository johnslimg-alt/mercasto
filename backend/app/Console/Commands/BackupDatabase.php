<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup';
    protected $description = 'Create a PostgreSQL dump and upload it to AWS S3';

    public function handle(): int
    {
        $filename = 'mercasto-backup-' . now()->format('Y-m-d-H-i-s') . '.sql';
        $path = storage_path('app/' . $filename);

        $this->info("Generating database dump...");

        $connection = (array) config('database.connections.pgsql', []);
        $password = (string) ($connection['password'] ?? '');

        if ($password === '') {
            $this->error('Database password is not configured; refusing to run a backup.');

            return self::FAILURE;
        }

        $process = new Process([
            'pg_dump',
            '-U', (string) ($connection['username'] ?? 'mercasto_user'),
            '-h', (string) ($connection['host'] ?? 'postgres'),
            '-p', (string) ($connection['port'] ?? '5432'),
            (string) ($connection['database'] ?? 'mercasto'),
        ]);
        $process->setEnv(['PGPASSWORD' => $password]);

        try {
            $process->mustRun();
            file_put_contents($path, $process->getOutput());

            $this->info("Uploading backup to S3...");
            Storage::disk('s3')->put('backups/' . $filename, file_get_contents($path));
            unlink($path); // Очищаем локальный диск

            return self::SUCCESS;
        } catch (ProcessFailedException $e) {
            \Illuminate\Support\Facades\Log::error('Database backup failed: ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
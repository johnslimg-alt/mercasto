<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SecureProductionE2eCredentials extends Command
{
    protected $signature = 'mercasto:secure-production-e2e-credentials';
    protected $description = 'Secure the two dedicated production E2E accounts without exposing credentials.';

    public function handle(): int
    {
        if (! app()->environment('production')) {
            $this->error('Refusing to rotate production E2E credentials outside production.');
            return self::FAILURE;
        }

        $sellerPassword = trim((string) getenv('E2E_SELLER_PASSWORD'));
        if (strlen($sellerPassword) < 32) {
            $this->error('E2E_SELLER_PASSWORD must be a non-empty secret of at least 32 characters.');
            return self::FAILURE;
        }

        $default = $this->repositorySeederDefault();
        if ($default === '' || hash_equals($default, $sellerPassword)) {
            $this->error('E2E_SELLER_PASSWORD must differ from the repository seeder default.');
            return self::FAILURE;
        }

        return DB::transaction(function () use ($sellerPassword, $default): int {
            $seller = $this->requiredAccount('seller_e2e@mercasto.com', 'individual');
            $admin = $this->requiredAccount('admin_e2e@mercasto.com', 'admin');

            $rotated = 0;
            if (! Hash::check($sellerPassword, $seller->password)) {
                $seller->forceFill(['password' => Hash::make($sellerPassword)])->saveQuietly();
                $seller->tokens()->delete();
                $rotated++;
            }

            if (Hash::check($default, $admin->password)) {
                $admin->forceFill(['password' => Hash::make(Str::password(64))])->saveQuietly();
                $admin->tokens()->delete();
                $rotated++;
            }

            $this->info("Production E2E credential security applied; accounts rotated: {$rotated}.");
            return self::SUCCESS;
        });
    }

    private function requiredAccount(string $email, string $role): User
    {
        $user = User::query()->where('email', $email)->first();
        if (! $user || $user->role !== $role) {
            throw new \RuntimeException('Dedicated production E2E account missing or role mismatch.');
        }
        return $user;
    }

    private function repositorySeederDefault(): string
    {
        $source = @file_get_contents(database_path('seeders/E2eTestSeeder.php')) ?: '';
        if (! preg_match("/sellerPassword = env\\([^,]+, '([^']+)'\\)/", $source, $match)) {
            return '';
        }
        return (string) ($match[1] ?? '');
    }
}

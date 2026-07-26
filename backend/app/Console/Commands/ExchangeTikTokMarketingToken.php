<?php

namespace App\Console\Commands;

use App\Services\TikTokMarketingApiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class ExchangeTikTokMarketingToken extends Command
{
    protected $signature = 'tiktok:marketing:exchange-token
        {--auth-code= : One-time OAuth authorization code}
        {--write-env : Store the long-term token in .env without printing it}';

    protected $description = 'Exchange a TikTok OAuth code for a long-term Marketing API token';

    public function handle(TikTokMarketingApiService $tiktok): int
    {
        $authCode = trim((string) ($this->option('auth-code')
            ?: config('services.tiktok.marketing.auth_code', '')));

        if ($authCode === '' && $this->input->isInteractive()) {
            $authCode = trim((string) $this->secret('TikTok one-time authorization code'));
        }

        $result = $tiktok->exchangeAuthCode($authCode);

        if (! ($result['ok'] ?? false)) {
            $this->error('TikTok token exchange failed.');
            $this->line(json_encode([
                'status' => $result['status'] ?? null,
                'code' => $result['code'] ?? null,
                'message' => $result['message'] ?? null,
                'reason' => $result['reason'] ?? null,
                'request_id' => $result['request_id'] ?? null,
                'credentials' => $result['credentials'] ?? null,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::FAILURE;
        }

        $token = trim((string) data_get($result, 'data.access_token', ''));
        $advertiserIds = array_map('strval', (array) data_get($result, 'data.advertiser_ids', []));
        $scopes = array_values((array) data_get($result, 'data.scope', []));
        $expectedAdvertiserId = $tiktok->advertiserId();

        if ($token === '') {
            $this->error('TikTok returned no access token.');

            return self::FAILURE;
        }

        if ($expectedAdvertiserId !== '' && ! in_array($expectedAdvertiserId, $advertiserIds, true)) {
            $this->error('The token does not authorize the configured advertiser account.');
            $this->line(json_encode([
                'configured_advertiser_id' => $expectedAdvertiserId,
                'authorized_advertiser_ids' => $advertiserIds,
                'scopes' => $scopes,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::FAILURE;
        }

        if ($this->option('write-env')) {
            $this->writeEnvironmentValue('TIKTOK_MARKETING_ACCESS_TOKEN', $token);
            $this->removeEnvironmentValue('TIKTOK_MARKETING_AUTH_CODE');
            Artisan::call('config:clear');
            $this->info('Long-term Marketing API token saved securely to .env.');
        } else {
            $this->warn('Token received but not saved. Re-run with --write-env to store it securely.');
        }

        $this->line(json_encode([
            'ok' => true,
            'advertiser_ids' => $advertiserIds,
            'scopes' => $scopes,
            'request_id' => $result['request_id'] ?? null,
            'token_saved' => (bool) $this->option('write-env'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }

    private function writeEnvironmentValue(string $key, string $value): void
    {
        $path = base_path('.env');
        $content = file_get_contents($path);

        if ($content === false) {
            throw new \RuntimeException('Unable to read .env');
        }

        $line = $key.'='.$value;
        $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

        $updated = preg_match($pattern, $content)
            ? preg_replace($pattern, $line, $content, 1)
            : rtrim($content).PHP_EOL.$line.PHP_EOL;

        $this->writeEnvironmentFile($path, (string) $updated);
    }

    private function removeEnvironmentValue(string $key): void
    {
        $path = base_path('.env');
        $content = file_get_contents($path);

        if ($content === false) {
            return;
        }

        $updated = preg_replace(
            '/^'.preg_quote($key, '/').'=.*\R?/m',
            '',
            $content
        );

        if ($updated !== null && $updated !== $content) {
            $this->writeEnvironmentFile($path, $updated);
        }
    }

    private function writeEnvironmentFile(string $path, string $content): void
    {
        $temporary = $path.'.tmp.'.getmypid();

        if (file_put_contents($temporary, $content, LOCK_EX) === false) {
            throw new \RuntimeException('Unable to write temporary .env file');
        }

        $permissions = fileperms($path);
        if ($permissions !== false) {
            chmod($temporary, $permissions & 0777);
        }

        if (! rename($temporary, $path)) {
            @unlink($temporary);
            throw new \RuntimeException('Unable to replace .env');
        }
    }
}

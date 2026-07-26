<?php

namespace App\Console\Commands;

use App\Services\TikTokMarketingApiService;
use Illuminate\Console\Command;

class VerifyTikTokMarketingApi extends Command
{
    protected $signature = 'tiktok:marketing:verify {--json}';

    protected $description = 'Verify direct TikTok Marketing API access without exposing credentials';

    public function handle(TikTokMarketingApiService $tiktok): int
    {
        $status = $tiktok->credentialStatus();

        if (! $status['advertiser_id_configured'] || ! $status['access_token_configured']) {
            $this->renderFailure([
                'ok' => false,
                'reason' => ! $status['advertiser_id_configured']
                    ? 'missing_advertiser_id'
                    : 'missing_marketing_access_token',
                'credentials' => $status,
            ]);

            return self::FAILURE;
        }

        $result = $tiktok->advertiserInfo();

        if (! ($result['ok'] ?? false)) {
            $this->renderFailure($result);

            return self::FAILURE;
        }

        $account = data_get($result, 'data.list.0', []);
        $safe = [
            'ok' => true,
            'advertiser_id' => $account['advertiser_id'] ?? $tiktok->advertiserId(),
            'name' => $account['name'] ?? null,
            'status' => $account['status'] ?? null,
            'currency' => $account['currency'] ?? null,
            'timezone' => $account['timezone'] ?? null,
            'request_id' => $result['request_id'] ?? null,
        ];

        if ($this->option('json')) {
            $this->line(json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->info('TikTok Marketing API access verified.');
            $this->table(
                ['Field', 'Value'],
                collect($safe)
                    ->reject(fn ($value, $key) => $key === 'ok' || $value === null)
                    ->map(fn ($value, $key) => [$key, is_scalar($value) ? (string) $value : json_encode($value)])
                    ->values()
                    ->all()
            );
        }

        return self::SUCCESS;
    }

    private function renderFailure(array $result): void
    {
        $safe = [
            'ok' => false,
            'status' => $result['status'] ?? null,
            'code' => $result['code'] ?? null,
            'message' => $result['message'] ?? null,
            'reason' => $result['reason'] ?? null,
            'request_id' => $result['request_id'] ?? null,
            'credentials' => $result['credentials'] ?? null,
        ];

        if ((int) ($result['code'] ?? 0) === 40001) {
            $safe['action'] = 'Generate a Marketing API token with advertiser management permissions and reauthorize the TikTok developer app.';
        }

        if ($this->option('json')) {
            $this->line(json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->error('TikTok Marketing API verification failed.');
            $this->line(json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }
}

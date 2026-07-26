<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MetaMarketingService
{
    private string $graphVersion;
    private ?string $accessToken;
    private ?string $adAccountId;

    public function __construct()
    {
        $this->graphVersion = (string) config('marketing.meta.graph_version', 'v25.0');
        $this->accessToken = config('marketing.meta.access_token');
        $this->adAccountId = config('marketing.meta.ad_account_id');
    }

    public function status(): array
    {
        $configured = filled($this->accessToken) && filled($this->adAccountId);

        return [
            'configured' => $configured,
            'ad_account_id' => $this->adAccountId ? $this->normalizeAccountId($this->adAccountId) : null,
            'graph_version' => $this->graphVersion,
            'capabilities' => [
                'read_campaigns' => $configured,
                'read_insights' => $configured,
                'write_campaigns' => $configured,
            ],
        ];
    }

    public function campaigns(int $days = 7, int $limit = 50): array
    {
        $this->ensureConfigured();

        $since = now('America/Mexico_City')->subDays(max(1, min(90, $days)) - 1)->toDateString();
        $until = now('America/Mexico_City')->toDateString();
        $accountId = $this->normalizeAccountId((string) $this->adAccountId);

        $response = $this->client()->get("https://graph.facebook.com/{$this->graphVersion}/{$accountId}/campaigns", [
            'fields' => 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,updated_time,insights.time_range({"since":"'.$since.'","until":"'.$until.'"}){spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type}',
            'limit' => max(1, min(100, $limit)),
        ]);

        $this->throwIfFailed($response->failed(), $response->json('error.message'));

        return [
            'data' => collect($response->json('data', []))->map(fn (array $campaign) => $this->normalizeCampaign($campaign))->values()->all(),
            'period' => ['since' => $since, 'until' => $until],
            'paging' => $response->json('paging', []),
        ];
    }

    public function updateCampaignStatus(string $campaignId, string $status): array
    {
        $this->ensureConfigured();
        $status = strtoupper($status);

        if (!in_array($status, ['ACTIVE', 'PAUSED'], true)) {
            throw new RuntimeException('Unsupported Meta campaign status.');
        }

        $response = $this->client()->post("https://graph.facebook.com/{$this->graphVersion}/{$campaignId}", [
            'status' => $status,
        ]);

        $this->throwIfFailed($response->failed(), $response->json('error.message'));

        return ['id' => $campaignId, 'status' => $status, 'success' => (bool) $response->json('success', true)];
    }

    public function updateCampaignBudget(string $campaignId, float $dailyBudget): array
    {
        $this->ensureConfigured();

        if ($dailyBudget < 1 || $dailyBudget > 1000000) {
            throw new RuntimeException('Daily budget is outside the allowed range.');
        }

        $minorUnits = (int) round($dailyBudget * 100);
        $response = $this->client()->post("https://graph.facebook.com/{$this->graphVersion}/{$campaignId}", [
            'daily_budget' => $minorUnits,
        ]);

        $this->throwIfFailed($response->failed(), $response->json('error.message'));

        return [
            'id' => $campaignId,
            'daily_budget' => $dailyBudget,
            'currency' => 'MXN',
            'success' => (bool) $response->json('success', true),
        ];
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->timeout(20)
            ->retry(2, 250)
            ->withToken((string) $this->accessToken);
    }

    private function ensureConfigured(): void
    {
        if (!filled($this->accessToken) || !filled($this->adAccountId)) {
            throw new RuntimeException('Meta Marketing API is not configured.');
        }
    }

    private function throwIfFailed(bool $failed, ?string $message): void
    {
        if ($failed) {
            throw new RuntimeException($message ?: 'Meta Marketing API request failed.');
        }
    }

    private function normalizeAccountId(string $value): string
    {
        return str_starts_with($value, 'act_') ? $value : 'act_'.$value;
    }

    private function normalizeCampaign(array $campaign): array
    {
        $insights = data_get($campaign, 'insights.data.0', []);
        $actions = collect($insights['actions'] ?? [])->pluck('value', 'action_type');
        $costs = collect($insights['cost_per_action_type'] ?? [])->pluck('value', 'action_type');

        return [
            'id' => (string) ($campaign['id'] ?? ''),
            'name' => (string) ($campaign['name'] ?? ''),
            'status' => $campaign['status'] ?? null,
            'effective_status' => $campaign['effective_status'] ?? null,
            'objective' => $campaign['objective'] ?? null,
            'daily_budget' => isset($campaign['daily_budget']) ? ((float) $campaign['daily_budget']) / 100 : null,
            'lifetime_budget' => isset($campaign['lifetime_budget']) ? ((float) $campaign['lifetime_budget']) / 100 : null,
            'currency' => 'MXN',
            'created_time' => $campaign['created_time'] ?? null,
            'updated_time' => $campaign['updated_time'] ?? null,
            'metrics' => [
                'spend' => (float) ($insights['spend'] ?? 0),
                'impressions' => (int) ($insights['impressions'] ?? 0),
                'reach' => (int) ($insights['reach'] ?? 0),
                'clicks' => (int) ($insights['clicks'] ?? 0),
                'ctr' => (float) ($insights['ctr'] ?? 0),
                'cpc' => (float) ($insights['cpc'] ?? 0),
                'cpm' => (float) ($insights['cpm'] ?? 0),
                'registrations' => (int) ($actions['complete_registration'] ?? 0),
                'leads' => (int) ($actions['lead'] ?? 0),
                'purchases' => (int) ($actions['purchase'] ?? 0),
                'cost_per_registration' => isset($costs['complete_registration']) ? (float) $costs['complete_registration'] : null,
            ],
        ];
    }
}

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
        $this->graphVersion = (string) config('services.facebook.graph_version', 'v25.0');
        $this->accessToken = config('services.facebook.marketing_access_token') ?: config('services.facebook.access_token');
        $this->adAccountId = config('services.facebook.ad_account_id');
    }

    public function status(): array
    {
        return [
            'configured' => filled($this->accessToken) && filled($this->adAccountId),
            'ad_account_id' => $this->adAccountId ? $this->normalizeAccountId($this->adAccountId) : null,
            'graph_version' => $this->graphVersion,
            'capabilities' => [
                'read_campaigns' => filled($this->accessToken) && filled($this->adAccountId),
                'read_insights' => filled($this->accessToken) && filled($this->adAccountId),
                'write_campaigns' => false,
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

        if ($response->failed()) {
            throw new RuntimeException($response->json('error.message') ?: 'Meta Marketing API request failed.');
        }

        return [
            'data' => collect($response->json('data', []))->map(fn (array $campaign) => $this->normalizeCampaign($campaign))->values()->all(),
            'period' => ['since' => $since, 'until' => $until],
            'paging' => $response->json('paging', []),
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

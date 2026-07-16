<?php

namespace App\Console\Commands;

use App\Services\TikTokEventsApiService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;

class VerifyTikTokEventsApi extends Command
{
    protected $signature = 'tiktok:events:verify {--event-id=}';

    protected $description = 'Send a technical ViewContent event to verify TikTok Events API credentials';

    public function handle(TikTokEventsApiService $tiktok): int
    {
        $eventId = (string) ($this->option('event-id') ?: 'deploy_verify_' . now()->timestamp);
        $url = config('app.frontend_url', 'https://mercasto.com') . '/tiktok-events-api-health';
        $request = Request::create($url, 'GET', [], [], [], [
            'REMOTE_ADDR' => '192.0.2.1',
            'HTTP_USER_AGENT' => 'Mercasto TikTok Events API verification',
            'HTTP_REFERER' => config('app.frontend_url', 'https://mercasto.com'),
        ]);

        $result = $tiktok->send(
            'ViewContent',
            $request,
            null,
            [
                'content_type' => 'product',
                'content_ids' => ['mercasto_events_api_health'],
                'contents' => [[
                    'content_id' => 'mercasto_events_api_health',
                    'content_type' => 'product',
                    'content_name' => 'Mercasto Events API health check',
                    'quantity' => 1,
                ]],
                'status' => 'verification',
            ],
            $eventId,
            $url,
        );

        if (! ($result['ok'] ?? false)) {
            $detail = $result['message']
                ?? $result['reason']
                ?? $result['error']
                ?? 'unknown';

            $this->error(sprintf(
                'TikTok Events API rejected verification (HTTP %s, code %s, message %s).',
                $result['status'] ?? 'n/a',
                $result['code'] ?? 'n/a',
                mb_substr((string) $detail, 0, 300)
            ));

            return self::FAILURE;
        }

        $this->info('TikTok Events API accepted the verification event.');

        return self::SUCCESS;
    }
}

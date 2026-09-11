<?php

namespace App\Console\Commands;

use App\Jobs\SendMobilePushNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reports whether native mobile push can actually be delivered.
 *
 * FirebaseCloudMessaging::credentials() returns null when
 * FIREBASE_SERVICE_ACCOUNT_BASE64 is missing and sendToUser() then returns
 * silently, so a production host without the secret looks healthy while every
 * push is dropped. This command turns that into an explicit signal that a
 * release gate can fail on.
 */
class MobilePushReadiness extends Command
{
    protected $signature = 'mobile:push-readiness
                            {--json : Print a machine-readable report}';

    protected $description = 'Report native mobile push readiness (FCM/HMS credentials, tokens, queue, routing)';

    public function handle(): int
    {
        $fcm = $this->fcmState();
        $hms = $this->hmsState();
        $tokens = $this->tokenState();
        $queue = $this->queueState();

        $problems = [];
        if (! $fcm['configured']) {
            $problems[] = 'FIREBASE_SERVICE_ACCOUNT_BASE64 is not configured: FirebaseCloudMessaging silently drops every push.';
        }
        if (! $hms['configured']) {
            $problems[] = 'HUAWEI_PUSH_APP_ID / HUAWEI_PUSH_APP_SECRET are not configured: AppGallery devices cannot be reached.';
        }
        if ($tokens['total'] === 0) {
            $problems[] = 'No device tokens are registered: no installed app ever called the registration endpoint.';
        }
        if ($tokens['routable_to_handler'] === 0 && $tokens['total'] > 0) {
            $problems[] = 'Registered tokens have no handler: SendMobilePushNotification dispatches FCM only.';
        }

        $ready = $problems === [];

        if ($this->option('json')) {
            $this->line((string) json_encode([
                'ready' => $ready,
                'credentials' => ['fcm' => $fcm, 'hms' => $hms],
                'tokens' => $tokens,
                'queue' => $queue,
                'problems' => $problems,
            ], JSON_UNESCAPED_SLASHES));
        } else {
            $this->line('== Native push readiness ==');
            $this->line(sprintf(
                'fcm credentials: %s%s',
                $fcm['configured'] ? 'configured' : 'NOT configured',
                $fcm['configured'] ? sprintf(' (project_id=%s)', $fcm['project_id'] ?? 'unknown') : ''
            ));
            $this->line(sprintf('hms credentials: %s', $hms['configured'] ? 'configured' : 'NOT configured'));
            $this->line(sprintf(
                'device tokens: %d total (%s), routable to a handler: %d',
                $tokens['total'],
                $tokens['by_provider'] === [] ? 'none' : json_encode($tokens['by_provider']),
                $tokens['routable_to_handler']
            ));
            $this->line(sprintf('last token seen: %s', $tokens['last_seen_at'] ?? 'never'));
            $this->line(sprintf(
                'queue: connection=%s pending_push_jobs=%d',
                $queue['connection'],
                $queue['pending_push_jobs']
            ));
            $this->line(sprintf('routing: fcm -> %s; hms -> %s', 'FirebaseCloudMessaging', 'no handler (defect)'));
            $this->newLine();
            if ($ready) {
                $this->info('MOBILE_PUSH_READINESS=READY');
            } else {
                $this->error('MOBILE_PUSH_READINESS=NOT_READY');
                foreach ($problems as $problem) {
                    $this->line(' - ' . $problem);
                }
            }
        }

        return $ready ? self::SUCCESS : self::FAILURE;
    }

    /**
     * @return array{configured: bool, project_id: string|null, client_email: string|null}
     */
    private function fcmState(): array
    {
        $encoded = config('services.firebase.service_account_base64');
        if (! is_string($encoded) || trim($encoded) === '') {
            return ['configured' => false, 'project_id' => null, 'client_email' => null];
        }

        $decoded = base64_decode($encoded, true);
        $account = $decoded === false ? null : json_decode($decoded, true);
        if (! is_array($account)) {
            return ['configured' => false, 'project_id' => null, 'client_email' => null];
        }

        // Never echo private_key or any other secret material.
        return [
            'configured' => ! empty($account['project_id'])
                && ! empty($account['client_email'])
                && ! empty($account['private_key']),
            'project_id' => isset($account['project_id']) ? (string) $account['project_id'] : null,
            'client_email' => isset($account['client_email']) ? (string) $account['client_email'] : null,
        ];
    }

    /**
     * @return array{configured: bool}
     */
    private function hmsState(): array
    {
        $appId = config('services.huawei_push.app_id');
        $appSecret = config('services.huawei_push.app_secret');

        return [
            'configured' => is_string($appId) && trim($appId) !== ''
                && is_string($appSecret) && trim($appSecret) !== '',
        ];
    }

    /**
     * @return array{total: int, by_provider: array<string, int>, routable_to_handler: int, last_seen_at: string|null}
     */
    private function tokenState(): array
    {
        if (! Schema::hasTable('mobile_push_tokens')) {
            return ['total' => 0, 'by_provider' => [], 'routable_to_handler' => 0, 'last_seen_at' => null];
        }

        $byProvider = DB::table('mobile_push_tokens')
            ->select('provider', DB::raw('count(*) as count'))
            ->groupBy('provider')
            ->pluck('count', 'provider')
            ->map(fn ($count) => (int) $count)
            ->all();

        return [
            'total' => array_sum($byProvider),
            'by_provider' => $byProvider,
            // SendMobilePushNotification only ever calls the FCM service.
            'routable_to_handler' => (int) ($byProvider['fcm'] ?? 0),
            'last_seen_at' => DB::table('mobile_push_tokens')->max('last_seen_at'),
        ];
    }

    /**
     * @return array{connection: string, pending_push_jobs: int}
     */
    private function queueState(): array
    {
        $connection = (string) config('queue.default');
        $pending = 0;

        if (Schema::hasTable('jobs')) {
            $pending = (int) DB::table('jobs')
                ->where('payload', 'like', '%' . SendMobilePushNotification::class . '%')
                ->count();
        }

        return ['connection' => $connection, 'pending_push_jobs' => $pending];
    }
}

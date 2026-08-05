<?php

namespace App\Console\Commands;

use App\Events\NewNotification;
use App\Mail\SellerReactivationReminderMail;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendSellerReactivationReminders extends Command
{
    protected $signature = 'ads:remind-reactivation
                            {--execute : Persist reminders and queue email delivery}
                            {--follow-up-after=72 : Hours after the first reminder before the final reminder}
                            {--limit=500 : Maximum sellers to inspect per run}';

    protected $description = 'Remind sellers about approved archived ads that still require confirmation';

    public function handle(): int
    {
        $followUpAfter = max(1, min(720, (int) $this->option('follow-up-after')));
        $limit = max(1, min(1000, (int) $this->option('limit')));
        $execute = (bool) $this->option('execute');

        $candidates = Ad::query()
            ->selectRaw('user_id, COUNT(*) as ready_count, MIN(COALESCE(ai_moderated_at, updated_at, created_at)) as ready_since')
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', 'approved')
            ->groupBy('user_id')
            ->orderBy('user_id')
            ->limit($limit)
            ->get();

        $summary = [
            'inspected' => $candidates->count(),
            'eligible' => 0,
            'initial' => 0,
            'follow_up' => 0,
            'emails' => 0,
            'in_app' => 0,
        ];

        foreach ($candidates as $candidate) {
            $user = User::query()->find($candidate->user_id);
            if (! $user) {
                continue;
            }

            $stage = $this->nextStage((int) $user->id, $followUpAfter);
            if (! $stage) {
                continue;
            }

            $summary['eligible']++;
            $summary[$stage]++;

            if (! $execute) {
                continue;
            }

            $readyCount = (int) $candidate->ready_count;
            $emailEnabled = $this->emailEnabled($user);
            $notification = $this->persistReminder(
                $user,
                $readyCount,
                $stage,
                $followUpAfter,
            );

            if (! $notification) {
                continue;
            }

            $summary['in_app']++;
            broadcast(new NewNotification((int) $user->id, $notification))->toOthers();

            if ($emailEnabled && filled($user->email)) {
                try {
                    Mail::to($user->email)->queue(new SellerReactivationReminderMail(
                        $user,
                        $readyCount,
                        $stage,
                        $this->actionUrl(),
                    ));
                    $summary['emails']++;
                } catch (Throwable $error) {
                    Log::warning('Could not queue seller reactivation reminder email', [
                        'user_id' => $user->id,
                        'stage' => $stage,
                        'error' => $error->getMessage(),
                    ]);
                }
            }
        }

        $this->table(
            ['Mode', 'Inspected', 'Eligible', 'Initial', 'Follow-up', 'In-app', 'Emails'],
            [[
                $execute ? 'execute' : 'dry-run',
                $summary['inspected'],
                $summary['eligible'],
                $summary['initial'],
                $summary['follow_up'],
                $summary['in_app'],
                $summary['emails'],
            ]],
        );

        return self::SUCCESS;
    }

    private function nextStage(int $userId, int $followUpAfter): ?string
    {
        $reminders = DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('type', 'seller_reactivation_reminder')
            ->orderBy('created_at')
            ->get(['data', 'created_at'])
            ->map(function ($row) {
                $data = is_array($row->data)
                    ? $row->data
                    : (json_decode((string) $row->data, true) ?: []);

                return [
                    'stage' => $data['stage'] ?? null,
                    'created_at' => Carbon::parse($row->created_at),
                ];
            });

        $initial = $reminders->firstWhere('stage', 'initial');
        if (! $initial) {
            return 'initial';
        }

        $followUp = $reminders->firstWhere('stage', 'follow_up');
        if (! $followUp && $initial['created_at']->lte(now()->subHours($followUpAfter))) {
            return 'follow_up';
        }

        return null;
    }

    private function persistReminder(
        User $user,
        int $readyCount,
        string $stage,
        int $followUpAfter,
    ): ?array {
        return DB::transaction(function () use ($user, $readyCount, $stage, $followUpAfter) {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first();

            if ($this->nextStage((int) $user->id, $followUpAfter) !== $stage) {
                return null;
            }

            $title = $stage === 'initial'
                ? 'Tus anuncios están listos para reactivar'
                : 'Recordatorio: tus anuncios siguen listos';
            $message = $readyCount === 1
                ? 'Tienes 1 anuncio aprobado que aún no está visible. Confirma que sigue disponible para publicarlo durante 7 días.'
                : "Tienes {$readyCount} anuncios aprobados que aún no están visibles. Confirma que siguen disponibles para publicarlos durante 7 días.";

            $notification = [
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'type' => 'seller_reactivation_reminder',
                'data' => json_encode([
                    'stage' => $stage,
                    'ready_count' => $readyCount,
                ], JSON_THROW_ON_ERROR),
                'link' => '/profile?tab=my_ads&filter=review_ready',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);

            return $notification;
        }, 3);
    }

    private function emailEnabled(User $user): bool
    {
        $preferences = $user->notification_preferences ?? [];
        if (array_key_exists('email_alerts', $preferences)) {
            return (bool) $preferences['email_alerts'];
        }

        return $user->email_notifications === null
            ? true
            : (bool) $user->email_notifications;
    }

    private function actionUrl(): string
    {
        $baseUrl = rtrim((string) config(
            'app.frontend_url',
            config('app.url', 'https://mercasto.com'),
        ), '/');

        return $baseUrl . '/profile?tab=my_ads&filter=review_ready';
    }
}

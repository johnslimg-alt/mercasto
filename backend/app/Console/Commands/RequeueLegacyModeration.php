<?php

namespace App\Console\Commands;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RequeueLegacyModeration extends Command
{
    protected $signature = 'ads:requeue-legacy-moderation
        {--limit=5 : Maximum archived ads to inspect}
        {--spacing=30 : Seconds between queued moderation jobs}
        {--execute : Requeue the selected ads}';

    protected $description = 'Safely recheck legacy moderation backlog without automatic publication';

    public function handle(): int
    {
        if ((string) config('services.gemini.api_key') === '') {
            $this->error('GEMINI_API_KEY is not configured.');
            return self::FAILURE;
        }

        if (Cache::get('ai_moderation:provider_unavailable')) {
            $this->error('The moderation provider is temporarily unavailable.');
            return self::FAILURE;
        }

        $limit = max(1, min(25, (int) $this->option('limit')));
        $spacing = max(0, min(300, (int) $this->option('spacing')));
        $ads = Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where(function ($query) {
                $query->whereNull('ai_moderation_status')
                    ->orWhereIn('ai_moderation_status', [
                        'failed',
                        'provider_error',
                        'provider_quota',
                        'manual_review',
                    ]);
            })
            ->where(function ($query) {
                $query->whereNotNull('moderation_submitted_at')
                    ->orWhereHas('moderationDecisions');
            })
            ->orderByRaw('COALESCE(moderation_submitted_at, created_at) ASC')
            ->limit($limit)
            ->get();

        if ($ads->isEmpty()) {
            $this->info('No legacy moderation ads matched.');
            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'AI status', 'Submitted'],
            $ads->map(fn (Ad $ad) => [
                $ad->id,
                $ad->ai_moderation_status ?: '(null)',
                optional($ad->moderation_submitted_at)->toDateTimeString() ?: '(legacy)',
            ])->all(),
        );

        if (! $this->option('execute')) {
            $this->warn('Dry run only. Add --execute to queue this batch.');
            return self::SUCCESS;
        }

        foreach ($ads->values() as $index => $ad) {
            DB::transaction(function () use ($ad, $index, $spacing): void {
                $ad->forceFill([
                    'status' => 'archived',
                    'moderation_submitted_at' => now(),
                    'ai_moderation_status' => 'queued',
                    'ai_moderation_reason' => null,
                    'ai_moderation_confidence' => null,
                    'ai_moderated_at' => null,
                ])->saveQuietly();

                ModerateAdWithAI::dispatch($ad->id, false)
                    ->delay(now()->addSeconds($index * $spacing))
                    ->afterCommit();
            });
        }

        $this->info(
            "Queued {$ads->count()} ad(s) for paced review ({$spacing}s spacing). Approved ads still require seller confirmation."
        );

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class ModeratePendingAds extends Command
{
    protected $signature = 'ads:moderate-pending {--limit=50 : Maximum number of ads to queue}';

    protected $description = 'Queue the oldest pending ads for auditable AI moderation';

    public function handle(): int
    {
        if (! Schema::hasColumn('ads', 'moderation_submitted_at')) {
            $this->warn('Moderation migration has not been applied.');
            return self::FAILURE;
        }

        $providerError = Cache::get('ai_moderation:provider_unavailable');
        if ($providerError) {
            $this->warn('AI moderation provider is temporarily unavailable: ' . $providerError);
            return self::SUCCESS;
        }

        if ((string) config('services.gemini.api_key') === '') {
            $this->warn('AI moderation skipped because GEMINI_API_KEY is not configured.');
            return self::SUCCESS;
        }

        $limit = max(1, min(500, (int) $this->option('limit')));

        $ads = Ad::query()
            ->where(function ($query) {
                $query->where('status', 'pending')
                    ->where(function ($pending) {
                        $pending->whereNull('ai_moderation_status')
                            ->orWhere('ai_moderation_status', 'queued');
                    });
            })
            ->orWhere(function ($query) {
                $query->where('status', 'archived')
                    ->where(function ($stuck) {
                        $stuck->where('ai_moderation_status', 'queued')
                            ->where('updated_at', '<=', now()->subMinutes(15));
                    });
            })
            ->orderByRaw('COALESCE(moderation_submitted_at, created_at) ASC')
            ->limit($limit)
            ->get();

        foreach ($ads as $ad) {
            $ad->forceFill([
                'status' => 'archived',
                'moderation_submitted_at' => $ad->moderation_submitted_at ?: $ad->created_at ?: now(),
                'ai_moderation_status' => 'queued',
            ])->saveQuietly();

            ModerateAdWithAI::dispatch($ad->id);
        }

        $this->info("Queued {$ads->count()} ad(s) for moderation.");

        return self::SUCCESS;
    }
}

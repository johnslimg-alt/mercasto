<?php

namespace App\Observers;

use App\Http\Controllers\Api\IndexNowController;
use App\Jobs\ModerateAdWithAI;
use App\Models\Ad;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AdObserver
{
    private const UNFINISHED_MODERATION_STATUSES = [
        'queued',
        'processing',
        'manual_review',
        'failed',
        'admin_manual_review',
    ];

    public function created(Ad $ad): void
    {
        Log::info('Ad created, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'create');

        if ($ad->status === 'pending') {
            $this->queueForModeration($ad);
        }
    }

    public function updating(Ad $ad): void
    {
        $isOwnerBypass = $ad->isDirty('status')
            && $ad->status === 'active'
            && $ad->getOriginal('status') === 'archived'
            && in_array(
                (string) $ad->getOriginal('ai_moderation_status'),
                self::UNFINISHED_MODERATION_STATUSES,
                true
            )
            && auth()->user()?->role !== 'admin';

        if ($isOwnerBypass) {
            throw new AuthorizationException('Este anuncio todavía está en revisión.');
        }
    }

    public function updated(Ad $ad): void
    {
        $importantFields = ['title', 'description', 'price', 'status', 'image_url'];

        if ($ad->wasChanged($importantFields)) {
            Log::info('Ad updated, notifying IndexNow', [
                'ad_id' => $ad->id,
                'changed_fields' => $ad->getChanges(),
            ]);
            IndexNowController::notifyAdChange($ad, 'update');
        }

        $contentChanged = $ad->wasChanged([
            'title',
            'description',
            'category',
            'subcategory',
            'image_url',
            'video_url',
        ]);
        $submittedAgain = $ad->wasChanged('status') && $ad->status === 'pending';
        $isModerationItem = $ad->status === 'pending'
            || (
                $ad->status === 'archived'
                && in_array((string) $ad->ai_moderation_status, self::UNFINISHED_MODERATION_STATUSES, true)
            );

        if ($submittedAgain || ($contentChanged && $isModerationItem)) {
            $this->queueForModeration($ad);
        }
    }

    public function deleted(Ad $ad): void
    {
        Log::info('Ad deleted, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'delete');
    }

    public function restored(Ad $ad): void
    {
        Log::info('Ad restored, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'update');
    }

    public function forceDeleted(Ad $ad): void
    {
        Log::info('Ad force deleted, notifying IndexNow', ['ad_id' => $ad->id]);
        IndexNowController::notifyAdChange($ad, 'delete');
    }

    private function queueForModeration(Ad $ad): void
    {
        // The application test suite uses the synchronous queue driver. Dispatching here
        // would perform an external Gemini request while unrelated factories are creating
        // ads. The job and command are covered explicitly; production and local runtime
        // continue to queue moderation normally.
        if (app()->runningUnitTests()) {
            return;
        }

        if (! Schema::hasColumn('ads', 'moderation_submitted_at')) {
            return;
        }

        app(AdIllustrativeCoverService::class)->ensureCover($ad);
        $ad->refresh();

        $ad->forceFill([
            // `archived` is an existing hidden status allowed by the database. It keeps the
            // legacy inline moderator from racing this auditable queue without exposing the ad.
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
            'ai_moderation_reason' => null,
            'ai_moderation_confidence' => null,
            'ai_moderated_at' => null,
        ])->saveQuietly();

        ModerateAdWithAI::dispatch($ad->id)->afterCommit();
    }
}

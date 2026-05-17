<?php

namespace App\Jobs;

use App\Models\Ad;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class ProcessVideoWatermark implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private Ad $ad)
    {
    }

    public function handle(): void
    {
        $originalVideoPath = $this->ad->video_url;
        if (!$originalVideoPath || !Storage::disk('public')->exists($originalVideoPath)) {
            $this->markFailed('Original video file not found.');
            return;
        }

        $originalFullPath = Storage::disk('public')->path($originalVideoPath);
        $watermarkedFilename = 'watermarked-' . basename($originalVideoPath);
        $watermarkedRelativePath = 'videos/' . $watermarkedFilename;
        $watermarkedFullPath = Storage::disk('public')->path($watermarkedRelativePath);

        $process = new Process([
            'ffmpeg',
            '-y',
            '-i',
            $originalFullPath,
            '-vf',
            "drawtext=text='mercasto.com':fontcolor=white@0.7:fontsize=24:x=w-text_w-10:y=h-text_h-10",
            '-c:a',
            'copy',
            '-preset',
            'ultrafast',
            $watermarkedFullPath,
        ]);
        $process->setTimeout(3600);

        try {
            $process->mustRun();

            $this->ad->forceFill([
                'video_url' => $watermarkedRelativePath,
                'video_processing_status' => 'completed',
            ])->save();

            Storage::disk('public')->delete($originalVideoPath);
            Log::info("Video watermarked successfully for Ad ID: {$this->ad->id}");
        } catch (ProcessFailedException $exception) {
            $this->markFailed($exception->getMessage());
        }
    }

    private function markFailed(string $reason): void
    {
        $this->ad->forceFill(['video_processing_status' => 'failed'])->save();
        Log::error("Video watermarking failed for Ad ID: {$this->ad->id}. Error: {$reason}");
    }
}

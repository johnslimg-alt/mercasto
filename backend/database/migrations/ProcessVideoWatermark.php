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
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class ProcessVideoWatermark implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $ad;

    public function __construct(Ad $ad)
    {
        $this->ad = $ad;
    }

    public function handle(): void
    {
        $originalVideoPath = $this->ad->video_url;
        $originalFullPath = Storage::disk('public')->path($originalVideoPath);
        
        $watermarkedFilename = 'watermarked-' . basename($originalVideoPath);
        $watermarkedPath = Storage::disk('public')->path('videos/' . $watermarkedFilename);

        // Команда FFmpeg для наложения водяного знака
        $command = [ 'ffmpeg', '-i', $originalFullPath, '-vf', "drawtext=text='mercasto.com':fontcolor=white@0.7:fontsize=24:x=w-text_w-10:y=h-text_h-10", '-c:a', 'copy', '-preset', 'ultrafast', $watermarkedPath ];

        $process = new Process($command);
        $process->setTimeout(3600); // Устанавливаем таймаут в 1 час

        try {
            $process->mustRun();

            // Обновляем объявление
            $this->ad->video_url = 'videos/' . $watermarkedFilename;
            $this->ad->video_processing_status = 'completed';
            $this->ad->save();

            Storage::disk('public')->delete($originalVideoPath);
            Log::info("Video watermarked successfully for Ad ID: {$this->ad->id}");
        } catch (ProcessFailedException $exception) {
            $this->ad->video_processing_status = 'failed';
            $this->ad->save();
            Log::error("Video watermarking failed for Ad ID: {$this->ad->id}. Error: " . $exception->getMessage());
        }
    }
}
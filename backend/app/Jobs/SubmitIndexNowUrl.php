<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Submit one canonical listing URL to IndexNow (Bing, Yandex, Seznam, Naver, Yep).
 *
 * Queued on purpose: the submission used to run inside the publishing request with Laravel's
 * default timeout, so a slow third party could stall an ad publish. IndexNow only affects
 * discovery speed, so a failure here must never break or slow the publish itself.
 */
class SubmitIndexNowUrl implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public readonly string $url)
    {
    }

    public function handle(): void
    {
        $key = trim((string) config('marketplace.indexnow.key'));

        if ($key === '') {
            return;
        }

        try {
            $response = Http::asJson()
                ->connectTimeout(3)
                ->timeout(5)
                ->post((string) config('marketplace.indexnow.endpoint'), [
                    'host' => parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'mercasto.com',
                    'key' => $key,
                    // Built from the configured canonical URL, never from the request host.
                    'keyLocation' => rtrim((string) config('app.url'), '/') . "/{$key}.txt",
                    'urlList' => [$this->url],
                ]);

            // IndexNow accepts a submission with 200 (processed) or 202 (accepted, key pending).
            if ($response->successful()) {
                Log::info('IndexNow submission completed', [
                    'url' => $this->url,
                    'status' => $response->status(),
                ]);

                return;
            }

            Log::warning('IndexNow submission rejected', [
                'url' => $this->url,
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 200),
            ]);
        } catch (\Throwable $exception) {
            // Discovery speed only: a third-party outage must never break publishing, and a
            // submission that cannot be delivered is not worth retrying or failing the job for.
            Log::warning('IndexNow submission failed', [
                'url' => $this->url,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}

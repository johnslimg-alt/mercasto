<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Ad;

class IndexNowController extends Controller
{
    private $indexNowKey = 'a7f5b8c9d2e4f6a1b3c5d7e9f2a4b6c8';
    private $bingEndpoint = 'https://www.bing.com/indexnow';
    private $yandexEndpoint = 'https://yandex.com/indexnow';

    /**
     * Submit URL to IndexNow when ad is created/updated
     */
    public function submitUrl(Request $request)
    {
        $request->validate([
            'url' => 'required|url',
            'type' => 'in:create,update,delete'
        ]);

        $url = $request->input('url');
        $type = $request->input('type', 'update');

        try {
            // Submit to Bing
            $bingResponse = $this->submitToSearchEngine($this->bingEndpoint, $url);
            
            // Submit to Yandex (optional, user said not interested but including for completeness)
            // $yandexResponse = $this->submitToSearchEngine($this->yandexEndpoint, $url);

            Log::info('IndexNow URL submitted', [
                'url' => $url,
                'type' => $type,
                'bing_status' => $bingResponse['status'] ?? 'unknown'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'URL submitted to IndexNow',
                'url' => $url,
                'search_engines' => [
                    'bing' => $bingResponse
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('IndexNow submission failed', [
                'url' => $url,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit URL to IndexNow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit multiple URLs (batch mode)
     */
    public function submitBatch(Request $request)
    {
        $request->validate([
            'urls' => 'required|array',
            'urls.*' => 'url'
        ]);

        $urls = $request->input('urls');
        $results = [];

        foreach ($urls as $url) {
            try {
                $response = $this->submitToSearchEngine($this->bingEndpoint, $url);
                $results[] = [
                    'url' => $url,
                    'status' => $response['status'] ?? 'unknown',
                    'success' => true
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'url' => $url,
                    'status' => 'error',
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Batch submission completed',
            'results' => $results
        ]);
    }

    /**
     * Get IndexNow key (for verification)
     */
    public function getKey()
    {
        return response()->json([
            'key' => $this->indexNowKey,
            'key_location' => url("/{$this->indexNowKey}.txt")
        ]);
    }

    /**
     * Submit URL to a specific search engine
     */
    private function submitToSearchEngine($endpoint, $url)
    {
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Host' => parse_url($endpoint, PHP_URL_HOST)
        ])->post($endpoint, [
            'host' => 'mercasto.com',
            'key' => $this->indexNowKey,
            'keyLocation' => url("/{$this->indexNowKey}.txt"),
            'urlList' => [$url]
        ]);

        return [
            'status' => $response->status(),
            'success' => $response->successful(),
            'body' => $response->body()
        ];
    }

    /**
     * Auto-submit ad URL when ad is created/updated (called from AdObserver)
     */
    public static function notifyAdChange(Ad $ad, string $action = 'update')
    {
        $url = url("/ad/{$ad->id}");
        
        try {
            $controller = new self();
            $response = $controller->submitToSearchEngine($controller->bingEndpoint, $url);
            
            Log::info('Ad change notified to IndexNow', [
                'ad_id' => $ad->id,
                'action' => $action,
                'url' => $url,
                'status' => $response['status']
            ]);

            return $response;
        } catch (\Exception $e) {
            Log::error('Failed to notify ad change to IndexNow', [
                'ad_id' => $ad->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}

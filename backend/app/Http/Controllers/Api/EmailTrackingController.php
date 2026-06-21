<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class EmailTrackingController extends Controller
{
    /**
     * Track email open (tracking pixel)
     */
    public function trackOpen(string $trackingId, Request $request)
    {
        EmailTracking::recordOpen(
            $trackingId,
            $request->ip(),
            $request->userAgent()
        );

        // Return 1x1 transparent pixel
        $pixel = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        
        return Response::make($pixel, 200, [
            'Content-Type' => 'image/png',
            'Content-Length' => strlen($pixel),
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    /**
     * Track link click and redirect
     */
    public function trackClick(string $trackingId, Request $request)
    {
        $url = $request->query('url');
        
        if (!$url) {
            abort(400, 'URL parameter required');
        }

        EmailTracking::recordClick(
            $trackingId,
            $url,
            $request->ip(),
            $request->userAgent()
        );

        return redirect($url);
    }

    /**
     * Get email analytics
     */
    public function analytics(Request $request)
    {
        $emailType = $request->query('type');
        $days = $request->query('days', 30);

        return response()->json(EmailTracking::getAnalytics($emailType, $days));
    }
}

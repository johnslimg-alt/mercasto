<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RuntimeErrorAlertMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RuntimeErrorAlertController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $expectedToken = (string) config('services.runtime_errors.alert_token', '');
        $providedToken = (string) $request->query('token', '');

        if (strlen($expectedToken) < 32 || ! hash_equals($expectedToken, $providedToken)) {
            abort(403);
        }

        $data = $request->validate([
            'friendly_id' => ['required', 'string', 'max:64'],
            'project_name' => ['required', 'string', 'max:120'],
            'calculated_type' => ['nullable', 'string', 'max:160'],
            'alert_reason' => ['required', 'string', 'max:64'],
            'stored_event_count' => ['nullable', 'integer', 'min:0'],
            'url' => ['required', 'url', 'max:2048'],
        ]);

        $urlParts = parse_url((string) $data['url']);
        $path = is_array($urlParts) ? (string) ($urlParts['path'] ?? '') : '';
        $host = is_array($urlParts) ? strtolower((string) ($urlParts['host'] ?? '')) : '';
        $scheme = is_array($urlParts) ? strtolower((string) ($urlParts['scheme'] ?? '')) : '';
        if ($scheme !== 'https' || $host !== 'mercasto.com' || ! str_starts_with($path, '/ops/errors/')) {
            abort(422, 'Invalid runtime error issue URL.');
        }

        $recipient = (string) config('services.runtime_errors.admin_email', '');
        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            abort(503, 'Runtime alert recipient is not configured.');
        }

        try {
            Mail::to($recipient)->send(new RuntimeErrorAlertMail(
                friendlyId: $data['friendly_id'],
                projectName: $data['project_name'],
                errorType: $data['calculated_type'] ?: 'UnhandledError',
                alertReason: $data['alert_reason'],
                eventCount: (int) ($data['stored_event_count'] ?? 0),
                issueUrl: $data['url'],
            ));
        } catch (\Throwable $exception) {
            Log::error('runtime error alert mail delivery failed', [
                'exception_class' => $exception::class,
            ]);

            return response()->json(['ok' => false], 503);
        }

        Log::info('runtime error alert delivered', [
            'friendly_id' => $data['friendly_id'],
            'alert_reason' => $data['alert_reason'],
        ]);

        return response()->json(['ok' => true], 202);
    }
}

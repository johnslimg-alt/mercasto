<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\SupportRequestMail;
use App\Models\SupportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SupportRequestController extends Controller
{
    private const SUBJECT_QUEUES = [
        'Reporte de anuncio' => 'moderation',
        'Problema técnico' => 'support',
        'Sugerencia' => 'product',
        'Otro' => 'support',
    ];

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'subject' => ['required', 'string', Rule::in(array_keys(self::SUBJECT_QUEUES))],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'website' => ['nullable', 'string', 'max:0'],
        ]);

        $queue = self::SUBJECT_QUEUES[$data['subject']];
        $reference = $this->newReference();
        $ip = trim((string) $request->ip());
        $ipHash = $ip === '' ? null : hash_hmac('sha256', $ip, (string) config('app.key'));

        $case = SupportRequest::create([
            'reference' => $reference,
            'user_id' => $request->user('sanctum')?->id,
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'subject' => $data['subject'],
            'message' => trim($data['message']),
            'queue' => $queue,
            'status' => SupportRequest::STATUS_RECEIVED,
            'ip_hash' => $ipHash,
        ]);

        try {
            Mail::to((string) config('mail.support_address', 'soporte@mercasto.com'))
                ->queue(new SupportRequestMail(
                    $case->reference,
                    $case->name,
                    $case->email,
                    $case->subject,
                    $case->message,
                    $case->queue,
                ));
        } catch (\Throwable $e) {
            Log::error('support-request notification queue failed', [
                'reference' => $case->reference,
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('support-request received', [
            'reference' => $case->reference,
            'queue' => $case->queue,
            'status' => $case->status,
            'email_hash' => hash('sha256', $case->email),
        ]);

        return response()->json([
            'ok' => true,
            'reference' => $case->reference,
            'status' => $case->status,
            'follow_up' => 'email',
        ], 201);
    }

    private function newReference(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $reference = 'MCS-' . now()->format('ymd') . '-' . Str::upper(Str::random(8));
            if (! SupportRequest::where('reference', $reference)->exists()) {
                return $reference;
            }
        }

        return 'MCS-' . Str::upper((string) Str::ulid());
    }
}

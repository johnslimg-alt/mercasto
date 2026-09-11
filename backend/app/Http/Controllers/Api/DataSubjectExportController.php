<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\DataSubjectAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * EG-05 — server-side data-subject export (LFPDPPP "derecho de acceso").
 *
 * Returns the personal data Mercasto holds about the *authenticated* subject as a
 * portable JSON document: account record, ads, payment records, consent history and the
 * conversations/messages the subject is a party to.
 *
 * Scoping rules that must never regress:
 *   - Every query is filtered by the authenticated user id taken from the token. The
 *     endpoint accepts no subject parameter, so there is nothing to tamper with (IDOR).
 *   - Columns are chosen from an explicit allow-list intersected with the live schema,
 *     so a column added later (a new token, secret or internal score) can never leak
 *     into the export by accident.
 *   - Credentials, tokens, provider payloads and internal risk/moderation scoring are
 *     excluded by construction and enumerated in `excluded` for the reader.
 *   - The only third-party data included is the chat counterparty's public id and
 *     display name, which the chat UI already shows the subject. No emails, phones or
 *     any other user's records are reachable from here.
 */
class DataSubjectExportController extends Controller
{
    public const FORMAT = 'mercasto.data-subject-export';

    public const FORMAT_VERSION = '1.0';

    /** Row caps keep a single export bounded; each section reports its own truncation. */
    private const MAX_ADS = 2000;

    private const MAX_PAYMENTS = 2000;

    private const MAX_CONSENTS = 500;

    private const MAX_MESSAGES = 5000;

    /** Account fields that are genuinely the subject's own record. */
    private const ACCOUNT_COLUMNS = [
        'id', 'name', 'email', 'email_verified_at', 'phone_number', 'phone_verified',
        'avatar_url', 'bio', 'city', 'whatsapp', 'website', 'social_instagram', 'role',
        'plan_code', 'plan_name', 'plan_expires_at', 'plan_activated_at', 'balance',
        'is_verified', 'referral_code', 'referred_by', 'referral_credits',
        'business_name', 'business_rfc', 'business_website', 'business_phone',
        'business_whatsapp', 'business_hours', 'business_address', 'business_description',
        'business_profile_enabled', 'business_rfc_verified_at',
        'kyc_status', 'preferred_role', 'preferred_categories',
        'onboarding_completed_at', 'last_active_at', 'ip_address',
        'created_at', 'updated_at',
    ];

    private const AD_COLUMNS = [
        'id', 'title', 'description', 'price', 'old_price', 'currency', 'condition',
        'category', 'subcategory', 'attributes', 'location', 'state', 'city',
        'latitude', 'longitude', 'status', 'promoted', 'views',
        'image_url', 'video_url', 'expires_at', 'created_at', 'updated_at',
    ];

    /** Payment *records* only: no Clip checkout ids, request urls or webhook payloads. */
    private const PAYMENT_COLUMNS = [
        'id', 'ad_id', 'amount', 'currency', 'product_code', 'description', 'status',
        'promoted', 'created_at', 'updated_at',
    ];

    private const CONSENT_COLUMNS = [
        'id', 'consent_type', 'document_version', 'accepted_at', 'client_accepted_at',
        'source', 'ip_hash', 'user_agent_hash', 'created_at', 'updated_at',
    ];

    private const MESSAGE_COLUMNS = [
        'id', 'conversation_id', 'ad_id', 'sender_id', 'receiver_id', 'body', 'content',
        'type', 'offer_amount', 'is_read', 'read_at', 'created_at', 'updated_at',
    ];

    private const CONVERSATION_COLUMNS = [
        'id', 'ad_id', 'buyer_id', 'seller_id', 'status', 'buyer_unread_count',
        'seller_unread_count', 'last_message_at', 'created_at', 'updated_at',
    ];

    public function show(Request $request): JsonResponse
    {
        $subjectId = (int) $request->user()->getAuthIdentifier();

        $account = $this->account($subjectId);
        $ads = $this->ads($subjectId);
        $payments = $this->payments($subjectId);
        $consents = $this->consents($subjectId);
        [$conversations, $messages] = $this->conversationsAndMessages($subjectId);

        $sections = [
            'account' => $account,
            'ads' => $ads,
            'payments' => $payments,
            'consents' => $consents,
            'conversations' => $conversations,
            'messages' => $messages,
        ];

        DataSubjectAudit::record('data_subject_export', $request, [
            'subject_id' => $subjectId,
            'sections' => array_keys($sections),
            'record_counts' => [
                'ads' => count($ads['items']),
                'payments' => count($payments['items']),
                'consents' => count($consents['items']),
                'conversations' => count($conversations['items']),
                'messages' => count($messages['items']),
            ],
        ]);

        return response()->json([
            'export' => [
                'format' => self::FORMAT,
                'format_version' => self::FORMAT_VERSION,
                'generated_at' => now()->toIso8601String(),
                'subject' => [
                    'user_id' => $subjectId,
                    'email' => $account['record']['email'] ?? null,
                ],
                'legal_basis' => 'LFPDPPP arts. 28-29 — derecho de acceso (solicitud de acceso a datos personales)',
                'scope' => 'Only personal data of the authenticated data subject. No other user records are included.',
                'sections' => $sections,
                'excluded' => $this->excludedFields(),
            ],
        ])
            ->header('Content-Disposition', 'attachment; filename="mercasto-personal-data-'.$subjectId.'.json"')
            ->header('Cache-Control', 'no-store, private')
            ->header('Pragma', 'no-cache');
    }

    /**
     * @return array{record: array<string, mixed>|null}
     */
    private function account(int $subjectId): array
    {
        $columns = $this->selectable('users', self::ACCOUNT_COLUMNS);

        $row = DB::table('users')->where('id', $subjectId)->first($columns);

        return ['record' => $row === null ? null : (array) $row];
    }

    /**
     * @return array{count: int, truncated: bool, items: list<array<string, mixed>>}
     */
    private function ads(int $subjectId): array
    {
        $columns = $this->selectable('ads', self::AD_COLUMNS);

        $rows = DB::table('ads')
            ->where('user_id', $subjectId)
            ->orderBy('id')
            ->limit(self::MAX_ADS + 1)
            ->get($columns);

        return [
            'count' => $rows->count(),
            'truncated' => $rows->count() > self::MAX_ADS,
            'items' => $rows->take(self::MAX_ADS)->map(fn ($row) => (array) $row)->all(),
        ];
    }

    /**
     * @return array{count: int, truncated: bool, items: list<array<string, mixed>>}
     */
    private function payments(int $subjectId): array
    {
        $columns = $this->selectable('payments', self::PAYMENT_COLUMNS);

        $rows = DB::table('payments')
            ->where('user_id', $subjectId)
            ->orderBy('id')
            ->limit(self::MAX_PAYMENTS + 1)
            ->get($columns);

        return [
            'count' => $rows->count(),
            'truncated' => $rows->count() > self::MAX_PAYMENTS,
            'items' => $rows->take(self::MAX_PAYMENTS)->map(fn ($row) => (array) $row)->all(),
        ];
    }

    /**
     * @return array{count: int, truncated: bool, items: list<array<string, mixed>>}
     */
    private function consents(int $subjectId): array
    {
        $columns = $this->selectable('user_consents', self::CONSENT_COLUMNS);

        $rows = DB::table('user_consents')
            ->where('user_id', $subjectId)
            ->orderBy('id')
            ->limit(self::MAX_CONSENTS + 1)
            ->get($columns);

        return [
            'count' => $rows->count(),
            'truncated' => $rows->count() > self::MAX_CONSENTS,
            'items' => $rows->take(self::MAX_CONSENTS)->map(fn ($row) => (array) $row)->all(),
        ];
    }

    /**
     * Conversations the subject is a party to, plus the messages they sent or received.
     *
     * @return array{0: array{count: int, truncated: bool, items: list<array<string, mixed>>}, 1: array{count: int, truncated: bool, items: list<array<string, mixed>>}}
     */
    private function conversationsAndMessages(int $subjectId): array
    {
        $conversationColumns = $this->selectable('conversations', self::CONVERSATION_COLUMNS);
        $messageColumns = $this->selectable('messages', self::MESSAGE_COLUMNS);

        $conversationRows = DB::table('conversations')
            ->where('buyer_id', $subjectId)
            ->orWhere('seller_id', $subjectId)
            ->orderBy('id')
            ->get($conversationColumns);

        // Strict party scoping: only rows where the subject is sender or receiver.
        $messageRows = DB::table('messages')
            ->where(function ($query) use ($subjectId): void {
                $query->where('sender_id', $subjectId)->orWhere('receiver_id', $subjectId);
            })
            ->orderBy('id')
            ->limit(self::MAX_MESSAGES + 1)
            ->get($messageColumns);

        $messageItems = $messageRows->take(self::MAX_MESSAGES)->map(function ($row) use ($subjectId): array {
            $message = (array) $row;
            $message['direction'] = (int) $message['sender_id'] === $subjectId ? 'outbound' : 'inbound';
            $message['counterparty_id'] = (int) $message['sender_id'] === $subjectId
                ? $message['receiver_id']
                : $message['sender_id'];

            unset($message['sender_id'], $message['receiver_id']);

            return $message;
        })->values();

        // Only the public display name of the counterparty, exactly as the chat UI shows it.
        $counterpartyIds = $messageItems->pluck('counterparty_id')->filter()->unique()->values();
        $names = $counterpartyIds->isEmpty()
            ? collect()
            : DB::table('users')->whereIn('id', $counterpartyIds)->pluck('name', 'id');

        $messageItems = $messageItems->map(function (array $message) use ($names): array {
            $message['counterparty_name'] = $names[(int) $message['counterparty_id']] ?? null;

            return $message;
        })->all();

        return [
            [
                'count' => $conversationRows->count(),
                'truncated' => false,
                'items' => $conversationRows->map(fn ($row) => (array) $row)->all(),
                'note' => 'Conversations where the subject is buyer or seller. Counterparty identity is limited to the public display name shown in the chat UI.',
            ],
            [
                'count' => $messageRows->count(),
                'truncated' => $messageRows->count() > self::MAX_MESSAGES,
                'items' => $messageItems,
            ],
        ];
    }

    /**
     * Intersect a deliberate allow-list with the live schema, so the export can only
     * ever contain columns that were reviewed here.
     *
     * @param  list<string>  $wanted
     * @return list<string>
     */
    private function selectable(string $table, array $wanted): array
    {
        $available = array_map('strtolower', Schema::getColumnListing($table));

        $columns = array_values(array_filter(
            $wanted,
            static fn (string $column): bool => in_array(strtolower($column), $available, true),
        ));

        return $columns === [] ? ['id'] : $columns;
    }

    /**
     * Deliberate omissions, stated in the document itself so the reader is not misled
     * into thinking the export is the entire processing inventory.
     *
     * @return array<string, string>
     */
    private function excludedFields(): array
    {
        return [
            'credentials' => 'password hash, remember_token, 2FA secrets and recovery codes, e-mail/phone OTP values, e-mail verification tokens. Never exportable.',
            'provider_payloads' => 'Clip checkout ids, payment request ids/urls, checkout responses and webhook payloads: third-party transaction material, not the subject\'s record.',
            'identity_documents' => 'kyc_document_url and business_csf_url are internal storage locators, not the documents themselves. Contact privacidad@mercasto.com to obtain copies.',
            'internal_assessments' => 'fraud_score, fraud_flags, kyc_ai_notes and AI moderation scoring are internal enforcement assessments. Their disclosure is pending legal review.',
            'other_users' => 'No other user\'s account, contact details or content is included. Only the chat counterparty display name, already visible in the chat UI.',
            'operator_sessions' => 'Sanctum personal access tokens and session records are security artefacts and are excluded.',
        ];
    }
}

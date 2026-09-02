<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class FraudRiskGatewayClient
{
    private const MAX_BATCH_SUBJECTS = 100;
    private const GATEWAY_BATCH_SUBJECTS = 10;

    private const ACCOUNT_KEYS = [
        'account_age_days',
        'verified_any',
        'ads_1h',
        'ads_24h',
        'messages_1h',
        'distinct_recipients_1h',
        'resolved_user_reports_90d',
        'resolved_ad_reports_90d',
        'violations_90d',
        'admin_rejections_90d',
    ];

    private const LISTING_KEYS = [
        'token_count',
        'max_token_share',
        'contact_pattern_count',
        'exact_duplicate_ads',
        'duplicate_media_ads',
        'resolved_reports_90d',
        'prior_admin_rejections',
        'price_z_score',
        'suspicious_keyword_score',
        'no_images_high_value',
    ];

    public function scoreOne(int $subjectId, array $account, array $listing): array
    {
        $subjects = $this->scoreBatch([[
            'subject_id' => $subjectId,
            'account' => $account,
            'listing' => $listing,
        ]]);

        return $subjects[0];
    }

    public function scoreBatch(array $subjects): array
    {
        if ($subjects === [] || count($subjects) > self::MAX_BATCH_SUBJECTS) {
            throw new RuntimeException('Risk batch subject count is out of bounds.');
        }

        $baseUrl = rtrim((string) config('fraud_risk.python.url', config('services.ai_moderation_gateway.url')), '/');
        $token = (string) config('services.ai_moderation_gateway.token', '');
        $this->assertPrivateGatewayUrl($baseUrl);
        if ($token === '') {
            throw new RuntimeException('Internal AI gateway credential is not configured.');
        }

        $expectedIds = [];
        $payloadSubjects = [];
        foreach ($subjects as $subject) {
            if (! is_array($subject)) {
                throw new RuntimeException('Risk batch subject must be an array.');
            }
            $subjectId = (int) ($subject['subject_id'] ?? 0);
            if ($subjectId <= 0 || isset($expectedIds[$subjectId])) {
                throw new RuntimeException('Risk batch subject ids must be unique positive integers.');
            }
            $account = $subject['account'] ?? null;
            $listing = $subject['listing'] ?? null;
            if (! is_array($account) || ! is_array($listing)) {
                throw new RuntimeException('Risk batch subject features are invalid.');
            }

            $expectedIds[$subjectId] = true;
            $payloadSubjects[] = [
                'subject_id' => $subjectId,
                'account' => $this->whitelist($account, self::ACCOUNT_KEYS),
                'listing' => $this->whitelist($listing, self::LISTING_KEYS),
            ];
        }

        $validatedById = [];
        foreach (array_chunk($payloadSubjects, self::GATEWAY_BATCH_SUBJECTS) as $chunk) {
            // The Python contract accepts at most ten subjects. A gateway error
            // throws immediately, so an outage costs at most one network timeout
            // instead of multiplying the timeout by every listing in the batch.
            foreach ($this->requestChunk($baseUrl, $token, $chunk) as $subject) {
                $subjectId = (int) $subject['subject_id'];
                if (isset($validatedById[$subjectId])) {
                    throw new RuntimeException('Private fraud risk gateway returned a duplicate subject.');
                }
                $validatedById[$subjectId] = $subject;
            }
        }

        if (count($validatedById) !== count($payloadSubjects)) {
            throw new RuntimeException('Private fraud risk gateway returned an incomplete batch contract.');
        }

        return array_map(
            fn (array $subject): array => $validatedById[(int) $subject['subject_id']],
            $payloadSubjects,
        );
    }

    private function requestChunk(string $baseUrl, string $token, array $payloadSubjects): array
    {
        $timeout = max(1, min(10, (int) config('fraud_risk.python.timeout_seconds', 3)));
        $response = Http::acceptJson()
            ->asJson()
            ->withHeaders(['X-Mercasto-Internal-Token' => $token])
            ->connectTimeout(min(2, $timeout))
            ->timeout($timeout)
            ->post($baseUrl.'/v1/risk/batch', ['subjects' => $payloadSubjects]);

        if ($response->failed()) {
            throw new RuntimeException('Private fraud risk gateway failed with status '.$response->status().'.');
        }

        $data = $response->json();
        $responseSubjects = is_array($data) ? ($data['subjects'] ?? null) : null;
        if (! is_array($responseSubjects) || count($responseSubjects) !== count($payloadSubjects)) {
            throw new RuntimeException('Private fraud risk gateway returned an invalid batch contract.');
        }

        $expectedIds = array_fill_keys(array_map(
            fn (array $subject): int => (int) $subject['subject_id'],
            $payloadSubjects,
        ), true);
        $validated = [];
        foreach ($responseSubjects as $subject) {
            if (! is_array($subject)) {
                throw new RuntimeException('Private fraud risk gateway returned an invalid subject.');
            }
            $subjectId = (int) ($subject['subject_id'] ?? 0);
            if (! isset($expectedIds[$subjectId]) || isset($validated[$subjectId])) {
                throw new RuntimeException('Private fraud risk gateway returned an unexpected subject.');
            }

            $accountScore = $this->validatedScore($subject['account'] ?? null);
            $listingScore = $this->validatedScore($subject['listing'] ?? null);
            if ($accountScore['rules_version'] !== $listingScore['rules_version']) {
                throw new RuntimeException('Private fraud risk gateway returned inconsistent rule versions.');
            }

            $validated[$subjectId] = [
                'subject_id' => $subjectId,
                'account' => $accountScore,
                'listing' => $listingScore,
            ];
        }

        return array_values($validated);
    }

    private function validatedScore(mixed $value): array
    {
        if (! is_array($value)
            || ! is_numeric($value['risk_score'] ?? null)
            || ! in_array($value['band'] ?? null, ['low', 'medium', 'high', 'critical'], true)
            || ! is_array($value['reason_codes'] ?? null)
            || ! is_string($value['rules_version'] ?? null)
            || trim((string) ($value['rules_version'] ?? '')) === ''
            || ($value['engine'] ?? null) !== 'deterministic_rules'
            || ($value['rollout_mode'] ?? null) !== 'shadow_assist'
            || ($value['authoritative'] ?? null) !== false
            || ! in_array($value['recommended_action'] ?? null, ['allow', 'observe', 'manual_review', 'urgent_review'], true)) {
            throw new RuntimeException('Private fraud risk gateway returned an invalid score contract.');
        }

        $score = (int) $value['risk_score'];
        if ($score < 0 || $score > 100) {
            throw new RuntimeException('Private fraud risk gateway returned an out-of-range score.');
        }

        $reasons = [];
        foreach ($value['reason_codes'] as $reason) {
            if (! is_string($reason) || ! preg_match('/^[a-z0-9_]+$/', $reason)) {
                throw new RuntimeException('Private fraud risk gateway returned a non-canonical reason code.');
            }
            $reasons[] = $reason;
        }

        return [
            'risk_score' => $score,
            'band' => $value['band'],
            'reason_codes' => array_values(array_unique($reasons)),
            'rules_version' => trim($value['rules_version']),
            'engine' => 'deterministic_rules',
            'rollout_mode' => 'shadow_assist',
            'authoritative' => false,
            'recommended_action' => $value['recommended_action'],
        ];
    }

    private function whitelist(array $features, array $keys): array
    {
        $allowed = array_fill_keys($keys, true);

        return array_intersect_key($features, $allowed);
    }

    private function assertPrivateGatewayUrl(string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (app()->environment('testing') && str_ends_with($host, '.test')) {
            return;
        }

        if (! in_array($host, ['mercasto-ai-gateway', 'mercasto_ai_gateway'], true)) {
            throw new RuntimeException('Fraud risk gateway must use the private Mercasto runtime.');
        }
    }
}

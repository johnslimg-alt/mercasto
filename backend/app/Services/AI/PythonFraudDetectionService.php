<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Facades\Log;
use Throwable;

class PythonFraudDetectionService extends FraudDetectionService
{
    private const BATCH_STATUSES = ['active', 'pending', 'under_review', 'archived'];

    public function __construct(
        private FraudRiskFeatureExtractor $features,
        private FraudRiskGatewayClient $gateway,
    ) {}

    public function analyze(Ad $ad): array
    {
        if (! (bool) config('fraud_risk.python.enabled', true)) {
            return $this->fallback($ad, 'python_risk_disabled');
        }

        try {
            $features = $this->features->forAd($ad);
            $subject = $this->gateway->scoreOne(
                (int) $ad->id,
                $features['account'],
                $features['listing'],
            );

            return $this->applySubjectResult($ad, $subject);
        } catch (Throwable $exception) {
            Log::warning('Private fraud risk scoring unavailable; using fail-open fallback.', [
                'ad_id' => $ad->id,
                'exception' => $exception::class,
            ]);

            return $this->fallback($ad, 'private_risk_gateway_unavailable');
        }
    }

    public function batchAnalyze(int $limit = 100): array
    {
        $limit = max(1, min(100, $limit));
        $ads = Ad::query()
            ->where(function ($query) {
                $query->whereNull('last_fraud_check_at')
                    ->orWhere('last_fraud_check_at', '<', now()->subDays(7));
            })
            ->whereIn('status', self::BATCH_STATUSES)
            ->orderByRaw('CASE WHEN status IN (\'pending\', \'under_review\', \'archived\') THEN 0 ELSE 1 END')
            ->orderBy('created_at')
            ->limit($limit)
            ->get();

        if ($ads->isEmpty()) {
            return $this->summarize([]);
        }

        if (! (bool) config('fraud_risk.python.enabled', true)) {
            return $this->summarize(array_map(
                fn (Ad $ad): array => $this->fallback($ad, 'python_risk_disabled'),
                $ads->all(),
            ));
        }

        try {
            $requestSubjects = [];
            foreach ($ads as $ad) {
                $features = $this->features->forAd($ad);
                $requestSubjects[] = [
                    'subject_id' => (int) $ad->id,
                    'account' => $features['account'],
                    'listing' => $features['listing'],
                ];
            }

            // One bounded private request for the whole admin batch prevents a
            // stalled gateway from multiplying the per-request timeout by N ads.
            $responseSubjects = $this->gateway->scoreBatch($requestSubjects);
            $results = [];
            foreach ($ads->values() as $index => $ad) {
                $subject = $responseSubjects[$index] ?? null;
                if (! is_array($subject) || (int) ($subject['subject_id'] ?? 0) !== (int) $ad->id) {
                    throw new \RuntimeException('Private fraud risk batch response order is invalid.');
                }
                $results[] = $this->applySubjectResult($ad, $subject);
            }

            return $this->summarize($results);
        } catch (Throwable $exception) {
            Log::warning('Private fraud risk batch unavailable; using one local fail-open pass.', [
                'ad_count' => $ads->count(),
                'exception' => $exception::class,
            ]);

            return $this->summarize(array_map(
                fn (Ad $ad): array => $this->fallback($ad, 'private_risk_gateway_unavailable'),
                $ads->all(),
            ));
        }
    }

    private function applySubjectResult(Ad $ad, array $subject): array
    {
        $account = $subject['account'];
        $listing = $subject['listing'];
        $score = min(100, (int) $account['risk_score'] + (int) $listing['risk_score']);
        $reasonCodes = array_values(array_unique([
            ...$account['reason_codes'],
            ...$listing['reason_codes'],
        ]));

        $ad->forceFill([
            'fraud_score' => $score,
            'fraud_flags' => $reasonCodes,
            'last_fraud_check_at' => now(),
        ])->saveQuietly();

        return [
            'ad_id' => $ad->id,
            'mode' => 'shadow_assist',
            'provider' => 'python_private',
            'runtime' => 'private_local',
            'engine' => 'deterministic_rules',
            'rules_version' => $account['rules_version'],
            'risk_score' => $score,
            'fraud_score' => $score,
            'listing_risk_score' => (int) $listing['risk_score'],
            'account_risk_score' => (int) $account['risk_score'],
            'listing_risk' => $listing,
            'account_risk' => $account,
            'risk_level' => $this->riskLevel($score),
            'reason_codes' => $reasonCodes,
            'flags' => $reasonCodes,
            'requires_manual_review' => $score >= (int) config('fraud_risk.thresholds.review', 40),
            'authoritative_action' => null,
            'recommended_action' => $this->recommendedAction($score),
            'degraded' => false,
        ];
    }

    private function summarize(array $details): array
    {
        $threshold = (int) config('fraud_risk.thresholds.review', 40);
        $flagged = count(array_filter(
            $details,
            fn (array $result): bool => (int) ($result['risk_score'] ?? 0) >= $threshold,
        ));

        return [
            'analyzed' => count($details),
            'flagged' => $flagged,
            'clean' => count($details) - $flagged,
            'details' => array_values($details),
        ];
    }

    private function fallback(Ad $ad, string $reason): array
    {
        try {
            $fallback = parent::analyze($ad);
            $score = max(0, min(100, (int) ($fallback['risk_score'] ?? 0)));
            unset($fallback['recommendation']);

            return array_merge($fallback, [
                'mode' => 'shadow_assist',
                'provider' => 'php_fallback',
                'runtime' => 'local_php',
                'engine' => 'local_php_rules',
                'risk_score' => $score,
                'fraud_score' => $score,
                'risk_level' => $this->riskLevel($score),
                'requires_manual_review' => $score >= (int) config('fraud_risk.thresholds.review', 40),
                'recommended_action' => $this->recommendedAction($score),
                'degraded' => true,
                'fallback_reason' => $reason,
                'authoritative_action' => null,
            ]);
        } catch (Throwable $exception) {
            Log::warning('Fraud risk fallback unavailable; returning neutral assist result.', [
                'ad_id' => $ad->id,
                'exception' => $exception::class,
            ]);

            $score = max(0, min(100, (int) round((float) ($ad->fraud_score ?? 0))));
            $flags = array_values(array_filter(
                is_array($ad->fraud_flags) ? $ad->fraud_flags : [],
                'is_string',
            ));

            return [
                'ad_id' => $ad->id,
                'mode' => 'shadow_assist',
                'provider' => 'neutral_fallback',
                'runtime' => 'local_php',
                'engine' => 'fallback',
                'rules_version' => (string) config('fraud_risk.version', 'unknown'),
                'risk_score' => $score,
                'fraud_score' => $score,
                'listing_risk_score' => 0,
                'account_risk_score' => 0,
                'risk_level' => $this->riskLevel($score),
                'reason_codes' => $flags,
                'flags' => $flags,
                'requires_manual_review' => false,
                'authoritative_action' => null,
                'recommended_action' => 'allow',
                'degraded' => true,
                'fallback_reason' => $reason,
            ];
        }
    }

    private function riskLevel(int $score): string
    {
        if ($score >= (int) config('fraud_risk.thresholds.high', 70)) {
            return 'high';
        }
        if ($score >= (int) config('fraud_risk.thresholds.review', 40)) {
            return 'medium';
        }
        if ($score >= (int) config('fraud_risk.thresholds.low', 20)) {
            return 'low';
        }

        return 'none';
    }

    private function recommendedAction(int $score): string
    {
        if ($score >= (int) config('fraud_risk.thresholds.high', 70)) {
            return 'urgent_review';
        }
        if ($score >= (int) config('fraud_risk.thresholds.review', 40)) {
            return 'manual_review';
        }
        if ($score >= (int) config('fraud_risk.thresholds.low', 20)) {
            return 'observe';
        }

        return 'allow';
    }
}

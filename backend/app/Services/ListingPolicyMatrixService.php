<?php

namespace App\Services;

use Illuminate\Support\Str;
use InvalidArgumentException;

class ListingPolicyMatrixService
{
    private array $matrix;

    public function __construct(?array $matrix = null)
    {
        $this->matrix = $matrix ?? (array) config('listing_policy', []);
    }

    public function metadata(): array
    {
        return [
            'version' => $this->matrix['version'] ?? null,
            'publication_status' => $this->matrix['publication_status'] ?? null,
            'legal_review_status' => $this->matrix['legal_review_status'] ?? null,
            'reviewed_on' => $this->matrix['reviewed_on'] ?? null,
            'next_review_on' => $this->matrix['next_review_on'] ?? null,
        ];
    }

    public function policies(): array
    {
        return (array) ($this->matrix['policies'] ?? []);
    }

    public function policy(string $policyId): ?array
    {
        $policyId = $this->normalizeCode($policyId);
        $policy = $this->policies()[$policyId] ?? null;

        return is_array($policy) ? $policy : null;
    }

    public function assertPolicyIds(array $policyIds): array
    {
        $normalized = collect($policyIds)
            ->map(fn ($id) => $this->normalizeCode((string) $id))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $unknown = array_values(array_filter(
            $normalized,
            fn (string $id) => $this->policy($id) === null,
        ));

        if ($unknown !== []) {
            throw new InvalidArgumentException('Unknown listing policy IDs: ' . implode(', ', $unknown));
        }

        return $normalized;
    }

    public function matchSignals(array $signals): array
    {
        $normalizedSignals = collect($signals)
            ->map(fn ($signal) => $this->normalizeCode((string) $signal))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($normalizedSignals === []) {
            return [];
        }

        $matches = [];
        foreach ($this->policies() as $policyId => $policy) {
            $policySignals = collect((array) ($policy['automated_signals'] ?? []))
                ->map(fn ($signal) => $this->normalizeCode((string) $signal))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if (array_intersect($normalizedSignals, $policySignals) !== []) {
                $matches[$policyId] = $policy;
            }
        }

        return $matches;
    }

    public function assessment(array $signals): array
    {
        $matches = $this->matchSignals($signals);
        $dispositions = collect($matches)
            ->pluck('disposition')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $enforcement = (array) ($this->matrix['enforcement'] ?? []);

        return [
            'policy_ids' => array_keys($matches),
            'dispositions' => $dispositions,
            'requires_manual_review' => $matches !== [],
            'prohibited_signal_present' => in_array('prohibited', $dispositions, true),
            'verification_signal_present' => in_array('restricted_verification', $dispositions, true),
            'legal_review_signal_present' => in_array('manual_legal_review', $dispositions, true),
            'human_authoritative' => (bool) ($enforcement['human_authoritative'] ?? true),
            'ai_may_auto_approve' => (bool) ($enforcement['ai_may_auto_approve'] ?? false),
            'ai_may_auto_reject' => (bool) ($enforcement['ai_may_auto_reject'] ?? false),
            // The matrix is guidance for a human-authoritative workflow. It never
            // emits an automatic moderation decision from model signals alone.
            'authoritative_action' => null,
        ];
    }

    private function normalizeCode(string $value): string
    {
        $value = Str::lower(Str::ascii(trim($value)));
        return trim(preg_replace('/[^a-z0-9]+/', '_', $value) ?? '', '_');
    }
}

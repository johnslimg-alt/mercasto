<?php

namespace App\Services;

use DateTimeInterface;
use InvalidArgumentException;

class ReportLifecycleService
{
    public const STATUS_NEW = 'new';
    public const STATUS_IN_REVIEW = 'in_review';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_DISMISSED = 'dismissed';

    private const ALLOWED_TRANSITIONS = [
        self::STATUS_NEW => [self::STATUS_IN_REVIEW],
        self::STATUS_IN_REVIEW => [self::STATUS_RESOLVED, self::STATUS_DISMISSED],
        self::STATUS_RESOLVED => [],
        self::STATUS_DISMISSED => [],
    ];

    public function transitionPatch(
        string $from,
        string $to,
        int $moderatorId,
        DateTimeInterface $at,
        ?string $note = null,
    ): array {
        $allowed = self::ALLOWED_TRANSITIONS[$from] ?? null;
        if ($allowed === null || !in_array($to, $allowed, true)) {
            throw new InvalidArgumentException("Invalid report transition: {$from} -> {$to}");
        }

        if ($to === self::STATUS_IN_REVIEW) {
            return [
                'status' => $to,
                'review_started_at' => $at,
                'resolved_at' => null,
                'resolved_by' => null,
                'resolution_action' => null,
                'resolution_note' => null,
            ];
        }

        return [
            'status' => $to,
            'resolved_at' => $at,
            'resolved_by' => $moderatorId,
            'resolution_action' => $to,
            'resolution_note' => $note,
        ];
    }
}
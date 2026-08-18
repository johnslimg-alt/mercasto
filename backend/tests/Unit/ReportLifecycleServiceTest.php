<?php

namespace Tests\Unit;

use App\Services\ReportLifecycleService;
use DateTimeImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ReportLifecycleServiceTest extends TestCase
{
    public function test_new_report_can_enter_review_without_resolution_metadata(): void
    {
        $at = new DateTimeImmutable('2026-08-18T11:00:00+00:00');
        $patch = (new ReportLifecycleService())->transitionPatch('new', 'in_review', 7, $at);

        $this->assertSame('in_review', $patch['status']);
        $this->assertSame($at, $patch['review_started_at']);
        $this->assertNull($patch['resolved_at']);
        $this->assertNull($patch['resolved_by']);
    }

    public function test_review_can_be_resolved_with_moderator_audit_metadata(): void
    {
        $at = new DateTimeImmutable('2026-08-18T11:05:00+00:00');
        $patch = (new ReportLifecycleService())->transitionPatch('in_review', 'resolved', 42, $at, 'policy checked');

        $this->assertSame('resolved', $patch['status']);
        $this->assertSame($at, $patch['resolved_at']);
        $this->assertSame(42, $patch['resolved_by']);
        $this->assertSame('resolved', $patch['resolution_action']);
        $this->assertSame('policy checked', $patch['resolution_note']);
    }

    public function test_review_can_be_dismissed_but_terminal_states_cannot_transition(): void
    {
        $service = new ReportLifecycleService();
        $at = new DateTimeImmutable('2026-08-18T11:10:00+00:00');

        $this->assertSame('dismissed', $service->transitionPatch('in_review', 'dismissed', 42, $at)['status']);

        $this->expectException(InvalidArgumentException::class);
        $service->transitionPatch('resolved', 'in_review', 42, $at);
    }

    public function test_skipping_review_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new ReportLifecycleService())->transitionPatch('new', 'resolved', 42, new DateTimeImmutable());
    }
}
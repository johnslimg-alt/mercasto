<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use App\Services\ListingDuplicateDetector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The duplicate-resolution command is the operator's lever for acting on what the
 * pipeline only surfaces. Policy stays a flag; dry-run is the default; nothing
 * already public is ever retroactively hidden.
 */
class ResolveDuplicateSubmissionsTest extends TestCase
{
    use RefreshDatabase;

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Toyota Corolla 2022 Excelente Estado',
            'description' => 'Auto en excelentes condiciones, único dueño, factura original.',
            'price' => 320000,
            'location' => 'Cuauhtémoc, Ciudad de México',
            'state' => 'Ciudad de México',
            'city' => 'Cuauhtémoc',
            'category' => 'autos',
            'subcategory' => 'autos',
            'condition' => 'usado',
            'status' => 'archived',
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => null,
            'is_catalog_filler' => false,
            'attributes' => ['subcategory' => 'autos'],
        ], $overrides)));
    }

    private function resolve(array $options = []): int
    {
        return Artisan::call('ads:resolve-duplicate-submissions', $options);
    }

    public function test_dry_run_reports_the_groups_and_changes_nothing(): void
    {
        $seller = User::factory()->create();
        $keeper = $this->createAd($seller);
        $this->createAd($seller);
        $this->createAd($seller);

        $this->assertSame(0, $this->resolve());
        $output = Artisan::output();

        $this->assertStringContainsString('DRY RUN', $output);
        $this->assertStringContainsString('Duplicate groups found        : 1', $output);
        $this->assertStringContainsString('Duplicate rows to change: 2', $output);
        $this->assertStringContainsString((string) $keeper->id, $output);

        $this->assertSame(3, Ad::query()->where('ai_moderation_status', Ad::MODERATION_APPROVED)->count());
        $this->assertDatabaseCount('ad_moderation_decisions', 0);
    }

    public function test_apply_moves_only_the_duplicates_to_manual_review_and_keeps_the_earliest(): void
    {
        $seller = User::factory()->create();
        $keeper = $this->createAd($seller);
        $copyA = $this->createAd($seller);
        $copyB = $this->createAd($seller);

        $this->assertSame(0, $this->resolve(['--apply' => true]));
        $this->assertStringContainsString('Applied. 2 row(s) changed.', Artisan::output());

        $this->assertSame(Ad::MODERATION_APPROVED, $keeper->fresh()->ai_moderation_status);
        $this->assertSame('manual_review', $copyA->fresh()->ai_moderation_status);
        $this->assertSame('manual_review', $copyB->fresh()->ai_moderation_status);

        // The marker matches the detector's format so the admin UI renders it.
        $this->assertStringContainsString(
            ListingDuplicateDetector::REASON_MARKER.' del anuncio #'.$keeper->id,
            (string) $copyA->fresh()->ai_moderation_reason
        );

        // The audit trail the pipeline uses is written for every changed row.
        $audit = AdModerationDecision::query()->where('ad_id', $copyA->id)->latest('id')->firstOrFail();
        $this->assertSame('system', $audit->source);
        $this->assertSame('manual_review', $audit->decision);
        $this->assertSame($keeper->id, $audit->metadata['duplicate_resolution']['kept_ad_id']);
        $this->assertSame('ads:resolve-duplicate-submissions', $audit->metadata['duplicate_resolution']['command']);
    }

    public function test_re_running_apply_is_a_no_op(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller);
        $this->createAd($seller);
        $this->createAd($seller);

        $this->resolve(['--apply' => true]);
        $decisionsAfterFirst = AdModerationDecision::query()->count();
        $this->assertSame(2, $decisionsAfterFirst);

        $this->assertSame(0, $this->resolve(['--apply' => true]));
        $output = Artisan::output();

        $this->assertStringContainsString('Duplicate rows changed: 0', $output);
        $this->assertStringContainsString('Applied. 0 row(s) changed.', $output);
        $this->assertSame($decisionsAfterFirst, AdModerationDecision::query()->count());
    }

    public function test_a_group_containing_an_active_ad_is_skipped_entirely(): void
    {
        $seller = User::factory()->create();
        $live = $this->createAd($seller, ['status' => 'active', 'expires_at' => now()->addDays(5)]);
        $hiddenCopy = $this->createAd($seller);

        $this->assertSame(0, $this->resolve(['--apply' => true]));
        $output = Artisan::output();

        $this->assertStringContainsString('SKIPPED (contains active inventory)', $output);
        $this->assertStringContainsString('Groups skipped (active member): 1', $output);
        $this->assertStringContainsString('Applied. 0 row(s) changed.', $output);

        // Nothing was hidden retroactively.
        $this->assertSame('active', $live->fresh()->status);
        $this->assertSame(Ad::MODERATION_APPROVED, $hiddenCopy->fresh()->ai_moderation_status);
    }

    public function test_reject_action_mirrors_the_admin_rejection_state(): void
    {
        $seller = User::factory()->create();
        $keeper = $this->createAd($seller);
        $copy = $this->createAd($seller);

        $this->assertSame(0, $this->resolve(['--apply' => true, '--action' => 'reject']));

        $copy->refresh();
        $this->assertSame('rejected', $copy->status);
        $this->assertSame('admin_rejected', $copy->ai_moderation_status);
        $this->assertSame(Ad::MODERATION_APPROVED, $keeper->fresh()->ai_moderation_status);
    }

    public function test_keep_latest_keeps_the_newest_member(): void
    {
        $seller = User::factory()->create();
        $oldest = $this->createAd($seller);
        $middle = $this->createAd($seller);
        $newest = $this->createAd($seller);

        $this->assertSame(0, $this->resolve(['--apply' => true, '--keep' => 'latest']));

        $this->assertSame(Ad::MODERATION_APPROVED, $newest->fresh()->ai_moderation_status);
        $this->assertSame('manual_review', $oldest->fresh()->ai_moderation_status);
        $this->assertSame('manual_review', $middle->fresh()->ai_moderation_status);
    }

    public function test_near_misses_and_singletons_are_never_touched(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();

        $unique = $this->createAd($seller);
        $differentPrice = $this->createAd($seller, ['price' => 310000]);
        $differentDescription = $this->createAd($seller, ['description' => 'Otra unidad, 80,000 km.']);
        $otherSeller = $this->createAd($other);

        $this->assertSame(0, $this->resolve(['--apply' => true]));
        $this->assertStringContainsString('Duplicate groups found        : 0', Artisan::output());

        foreach ([$unique, $differentPrice, $differentDescription, $otherSeller] as $ad) {
            $this->assertSame(Ad::MODERATION_APPROVED, $ad->fresh()->ai_moderation_status);
        }
    }

    public function test_limit_caps_the_work_and_reports_truncation(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller);
        $this->createAd($seller);
        $this->createAd($seller);
        $this->createAd($seller);

        $this->assertSame(0, $this->resolve(['--apply' => true, '--limit' => 2]));
        $output = Artisan::output();

        $this->assertStringContainsString('Applied. 2 row(s) changed.', $output);
        $this->assertStringContainsString('--limit=2 truncated the work list', $output);
        $this->assertSame(2, Ad::query()->where('ai_moderation_status', 'manual_review')->count());
    }

    public function test_resolution_leaves_exactly_the_keepers_for_reconciliation(): void
    {
        // End-to-end on the mechanism the P0 depends on: the reconciliation predicate
        // keys on ai_moderation_status='approved', so resolving duplicates first is
        // what stops the copies from being published.
        $seller = User::factory()->create();
        $keeper = $this->createAd($seller);
        $this->createAd($seller);
        $this->createAd($seller);

        $reconcilePredicate = fn (): int => Ad::query()
            ->where('is_catalog_filler', false)
            ->where('status', 'archived')
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->whereNull('expires_at')
            ->count();

        $this->assertSame(3, $reconcilePredicate());

        $this->resolve(['--apply' => true]);

        $this->assertSame(1, $reconcilePredicate());
        $this->assertSame($keeper->id, Ad::query()
            ->where('ai_moderation_status', Ad::MODERATION_APPROVED)
            ->where('status', 'archived')
            ->value('id'));

        // And the surviving keeper still reconciles to active + indexable.
        Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]);
        $keeper->refresh();
        $this->assertSame('active', $keeper->status);
        $this->assertTrue($keeper->expires_at->isFuture());
    }

    public function test_dry_run_projects_the_reconcile_count_without_changing_it(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller);
        $this->createAd($seller);

        $this->assertSame(0, $this->resolve());
        $this->assertStringContainsString(
            'ads:reconcile-moderation-visibility would then match: 1 (currently 2)',
            Artisan::output()
        );
        $this->assertSame(2, Ad::query()->where('ai_moderation_status', Ad::MODERATION_APPROVED)->count());
    }

    public function test_invalid_policy_flags_are_rejected(): void
    {
        $seller = User::factory()->create();
        $this->createAd($seller);
        $this->createAd($seller);

        $this->assertSame(1, $this->resolve(['--apply' => true, '--action' => 'delete']));
        $this->assertSame(1, $this->resolve(['--apply' => true, '--keep' => 'middle']));
        $this->assertSame(1, $this->resolve(['--apply' => true, '--since' => 'not-a-date']));

        $this->assertSame(2, Ad::query()->where('ai_moderation_status', Ad::MODERATION_APPROVED)->count());
    }

    public function test_since_scopes_which_ads_are_considered(): void
    {
        $seller = User::factory()->create();
        $keeper = $this->createAd($seller);
        $recent = $this->createAd($seller);

        // created_at is not mass assignable, so backdate the first ad explicitly.
        DB::table('ads')->where('id', $keeper->id)->update(['created_at' => now()->subDays(10)]);

        // Only the recent ad is inside the window, so no group is formed.
        $this->assertSame(0, $this->resolve(['--apply' => true, '--since' => now()->subDays(2)->toDateTimeString()]));
        $this->assertStringContainsString('Duplicate groups found        : 0', Artisan::output());
        $this->assertSame(Ad::MODERATION_APPROVED, $recent->fresh()->ai_moderation_status);
        $this->assertSame(Ad::MODERATION_APPROVED, $keeper->fresh()->ai_moderation_status);
    }
}

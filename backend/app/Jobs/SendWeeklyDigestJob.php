<?php

namespace App\Jobs;

use App\Mail\WeeklyDigestMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendWeeklyDigestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public User $user) {}

    public function handle(): void
    {
        try {
            $ads = $this->buildRecommendations();

            if ($ads->isEmpty()) {
                Log::info("WeeklyDigest: no ads found for user {$this->user->id}, skipping.");
                return;
            }

            Mail::to($this->user->email)->send(new WeeklyDigestMail($this->user, $ads));

            Log::info("WeeklyDigest: sent {$ads->count()} ads to user {$this->user->id} ({$this->user->email})");
        } catch (\Throwable $e) {
            Log::error("WeeklyDigest: failed for user {$this->user->id}: {$e->getMessage()}");
            // Do not rethrow — one user failure must not stop the batch
        }
    }

    private function buildRecommendations(): Collection
    {
        $userId       = $this->user->id;
        $since        = now()->subDays(7);
        $favoritedIds = DB::table('favorites')->where('user_id', $userId)->pluck('ad_id');
        $ads          = collect();

        // ── Priority 1: Ads matching active search alerts ─────────────────────
        $alerts = DB::table('search_alerts')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        if ($alerts->isNotEmpty()) {
            foreach ($alerts as $alert) {
                $query = DB::table('ads')
                    ->where('status', 'active')
                    ->where('user_id', '!=', $userId)
                    ->where('created_at', '>=', $since)
                    ->whereNotIn('id', $favoritedIds);

                // Category match: look up slug from categories table
                if ($alert->category_id) {
                    $cat = DB::table('categories')->where('id', $alert->category_id)->first();
                    if ($cat) {
                        // ads.category stores hierarchical slugs like "parent/child"
                        $query->where(function ($q) use ($cat) {
                            $q->where('category', $cat->slug)
                              ->orWhere('category', 'like', $cat->slug . '/%')
                              ->orWhere('category', 'like', '%/' . $cat->slug);
                        });
                    }
                }

                if ($alert->min_price !== null) {
                    $query->where('price', '>=', $alert->min_price);
                }
                if ($alert->max_price !== null) {
                    $query->where('price', '<=', $alert->max_price);
                }
                if (!empty($alert->city)) {
                    $query->where(function ($q) use ($alert) {
                        $q->where('location', 'ilike', '%' . $alert->city . '%')
                          ->orWhere('state', 'ilike', '%' . $alert->city . '%');
                    });
                }

                $alertAds = $query->orderByDesc('created_at')->limit(8)->get();
                $ads = $ads->merge($alertAds);
            }
        }

        // ── Priority 2: Ads in same categories as user's favorites ────────────
        if ($ads->count() < 8) {
            $favCategories = DB::table('ads')
                ->whereIn('id', $favoritedIds)
                ->whereNotNull('category')
                ->pluck('category')
                ->unique()
                ->values();

            if ($favCategories->isNotEmpty()) {
                $catAds = DB::table('ads')
                    ->where('status', 'active')
                    ->where('user_id', '!=', $userId)
                    ->where('created_at', '>=', $since)
                    ->whereNotIn('id', $favoritedIds)
                    ->where(function ($q) use ($favCategories) {
                        foreach ($favCategories as $slug) {
                            $q->orWhere('category', $slug)
                              ->orWhere('category', 'like', $slug . '/%');
                        }
                    })
                    ->orderByDesc('is_featured')
                    ->orderByDesc('created_at')
                    ->limit(8)
                    ->get();

                $ads = $ads->merge($catAds);
            }
        }

        // ── Priority 3: Fallback — newest featured ads ────────────────────────
        if ($ads->count() < 4) {
            $featured = DB::table('ads')
                ->where('status', 'active')
                ->where('user_id', '!=', $userId)
                ->where('created_at', '>=', $since)
                ->where('is_featured', true)
                ->whereNotIn('id', $favoritedIds)
                ->orderByDesc('created_at')
                ->limit(8)
                ->get();

            $ads = $ads->merge($featured);
        }

        // Deduplicate by id, limit to 8, convert to Eloquent-like Collection
        $uniqueIds = $ads->unique('id')->pluck('id')->take(8)->values();

        return \App\Models\Ad::whereIn('id', $uniqueIds)
            ->orderByDesc('is_featured')
            ->orderByDesc('created_at')
            ->get();
    }
}

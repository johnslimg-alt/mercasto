<?php

namespace App\Console\Commands;

use App\Models\SavedSearch;
use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSavedSearches extends Command
{
    protected $signature = 'searches:check {--limit=100 : Maximum number of searches to process}';
    protected $description = 'Check saved searches for new matching ads';

    public function handle()
    {
        $this->info('Checking saved searches for new results...');
        
        $searches = SavedSearch::withAlerts()
            ->orderBy('last_checked_at', 'asc')
            ->limit($this->option('limit'))
            ->get();

        $totalProcessed = 0;
        $totalNewResults = 0;

        foreach ($searches as $search) {
            try {
                $newCount = $this->checkForNewResults($search);
                
                if ($newCount > 0) {
                    $search->increment('new_results_count', $newCount);
                    $totalNewResults += $newCount;
                    $this->info("Search #{$search->id}: Found {$newCount} new results");
                }
                
                $search->update(['last_checked_at' => now()]);
                $totalProcessed++;
                
            } catch (\Exception $e) {
                Log::error("Error checking saved search #{$search->id}", [
                    'error' => $e->getMessage()
                ]);
                $this->error("Error processing search #{$search->id}: {$e->getMessage()}");
            }
        }

        $this->info("Processed {$totalProcessed} searches, found {$totalNewResults} new results");
        
        return 0;
    }

    private function checkForNewResults(SavedSearch $search): int
    {
        $query = Ad::where('status', 'active')
            ->where('created_at', '>', $search->last_checked_at ?? $search->created_at);

        $filters = $search->filters;

        // Apply text search
        if (!empty($filters['query'])) {
            $query->where(function($q) use ($filters) {
                $q->where('title', 'ilike', "%{$filters['query']}%")
                  ->orWhere('description', 'ilike', "%{$filters['query']}%");
            });
        }

        // Apply category filter
        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        // Apply state filter
        if (!empty($filters['state'])) {
            $query->where('state', $filters['state']);
        }

        // Apply city filter
        if (!empty($filters['city'])) {
            $query->where('city', $filters['city']);
        }

        // Apply price range
        if (!empty($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }
        if (!empty($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }

        return $query->count();
    }
}

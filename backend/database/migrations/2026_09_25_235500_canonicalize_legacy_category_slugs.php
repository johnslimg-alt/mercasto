<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CATEGORY_ALIASES = [
        'coches' => 'motor',
        'telefonos' => 'electronica',
        'telefonia' => 'electronica',
        'informatica' => 'electronica',
        'bebes' => 'infantil',
        'coleccionismo' => 'ocio',
    ];

    private const CANONICAL_CATEGORY_METADATA = [
        'motor' => ['es' => 'Motor', 'en' => 'Motor', 'icon' => 'Car', 'sort_order' => 10],
        'electronica' => ['es' => 'Electrónica', 'en' => 'Electronics', 'icon' => 'Monitor', 'sort_order' => 80],
        'infantil' => ['es' => 'Infantil', 'en' => 'Kids', 'icon' => 'Baby', 'sort_order' => 110],
        'ocio' => ['es' => 'Ocio', 'en' => 'Hobbies', 'icon' => 'Bike', 'sort_order' => 115],
    ];

    public function up(): void
    {
        foreach (self::CATEGORY_ALIASES as $legacy => $canonical) {
            $this->ensureCanonicalCategoryForAlias($legacy, $canonical);

            $canonicalId = Schema::hasTable('categories')
                ? DB::table('categories')->where('slug', $canonical)->value('id')
                : null;

            if (Schema::hasTable('ads')) {
                DB::table('ads')->where('category', $legacy)->update(['category' => $canonical]);
            }

            if (Schema::hasTable('category_subscriptions')) {
                // Avoid violating the unique (user_id, category_slug) constraint when
                // a user already follows both the legacy and canonical category.
                DB::table('category_subscriptions')
                    ->where('category_slug', $legacy)
                    ->whereExists(function ($query) use ($canonical): void {
                        $query->select(DB::raw(1))
                            ->from('category_subscriptions as canonical_subscription')
                            ->whereColumn('canonical_subscription.user_id', 'category_subscriptions.user_id')
                            ->where('canonical_subscription.category_slug', $canonical);
                    })
                    ->delete();

                DB::table('category_subscriptions')
                    ->where('category_slug', $legacy)
                    ->update(['category_slug' => $canonical]);
            }

            if (Schema::hasTable('search_alerts')) {
                $updates = ['category_slug' => $canonical];
                if ($canonicalId) {
                    $updates['category_id'] = $canonicalId;
                }

                DB::table('search_alerts')
                    ->where('category_slug', $legacy)
                    ->update($updates);

                if ($canonicalId && Schema::hasTable('categories')) {
                    $legacyId = DB::table('categories')->where('slug', $legacy)->value('id');
                    if ($legacyId) {
                        DB::table('search_alerts')
                            ->where('category_id', $legacyId)
                            ->update([
                                'category_id' => $canonicalId,
                                'category_slug' => $canonical,
                            ]);
                    }
                }

                $this->normalizeJsonCategory('search_alerts', 'filters', $legacy, $canonical);
            }

            if (Schema::hasTable('saved_searches')) {
                $this->normalizeJsonCategory('saved_searches', 'filters', $legacy, $canonical);
            }

            if (Schema::hasTable('categories')) {
                DB::table('categories')->where('slug', $legacy)->delete();
            }
        }

        foreach ([
            'categories_all',
            'valid_category_slugs',
            'sitemap_xml',
            'google_merchant_xml',
            'ads_featured_block',
        ] as $key) {
            Cache::forget($key);
        }

        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }
    }

    private function ensureCanonicalCategoryForAlias(string $legacy, string $canonical): void
    {
        if (! Schema::hasTable('categories')) {
            return;
        }

        if (DB::table('categories')->where('slug', $canonical)->exists()) {
            return;
        }

        $needsCanonical = DB::table('categories')->where('slug', $legacy)->exists();

        if (! $needsCanonical && Schema::hasTable('ads')) {
            $needsCanonical = DB::table('ads')->where('category', $legacy)->exists();
        }

        if (! $needsCanonical && Schema::hasTable('category_subscriptions')) {
            $needsCanonical = DB::table('category_subscriptions')->where('category_slug', $legacy)->exists();
        }

        if (! $needsCanonical && Schema::hasTable('search_alerts')) {
            $needsCanonical = DB::table('search_alerts')->where('category_slug', $legacy)->exists();

            if (! $needsCanonical) {
                $legacyId = DB::table('categories')->where('slug', $legacy)->value('id');
                $needsCanonical = $legacyId
                    ? DB::table('search_alerts')->where('category_id', $legacyId)->exists()
                    : false;
            }
        }

        if (! $needsCanonical && Schema::hasTable('saved_searches')) {
            $needsCanonical = DB::table('saved_searches')
                ->whereNotNull('filters')
                ->get(['filters'])
                ->contains(function ($row) use ($legacy): bool {
                    $filters = is_string($row->filters) ? json_decode($row->filters, true) : $row->filters;
                    return is_array($filters) && ($filters['category'] ?? null) === $legacy;
                });
        }

        if (! $needsCanonical) {
            return;
        }

        $metadata = self::CANONICAL_CATEGORY_METADATA[$canonical];

        DB::table('categories')->insert([
            'slug' => $canonical,
            'name' => json_encode(['es' => $metadata['es'], 'en' => $metadata['en']], JSON_UNESCAPED_UNICODE),
            'icon' => $metadata['icon'],
            'sort_order' => $metadata['sort_order'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function normalizeJsonCategory(string $table, string $column, string $legacy, string $canonical): void
    {
        DB::table($table)
            ->whereNotNull($column)
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($table, $column, $legacy, $canonical): void {
                foreach ($rows as $row) {
                    $payload = is_string($row->{$column})
                        ? json_decode($row->{$column}, true)
                        : $row->{$column};

                    if (! is_array($payload) || ($payload['category'] ?? null) !== $legacy) {
                        continue;
                    }

                    $payload['category'] = $canonical;

                    DB::table($table)->where('id', $row->id)->update([
                        $column => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
                }
            }, 'id');
    }

    public function down(): void
    {
        // Legacy slugs were aliases with ambiguous historical meaning. Recreating
        // them would split canonical inventory again, so this cleanup is one-way.
    }
};

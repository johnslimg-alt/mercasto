<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enable pg_trgm extension and add GIN indexes for fuzzy search.
     * pg_trgm allows similarity-based text matching with similarity() function.
     */
    public function up(): void
    {
        // Enable pg_trgm extension (requires PostgreSQL superuser or pg_extension_owner)
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // GIN trigram index on ads.title for fast similarity queries
        DB::statement('CREATE INDEX IF NOT EXISTS ads_title_trgm_idx ON ads USING GIN (title gin_trgm_ops)');

        // GIN trigram index on ads.description for full-text fuzzy search
        DB::statement('CREATE INDEX IF NOT EXISTS ads_description_trgm_idx ON ads USING GIN (description gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS ads_title_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS ads_description_trgm_idx');
        // We intentionally do NOT drop the extension as other parts may depend on it
    }
};

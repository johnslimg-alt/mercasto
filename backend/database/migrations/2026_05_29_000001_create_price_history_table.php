<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create table if not exists (idempotent)
        DB::statement('
            CREATE TABLE IF NOT EXISTS price_history (
                id BIGSERIAL PRIMARY KEY,
                ad_id BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
                old_price DECIMAL(12,2) NOT NULL,
                new_price DECIMAL(12,2) NOT NULL,
                changed_at TIMESTAMPTZ DEFAULT NOW()
            )
        ');

        DB::statement('
            CREATE INDEX IF NOT EXISTS idx_price_history_ad
            ON price_history(ad_id, changed_at DESC)
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('price_history');
    }
};

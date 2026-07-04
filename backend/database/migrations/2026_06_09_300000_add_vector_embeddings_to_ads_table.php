<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Add vector column for semantic search embeddings (768 dimensions for nomic-embed-text)
            DB::statement('ALTER TABLE ads ADD COLUMN IF NOT EXISTS embedding vector(768)');

            // Create index for vector similarity search (IVFFlat for fast approximate search)
            DB::statement('CREATE INDEX IF NOT EXISTS ads_embedding_idx ON ads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');
        }

        // Add fraud_score column for fraud detection
        Schema::table('ads', function (Blueprint $table) {
            $table->float('fraud_score')->default(0)->after('status');
            $table->json('fraud_flags')->nullable()->after('fraud_score');
            $table->timestamp('last_fraud_check_at')->nullable()->after('fraud_flags');
        });

        // Create index for fraud scoring
        Schema::table('ads', function (Blueprint $table) {
            $table->index('fraud_score');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS ads_embedding_idx');
            DB::statement('ALTER TABLE ads DROP COLUMN IF EXISTS embedding');
        }

        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn(['fraud_score', 'fraud_flags', 'last_fraud_check_at']);
        });
    }
};

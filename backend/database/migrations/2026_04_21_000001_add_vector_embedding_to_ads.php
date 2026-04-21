<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Включаем расширение pgvector в PostgreSQL
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector;');
        // Добавляем векторную колонку на 768 измерений (стандарт для моделей Gemini)
        DB::statement('ALTER TABLE ads ADD COLUMN embedding vector(768);');
        // Создаем HNSW индекс для сверхбыстрого семантического поиска
        DB::statement('CREATE INDEX ads_embedding_index ON ads USING hnsw (embedding vector_cosine_ops);');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE ads DROP COLUMN IF EXISTS embedding;');
    }
};
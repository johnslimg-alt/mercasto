<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['reports', 'user_reports'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            $this->addIfMissing($tableName, 'status', function (Blueprint $table) {
                $table->string('status', 32)->default('new')->index();
            });
            $this->addIfMissing($tableName, 'review_started_at', function (Blueprint $table) {
                $table->timestamp('review_started_at')->nullable();
            });
            $this->addIfMissing($tableName, 'resolved_at', function (Blueprint $table) {
                $table->timestamp('resolved_at')->nullable();
            });
            $this->addIfMissing($tableName, 'resolved_by', function (Blueprint $table) {
                $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            });
            $this->addIfMissing($tableName, 'resolution_action', function (Blueprint $table) {
                $table->string('resolution_action', 32)->nullable();
            });
            $this->addIfMissing($tableName, 'resolution_note', function (Blueprint $table) {
                $table->text('resolution_note')->nullable();
            });
        }
    }

    public function down(): void
    {
        // Adoption-compatible migration: production may already own one or more
        // lifecycle columns. Automated rollback cannot distinguish ownership,
        // so it must not destructively drop potentially pre-existing data.
    }

    private function addIfMissing(string $tableName, string $column, callable $definition): void
    {
        if (Schema::hasColumn($tableName, $column)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($definition) {
            $definition($table);
        });
    }
};
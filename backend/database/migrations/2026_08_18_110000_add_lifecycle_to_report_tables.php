<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['reports', 'user_reports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('status', 32)->default('new')->index();
                $table->timestamp('review_started_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('resolution_action', 32)->nullable();
                $table->text('resolution_note')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['reports', 'user_reports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('resolved_by');
                $table->dropColumn([
                    'status',
                    'review_started_at',
                    'resolved_at',
                    'resolution_action',
                    'resolution_note',
                ]);
            });
        }
    }
};
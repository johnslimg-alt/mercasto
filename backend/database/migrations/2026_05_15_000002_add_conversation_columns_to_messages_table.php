<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('messages')) {
            return;
        }

        Schema::table('messages', function (Blueprint $table) {
            if (!Schema::hasColumn('messages', 'conversation_id')) {
                $table->foreignId('conversation_id')->nullable()->after('id')->constrained('conversations')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('messages', 'body')) {
                $table->text('body')->nullable()->after('sender_id');
            }
            if (!Schema::hasColumn('messages', 'type')) {
                $table->string('type', 32)->default('text')->after('body');
            }
            if (!Schema::hasColumn('messages', 'offer_amount')) {
                $table->decimal('offer_amount', 12, 2)->nullable()->after('type');
            }
            if (!Schema::hasColumn('messages', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('offer_amount');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('messages')) {
            return;
        }

        Schema::table('messages', function (Blueprint $table) {
            foreach (['conversation_id', 'body', 'type', 'offer_amount', 'read_at'] as $column) {
                if (Schema::hasColumn('messages', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->timestamp('moderation_submitted_at')->nullable()->after('status')->index();
            $table->string('ai_moderation_status', 32)->nullable()->after('moderation_submitted_at')->index();
            $table->text('ai_moderation_reason')->nullable()->after('ai_moderation_status');
            $table->decimal('ai_moderation_confidence', 5, 4)->nullable()->after('ai_moderation_reason');
            $table->timestamp('ai_moderated_at')->nullable()->after('ai_moderation_confidence');
            $table->boolean('generated_cover')->default(false)->after('ai_moderated_at');
        });

        DB::table('ads')
            ->where('status', 'pending')
            ->update([
                'moderation_submitted_at' => DB::raw('COALESCE(moderation_submitted_at, created_at)'),
                'ai_moderation_status' => DB::raw("COALESCE(ai_moderation_status, 'queued')"),
            ]);

        Schema::create('ad_moderation_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('ads')->cascadeOnDelete();
            $table->string('source', 20)->index();
            $table->string('decision', 32)->index();
            $table->text('reason')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->foreignId('moderator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['ad_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_moderation_decisions');

        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn([
                'moderation_submitted_at',
                'ai_moderation_status',
                'ai_moderation_reason',
                'ai_moderation_confidence',
                'ai_moderated_at',
                'generated_cover',
            ]);
        });
    }
};

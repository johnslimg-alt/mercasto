<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_measurement_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->date('period_start');
            $table->date('period_end');
            $table->timestamp('generated_at');
            $table->boolean('external_complete')->default(false);
            $table->json('report');
            $table->timestamps();

            $table->unique(['period_start', 'period_end']);
            $table->index(['generated_at', 'external_complete']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_measurement_snapshots');
    }
};

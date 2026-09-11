<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the campaign attribution captured in the browser at registration time.
 *
 * One row per registration (1:1 with users) so CAC, cost per registration and
 * cost per activated seller can be joined from spend → campaign → account.
 *
 * NOT yet applied to production: applying it is a separate operator decision.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('user_registration_attributions')) {
            return;
        }

        Schema::create('user_registration_attributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // How the account was created: email | phone | telegram | google | ...
            $table->string('registration_method', 40)->nullable();

            // Last-touch (or session) attribution, i.e. what brought this user in.
            $table->string('attribution_source', 180)->nullable();
            $table->string('attribution_medium', 180)->nullable();
            $table->string('attribution_campaign', 180)->nullable();
            $table->string('attribution_content', 180)->nullable();
            $table->string('attribution_term', 180)->nullable();
            $table->string('attribution_click_platform', 180)->nullable();
            $table->string('attribution_channel', 180)->nullable();
            $table->string('attribution_referrer_host', 180)->nullable();
            $table->boolean('attribution_paid')->default(false);
            $table->boolean('attribution_ai_referral')->default(false);
            $table->string('attribution_landing_path', 300)->nullable();

            // First-touch attribution, kept separately for true acquisition cost.
            $table->string('first_touch_source', 180)->nullable();
            $table->string('first_touch_medium', 180)->nullable();
            $table->string('first_touch_campaign', 180)->nullable();
            $table->string('first_touch_content', 180)->nullable();
            $table->string('first_touch_term', 180)->nullable();
            $table->string('first_touch_landing_path', 300)->nullable();
            $table->boolean('first_touch_paid')->default(false);

            $table->timestamp('attribution_captured_at')->nullable();
            $table->timestamps();

            $table->index('registration_method');
            $table->index('attribution_campaign');
            $table->index('first_touch_campaign');
            $table->index(['attribution_source', 'attribution_medium']);
            $table->index('attribution_captured_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_registration_attributions');
    }
};

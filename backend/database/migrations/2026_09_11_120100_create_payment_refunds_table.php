<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Refund ledger.
 *
 * Refund notifications were previously discarded before they could touch a
 * payment (`PaymentController::handleWebhook` returned early on any resource
 * that was not CHECKOUT), so no refund was ever persisted and "0 refunds"
 * meant "invisible", not "none".
 *
 * One row per provider refund event, deduplicated by `provider_refund_id`
 * (a deterministic key derived from the provider payload). Webhook retries
 * therefore insert nothing new and `payments.refunded_amount` — which is
 * always recomputed as the SUM of applied rows — cannot double count.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment_refunds')) {
            return;
        }

        Schema::create('payment_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('provider')->default('clip');
            // Deterministic idempotency key: the provider refund/dispute id
            // when the payload carries one, otherwise a hash of the stable
            // identity fields of the notification.
            $table->string('provider_refund_id');
            // refunded | refund_pending | disputed
            $table->string('state', 32);
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('currency', 3)->default('MXN');
            // Sanitized metadata only: no card data, no payer identity.
            $table->json('payload')->nullable();
            $table->timestamp('recorded_at')->nullable();
            // NULL until the refund is folded into payments.refunded_amount.
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();

            $table->unique('provider_refund_id');
            $table->index(['payment_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_refunds');
    }
};

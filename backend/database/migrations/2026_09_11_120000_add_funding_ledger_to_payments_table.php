<?php

use App\Support\PaymentLedger;
use App\Support\PaymentLedgerBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Give the money table a funding ledger.
 *
 * Before this migration `status = paid` could mean four different things
 * (a verified Clip webhook, an operator reconciliation note, an internal
 * account-balance transfer, or a bare Clip checkout id with no provider
 * proof), and there was nowhere to store a fee or a refund. Reported revenue
 * and real cash were indistinguishable.
 *
 * The backfill is additive and idempotent: it only fills columns that are
 * still NULL (or the `unknown` placeholder), never overwrites a value that is
 * already set, and skips rows flagged `funding_source_locked`. Running the
 * same migration body twice produces zero additional updates.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        $this->addColumn('funding_source', function (Blueprint $table): void {
            $table->enum('funding_source', PaymentLedger::FUNDING_SOURCES)->nullable();
        });

        $this->addColumn('funding_source_locked', function (Blueprint $table): void {
            $table->boolean('funding_source_locked')->default(false);
        });

        $this->addColumn('fee_rate_applied', function (Blueprint $table): void {
            $table->decimal('fee_rate_applied', 6, 4)->nullable();
        });

        $this->addColumn('fee_amount', function (Blueprint $table): void {
            $table->decimal('fee_amount', 10, 2)->nullable();
        });

        $this->addColumn('net_amount', function (Blueprint $table): void {
            $table->decimal('net_amount', 10, 2)->nullable();
        });

        $this->addColumn('refunded_amount', function (Blueprint $table): void {
            $table->decimal('refunded_amount', 10, 2)->default(0);
        });

        $this->addColumn('refunded_at', function (Blueprint $table): void {
            $table->timestamp('refunded_at')->nullable();
        });

        $this->addColumn('settled_at', function (Blueprint $table): void {
            $table->timestamp('settled_at')->nullable();
        });

        $this->addIndex('payments_funding_source_index', ['funding_source']);
        $this->addIndex('payments_settled_at_index', ['settled_at']);

        // Derive the funding source for every historical row. Fee and net are
        // filled from the (currently unset) CLIP_FEE_RATE parameter: with no
        // configured rate fee_amount stays 0.00 and net_amount equals the
        // charged amount, which is the honest default while no rate exists.
        (new PaymentLedgerBackfill)->run();
    }

    public function down(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        foreach (['payments_funding_source_index', 'payments_settled_at_index'] as $index) {
            try {
                Schema::table('payments', function (Blueprint $table) use ($index): void {
                    $table->dropIndex($index);
                });
            } catch (Throwable) {
                // Index already absent; dropping the columns is what matters.
            }
        }

        foreach ([
            'settled_at',
            'refunded_at',
            'refunded_amount',
            'net_amount',
            'fee_amount',
            'fee_rate_applied',
            'funding_source_locked',
            'funding_source',
        ] as $column) {
            if (Schema::hasColumn('payments', $column)) {
                Schema::table('payments', function (Blueprint $table) use ($column): void {
                    $table->dropColumn($column);
                });
            }
        }
    }

    private function addColumn(string $column, callable $definition): void
    {
        if (Schema::hasColumn('payments', $column)) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) use ($definition): void {
            $definition($table);
        });
    }

    /**
     * @param  array<int, string>  $columns
     */
    private function addIndex(string $name, array $columns): void
    {
        $exists = collect(Schema::getIndexes('payments'))
            ->contains(static fn (array $index): bool => ($index['name'] ?? null) === $name);

        if ($exists) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) use ($columns, $name): void {
            $table->index($columns, $name);
        });
    }
};

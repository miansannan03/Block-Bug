<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('bug_blockchain_events')) {
            Schema::create('bug_blockchain_events', function (Blueprint $table): void {
                $table->string('id', 36)->primary();
                $table->string('bug_id', 36)->index();
                $table->string('action', 64);
                $table->enum('sync_status', ['pending', 'synced', 'failed'])->default('pending')->index();
                $table->string('transaction_hash', 100)->nullable()->index();
                $table->unsignedBigInteger('blockchain_event_id')->nullable();
                $table->string('bug_chain_id', 66)->nullable()->index();
                $table->string('contract_address', 42)->nullable();
                $table->string('created_by_email', 180)->nullable();
                $table->longText('metadata_json')->nullable();
                $table->longText('service_response')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamps();
                $table->foreign('bug_id')->references('id')->on('bugs')->cascadeOnDelete();
            });
        }

        Schema::table('bugs', function (Blueprint $table): void {
            if (! Schema::hasColumn('bugs', 'blockchain_last_tx_hash')) {
                $table->string('blockchain_last_tx_hash', 100)->nullable();
            }
            if (! Schema::hasColumn('bugs', 'blockchain_last_sync_status')) {
                $table->enum('blockchain_last_sync_status', ['synced', 'failed'])->nullable();
            }
            if (! Schema::hasColumn('bugs', 'blockchain_last_event_id')) {
                $table->unsignedBigInteger('blockchain_last_event_id')->nullable();
            }
            if (! Schema::hasColumn('bugs', 'blockchain_bug_chain_id')) {
                $table->string('blockchain_bug_chain_id', 66)->nullable();
            }
            if (! Schema::hasColumn('bugs', 'blockchain_last_synced_at')) {
                $table->timestamp('blockchain_last_synced_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bug_blockchain_events');

        Schema::table('bugs', function (Blueprint $table): void {
            $columns = [
                'blockchain_last_tx_hash',
                'blockchain_last_sync_status',
                'blockchain_last_event_id',
                'blockchain_bug_chain_id',
                'blockchain_last_synced_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('bugs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

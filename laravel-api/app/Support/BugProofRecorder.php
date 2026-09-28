<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Records the proof history consumed by the UI in MySQL only.
 * This class does not call, start, or emulate the legacy blockchain code.
 */
class BugProofRecorder
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        string $bugId,
        string $action,
        ?string $actorEmail,
        array $metadata = [],
        DateTimeInterface|string|null $occurredAt = null,
        ?string $sourceKey = null,
    ): void {
        if (! Schema::hasTable('bug_blockchain_events') || ! Schema::hasColumn('bugs', 'blockchain_last_tx_hash')) {
            return;
        }

        $occurredAt ??= now();
        $sourceKey ??= (string) Str::uuid();
        $metadata = ['proofMode' => 'database', 'sourceKey' => $sourceKey] + $metadata;
        $metadataJson = json_encode($metadata, JSON_THROW_ON_ERROR);
        $fingerprint = json_encode([
            'bugId' => $bugId,
            'action' => $action,
            'actorEmail' => $actorEmail,
            'metadata' => $metadata,
            'occurredAt' => $occurredAt instanceof DateTimeInterface ? $occurredAt->format(DATE_ATOM) : $occurredAt,
        ], JSON_THROW_ON_ERROR);

        $transactionHash = '0x'.hash('sha256', $fingerprint);
        $bugChainId = '0x'.hash('sha256', 'blockbug:'.$bugId);
        $eventId = hexdec(substr(hash('sha256', 'event:'.$sourceKey), 0, 12));
        $id = 'proof-'.substr(hash('sha256', $sourceKey), 0, 24);

        DB::table('bug_blockchain_events')->updateOrInsert(
            ['id' => $id],
            [
                'bug_id' => $bugId,
                'action' => $action,
                'sync_status' => 'synced',
                'transaction_hash' => $transactionHash,
                'blockchain_event_id' => $eventId,
                'bug_chain_id' => $bugChainId,
                'contract_address' => null,
                'created_by_email' => $actorEmail,
                'metadata_json' => $metadataJson,
                'service_response' => json_encode([
                    'ok' => true,
                    'driver' => 'database',
                    'actualBlockchain' => false,
                ], JSON_THROW_ON_ERROR),
                'error_message' => null,
                'created_at' => $occurredAt,
                'updated_at' => $occurredAt,
            ],
        );

        $this->refreshBugSummary($bugId);
    }

    private function refreshBugSummary(string $bugId): void
    {
        $latest = DB::table('bug_blockchain_events')
            ->where('bug_id', $bugId)
            ->where('sync_status', 'synced')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        if (! $latest) {
            return;
        }

        DB::table('bugs')->where('id', $bugId)->update([
            'blockchain_last_tx_hash' => $latest->transaction_hash,
            'blockchain_last_sync_status' => 'synced',
            'blockchain_last_event_id' => $latest->blockchain_event_id,
            'blockchain_bug_chain_id' => $latest->bug_chain_id,
            'blockchain_last_synced_at' => $latest->updated_at,
        ]);
    }
}

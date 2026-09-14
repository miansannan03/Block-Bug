/*
LEGACY BLOCKCHAIN MIGRATION - intentionally commented out.
The active Laravel schema contains no blockchain tables or columns.

CREATE TABLE IF NOT EXISTS bug_blockchain_events (
  id VARCHAR(36) PRIMARY KEY,
  bug_id VARCHAR(36) NOT NULL,
  action VARCHAR(64) NOT NULL,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  transaction_hash VARCHAR(100) NULL,
  blockchain_event_id BIGINT NULL,
  contract_address VARCHAR(42) NULL,
  created_by_email VARCHAR(180) NULL,
  metadata_json TEXT NULL,
  service_response TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT bug_blockchain_events_bug_fk FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE
);

CREATE INDEX bug_blockchain_events_bug_idx ON bug_blockchain_events (bug_id);
CREATE INDEX bug_blockchain_events_status_idx ON bug_blockchain_events (sync_status);
CREATE INDEX bug_blockchain_events_tx_idx ON bug_blockchain_events (transaction_hash);

ALTER TABLE bugs
  ADD COLUMN blockchain_last_tx_hash VARCHAR(100) NULL,
  ADD COLUMN blockchain_last_sync_status VARCHAR(20) NULL CHECK (blockchain_last_sync_status IN ('synced', 'failed')),
  ADD COLUMN blockchain_last_event_id BIGINT NULL,
  ADD COLUMN blockchain_last_synced_at TIMESTAMP NULL;
*/

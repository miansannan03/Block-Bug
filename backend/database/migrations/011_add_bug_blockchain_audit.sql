CREATE TABLE IF NOT EXISTS bug_blockchain_events (
  id VARCHAR(36) PRIMARY KEY,
  bug_id VARCHAR(36) NOT NULL,
  action VARCHAR(64) NOT NULL,
  sync_status ENUM('pending', 'synced', 'failed') NOT NULL DEFAULT 'pending',
  transaction_hash VARCHAR(100) NULL,
  blockchain_event_id BIGINT NULL,
  contract_address VARCHAR(42) NULL,
  created_by_email VARCHAR(180) NULL,
  metadata_json LONGTEXT NULL,
  service_response LONGTEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT bug_blockchain_events_bug_fk FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
  INDEX bug_blockchain_events_bug_idx (bug_id),
  INDEX bug_blockchain_events_status_idx (sync_status),
  INDEX bug_blockchain_events_tx_idx (transaction_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE bugs
  ADD COLUMN blockchain_last_tx_hash VARCHAR(100) NULL AFTER verified_at,
  ADD COLUMN blockchain_last_sync_status ENUM('synced', 'failed') NULL AFTER blockchain_last_tx_hash,
  ADD COLUMN blockchain_last_event_id BIGINT NULL AFTER blockchain_last_sync_status,
  ADD COLUMN blockchain_last_synced_at TIMESTAMP NULL AFTER blockchain_last_event_id;

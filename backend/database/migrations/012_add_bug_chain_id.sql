/*
LEGACY BLOCKCHAIN MIGRATION - intentionally commented out.
The active Laravel schema contains no blockchain tables or columns.

ALTER TABLE bug_blockchain_events
  ADD COLUMN bug_chain_id VARCHAR(66) NULL;

CREATE INDEX bug_blockchain_events_chain_idx ON bug_blockchain_events (bug_chain_id);

ALTER TABLE bugs
  ADD COLUMN blockchain_bug_chain_id VARCHAR(66) NULL;
*/

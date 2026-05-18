ALTER TABLE bug_blockchain_events
  ADD COLUMN bug_chain_id VARCHAR(66) NULL AFTER blockchain_event_id,
  ADD INDEX bug_blockchain_events_chain_idx (bug_chain_id);

ALTER TABLE bugs
  ADD COLUMN blockchain_bug_chain_id VARCHAR(66) NULL AFTER blockchain_last_event_id;

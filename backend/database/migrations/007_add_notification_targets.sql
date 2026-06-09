ALTER TABLE notifications
  ADD COLUMN entity_type VARCHAR(40) NULL,
  ADD COLUMN entity_id VARCHAR(80) NULL,
  ADD COLUMN target_page VARCHAR(40) NULL;

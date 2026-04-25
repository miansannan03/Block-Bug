ALTER TABLE notifications
  ADD COLUMN entity_type VARCHAR(40) NULL AFTER type,
  ADD COLUMN entity_id VARCHAR(80) NULL AFTER entity_type,
  ADD COLUMN target_page VARCHAR(40) NULL AFTER entity_id;

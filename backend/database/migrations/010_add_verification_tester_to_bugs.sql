ALTER TABLE bugs
  ADD COLUMN verification_tester_email VARCHAR(180) NULL AFTER reported_by;

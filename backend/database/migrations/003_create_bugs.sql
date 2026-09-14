CREATE TABLE IF NOT EXISTS bugs (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  severity VARCHAR(20) NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  project_id VARCHAR(36) NOT NULL,
  assigned_to VARCHAR(180) NULL,
  reported_by VARCHAR(180) NOT NULL,
  steps_to_reproduce TEXT NULL,
  expected_result TEXT NULL,
  actual_result TEXT NULL,
  environment VARCHAR(255) NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT bugs_project_id_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

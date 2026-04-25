CREATE TABLE IF NOT EXISTS bugs (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in-progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  severity ENUM('minor', 'major', 'critical') NOT NULL DEFAULT 'minor',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  login_email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN org_id VARCHAR(36) NULL AFTER id,
  ADD INDEX users_org_idx (org_id),
  ADD CONSTRAINT users_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE projects
  ADD COLUMN org_id VARCHAR(36) NULL AFTER id,
  ADD INDEX projects_org_idx (org_id),
  ADD CONSTRAINT projects_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE bugs
  ADD COLUMN org_id VARCHAR(36) NULL AFTER id,
  ADD INDEX bugs_org_idx (org_id),
  ADD CONSTRAINT bugs_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE activities
  ADD COLUMN org_id VARCHAR(36) NULL AFTER id,
  ADD INDEX activities_org_idx (org_id),
  ADD CONSTRAINT activities_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD COLUMN org_id VARCHAR(36) NULL AFTER id,
  ADD INDEX notifications_org_idx (org_id),
  ADD CONSTRAINT notifications_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

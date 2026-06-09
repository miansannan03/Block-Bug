CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  login_email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organizations_login_email_unique UNIQUE (login_email)
);

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE users
  ADD COLUMN org_id VARCHAR(36) NULL,
  ADD CONSTRAINT users_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX users_org_idx ON users (org_id);

ALTER TABLE projects
  ADD COLUMN org_id VARCHAR(36) NULL,
  ADD CONSTRAINT projects_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX projects_org_idx ON projects (org_id);

ALTER TABLE bugs
  ADD COLUMN org_id VARCHAR(36) NULL,
  ADD CONSTRAINT bugs_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX bugs_org_idx ON bugs (org_id);

ALTER TABLE activities
  ADD COLUMN org_id VARCHAR(36) NULL,
  ADD CONSTRAINT activities_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX activities_org_idx ON activities (org_id);

ALTER TABLE notifications
  ADD COLUMN org_id VARCHAR(36) NULL,
  ADD CONSTRAINT notifications_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX notifications_org_idx ON notifications (org_id);

CREATE TABLE IF NOT EXISTS sprints (
  id VARCHAR(36) PRIMARY KEY,
  org_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  goal TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by VARCHAR(180) NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT sprints_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT sprints_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX sprints_org_idx ON sprints (org_id);
CREATE INDEX sprints_project_idx ON sprints (project_id);
CREATE INDEX sprints_project_status_idx ON sprints (project_id, status);

ALTER TABLE bugs
  ADD COLUMN sprint_id VARCHAR(36) NULL,
  ADD CONSTRAINT bugs_sprint_fk FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL;
CREATE INDEX bugs_sprint_idx ON bugs (sprint_id);

CREATE TABLE IF NOT EXISTS sprint_bug_history (
  id VARCHAR(36) PRIMARY KEY,
  org_id VARCHAR(36) NOT NULL,
  bug_id VARCHAR(36) NOT NULL,
  from_sprint_id VARCHAR(36) NULL,
  to_sprint_id VARCHAR(36) NULL,
  moved_by VARCHAR(180) NULL,
  reason VARCHAR(160) NOT NULL,
  moved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sprint_bug_history_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT sprint_bug_history_bug_fk FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
  CONSTRAINT sprint_bug_history_from_fk FOREIGN KEY (from_sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
  CONSTRAINT sprint_bug_history_to_fk FOREIGN KEY (to_sprint_id) REFERENCES sprints(id) ON DELETE SET NULL
);

CREATE INDEX sprint_bug_history_org_idx ON sprint_bug_history (org_id);
CREATE INDEX sprint_bug_history_bug_idx ON sprint_bug_history (bug_id);
CREATE INDEX sprint_bug_history_from_idx ON sprint_bug_history (from_sprint_id);
CREATE INDEX sprint_bug_history_to_idx ON sprint_bug_history (to_sprint_id);

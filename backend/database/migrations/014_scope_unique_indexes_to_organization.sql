ALTER TABLE users
  DROP INDEX users_email_unique,
  ADD CONSTRAINT users_org_email_unique UNIQUE (org_id, email);

ALTER TABLE projects
  DROP INDEX projects_project_key_unique,
  ADD CONSTRAINT projects_org_key_unique UNIQUE (org_id, project_key);

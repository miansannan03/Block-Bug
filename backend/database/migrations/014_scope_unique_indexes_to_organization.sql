ALTER TABLE users
  DROP INDEX email,
  ADD UNIQUE KEY users_org_email_unique (org_id, email);

ALTER TABLE projects
  DROP INDEX project_key,
  ADD UNIQUE KEY projects_org_key_unique (org_id, project_key);

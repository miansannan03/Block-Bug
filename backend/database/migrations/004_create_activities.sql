CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(36) PRIMARY KEY,
  bug_id VARCHAR(36) NULL,
  type ENUM('created', 'status_changed', 'assigned', 'commented', 'verified') NOT NULL,
  user_id VARCHAR(180) NOT NULL,
  user_name VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_bug_id_fk FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

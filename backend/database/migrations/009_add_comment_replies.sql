ALTER TABLE bug_comments
  ADD COLUMN parent_comment_id VARCHAR(36) NULL,
  ADD CONSTRAINT bug_comments_parent_comment_id_fk
    FOREIGN KEY (parent_comment_id) REFERENCES bug_comments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  document_path VARCHAR(1024) NULL,
  document_mime_type VARCHAR(128) NULL,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_history_session (session_id),
  CONSTRAINT fk_chat_history_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
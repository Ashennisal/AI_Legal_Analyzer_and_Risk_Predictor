-- Run once against legal_analyzer_db (MySQL)
-- Stores user deadlines for the Calendar page and Google Calendar sync.

CREATE TABLE IF NOT EXISTS Events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_id INT NULL COMMENT 'Source document if extracted from analysis',
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT 'draft|synced|pending|cancelled',
  google_event_id VARCHAR(255) NULL,
  INDEX idx_events_user_date (user_id, event_date),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

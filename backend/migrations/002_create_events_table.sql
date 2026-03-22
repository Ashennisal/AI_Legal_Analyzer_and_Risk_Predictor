-- Google Calendar–backed event rows (mirrors archive Events table + user/document linkage).
-- Run once against your app database (same as MYSQL_DATABASE in backend/.env).

CREATE TABLE IF NOT EXISTS Events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_id INT NULL,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  google_event_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_title_date_time (user_id, title(191), event_date, event_time),
  KEY idx_user_date (user_id, event_date),
  KEY idx_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

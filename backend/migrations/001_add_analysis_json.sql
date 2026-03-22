-- Run once against legal_analyzer_db (MySQL)
-- Adds a column to persist full analysis results for the user dashboard.
-- If you see "Duplicate column name 'analysis_json'", the migration already ran.
--
-- One line avoids parser quirks in some clients when COMMENT and AFTER wrap across lines.

ALTER TABLE documents ADD COLUMN analysis_json LONGTEXT NULL COMMENT 'Full analyze API response JSON' AFTER clauses_detected;

@echo off
REM Database Migration Helper for AI Legal Analyzer

echo.
echo ====================================
echo Database Migration Setup
echo ====================================
echo.

echo Before running migrations, ensure:
echo - MySQL is running
echo - database "legal_analyzer_db" exists
echo - You have admin credentials
echo.

echo MIGRATION FILES:
echo 1. 001_add_analysis_json.sql - Add analysis_json column
echo 2. 002_create_events_table.sql - Create Events table
echo 3. 003_chat_assistant.sql - Create Chat tables
echo.

echo Follow these steps:
echo 1. Open MySQL Workbench or MySQL Command Line Client
echo 2. Use: USE legal_analyzer_db;
echo 3. Run each SQL file in order
echo.
echo EXAMPLE using MySQL CLI:
echo   C:\> mysql -u root -p legal_analyzer_db ^< 001_add_analysis_json.sql
echo   C:\> mysql -u root -p legal_analyzer_db ^< 002_create_events_table.sql
echo   C:\> mysql -u root -p legal_analyzer_db ^< 003_chat_assistant.sql
echo.

echo ====================================
echo Quick Check SQL (run in MySQL):
echo ====================================
echo.
echo SHOW TABLES;
echo DESCRIBE Events;
echo DESCRIBE chat_sessions;
echo DESCRIBE chat_history;
echo.

pause

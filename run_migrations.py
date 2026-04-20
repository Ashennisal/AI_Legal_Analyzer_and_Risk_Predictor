import mysql.connector
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parent / 'backend' / '.env'
load_dotenv(env_path)

# Database connection
try:
    connection = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        database=os.getenv("MYSQL_DATABASE", "legal_analyzer_db")
    )
    
    cursor = connection.cursor()
    
    # Migration files in order
    migration_files = [
        'backend/migrations/000_create_users_table.sql',
        'backend/migrations/001_add_analysis_json.sql',
        'backend/migrations/002_create_events_table.sql',
        'backend/migrations/003_chat_assistant.sql',
        'backend/migrations/004_documents_table.sql'

    ]
    
    print("Running database migrations...\n")
    
    for migration_file in migration_files:
        if Path(migration_file).exists():
            print(f"Running: {migration_file}")
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()
                # Split by semicolon and execute each statement
                statements = [s.strip() for s in sql.split(';') if s.strip()]
                for statement in statements:
                    try:
                        cursor.execute(statement)
                    except mysql.connector.Error as err:
                        if err.errno == 1060:  # Duplicate column
                            print(f"   Warning: Column already exists (skipped)")
                        elif err.errno == 1050:  # Table already exists
                            print(f"   Warning: Table already exists (skipped)")
                        else:
                            print(f"   Error: {err}")
                connection.commit()
            print(f"   Completed\n")
        else:
            print(f"   Error: File not found: {migration_file}\n")
    
    cursor.close()
    connection.close()
    print("All migrations completed successfully!")
    
except mysql.connector.Error as err:
    if err.errno == 2003:
        print("Error: Cannot connect to MySQL. Is the MySQL server running?")
    elif err.errno == 1045:
        print("Error: Access denied. Check MYSQL_USER and MYSQL_PASSWORD in backend/.env")
    elif err.errno == 1049:
        print("Error: Unknown database. Create 'legal_analyzer_db' in MySQL first.")
    else:
        print(f"Error: {err}")
except Exception as e:
    print(f"Error: {e}")

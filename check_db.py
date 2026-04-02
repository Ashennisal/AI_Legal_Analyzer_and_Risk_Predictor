import mysql.connector
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parent / 'backend' / '.env'
load_dotenv(env_path)

# Connect to database
try:
    connection = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        database=os.getenv("MYSQL_DATABASE", "legal_analyzer_db")
    )
    
    cursor = connection.cursor(dictionary=True)
    
    # Check documents table
    print("\n📊 Checking Documents Table:")
    print("=" * 60)
    cursor.execute("SELECT id, filename, user_id, risk_level, clauses_detected, uploaded_at FROM documents ORDER BY id DESC LIMIT 5")
    docs = cursor.fetchall()
    if docs:
        for doc in docs:
            print(f"ID: {doc['id']}, File: {doc['filename']}, Risk: {doc['risk_level']}, Clauses: {doc['clauses_detected']}, User: {doc['user_id']}")
    else:
        print("❌ No documents found!")
    
    # Check total count
    cursor.execute("SELECT COUNT(*) as count FROM documents")
    total = cursor.fetchone()['count']
    print(f"\n📈 Total Documents: {total}")
    
    # Check clauses sum
    cursor.execute("SELECT SUM(clauses_detected) as total FROM documents")
    clause_total = cursor.fetchone()['total'] or 0
    print(f"📋 Total Clauses Detected: {clause_total}")
    
    # Check risk distribution
    print("\n🎯 Risk Distribution:")
    cursor.execute("SELECT risk_level, COUNT(*) as count FROM documents GROUP BY risk_level")
    risks = cursor.fetchall()
    for risk in risks:
        print(f"  {risk['risk_level']}: {risk['count']}")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"❌ Error: {e}")

#!/usr/bin/env python3
"""Check users needing password migration"""

import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()
db = mysql.connector.connect(
    host=os.getenv('MYSQL_HOST'),
    user=os.getenv('MYSQL_USER'),
    password=os.getenv('MYSQL_PASSWORD'),
    database=os.getenv('MYSQL_DATABASE')
)
cursor = db.cursor(dictionary=True)

# Check plain-text passwords
cursor.execute("SELECT COUNT(*) as count FROM users WHERE password NOT LIKE '$2b$%'")
result = cursor.fetchone()
print(f"Users with plain-text passwords: {result['count']}")

# Show which users
cursor.execute("SELECT id, email, password FROM users")
users = cursor.fetchall()
for user in users:
    pwd_type = "HASHED" if user['password'].startswith('$2b$') else "PLAIN-TEXT"
    print(f"  - {user['email']}: {pwd_type}")

db.close()

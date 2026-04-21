#!/usr/bin/env python3
"""Direct password migration script - hashes all plain-text passwords"""

import mysql.connector
from dotenv import load_dotenv
import os
import sys

# Add parent directory to path to import password_utils
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from password_utils import hash_password

def migrate_passwords():
    load_dotenv()
    
    # Connect to database
    db = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST'),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE')
    )
    
    cursor = db.cursor(dictionary=True)
    
    # Get all users with plain-text passwords
    cursor.execute("SELECT id, email, password FROM users WHERE password NOT LIKE '$2b$%'")
    users = cursor.fetchall()
    
    if not users:
        print("✅ All passwords are already hashed!")
        db.close()
        return
    
    print(f"Found {len(users)} users with plain-text passwords. Starting migration...\n")
    
    updated_count = 0
    errors = []
    
    for i, user in enumerate(users, 1):
        try:
            print(f"[{i}/{len(users)}] Hashing password for {user['email']}...", end=" ", flush=True)
            
            # Hash the plain-text password
            hashed_password = hash_password(user['password'])
            
            # Update the database
            cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user['id']))
            db.commit()
            
            updated_count += 1
            print("✅")
            
        except Exception as e:
            errors.append(f"Error hashing password for {user['email']}: {str(e)}")
            print(f"❌ {e}")
    
    cursor.close()
    db.close()
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Migration Complete!")
    print(f"{'='*60}")
    print(f"Total users: {len(users)}")
    print(f"Successfully hashed: {updated_count}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"  ❌ {error}")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    migrate_passwords()

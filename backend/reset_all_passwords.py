#!/usr/bin/env python3
"""Generate new secure passwords for all users and update database"""

import mysql.connector
import secrets
import string
from dotenv import load_dotenv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/backend')
from password_utils import hash_password

def generate_secure_password():
    """Generate a strong password with uppercase, lowercase, number, and symbol"""
    password_chars = string.ascii_uppercase + string.ascii_lowercase + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(password_chars) for _ in range(16))
    return password

def reset_all_passwords():
    load_dotenv()
    
    db = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST'),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE')
    )
    
    cursor = db.cursor(dictionary=True)
    
    # Get all users
    cursor.execute("SELECT id, email FROM users ORDER BY id")
    users = cursor.fetchall()
    
    if not users:
        print("❌ No users found in database!")
        db.close()
        return
    
    print(f"\n{'='*70}")
    print(f"GENERATING NEW PASSWORDS FOR {len(users)} USERS")
    print(f"{'='*70}\n")
    
    new_passwords = {}
    
    for user in users:
        new_pass = generate_secure_password()
        hashed = hash_password(new_pass)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed, user['id']))
        new_passwords[user['email']] = new_pass
        print(f"✅ Reset password for: {user['email']}")
    
    db.commit()
    cursor.close()
    db.close()
    
    print(f"\n{'='*70}")
    print(f"NEW PASSWORDS FOR ALL USERS")
    print(f"{'='*70}\n")
    
    for email, password in new_passwords.items():
        print(f"Email: {email}")
        print(f"Password: {password}")
        print()
    
    print(f"\n{'='*70}")
    print(f"⚠️  SAVE THESE PASSWORDS SECURELY!")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    reset_all_passwords()

#!/usr/bin/env python3
"""Generate passwords based on user names with random numbers and symbols"""

import mysql.connector
import secrets
import string
from dotenv import load_dotenv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from password_utils import hash_password

def generate_password_from_name(name):
    """Generate password from name + random numbers and symbols"""
    # Capitalize first letter, use first part of name
    name_part = name.split()[0][:3].capitalize()  # First 3 letters capitalized
    
    # Add random lowercase letters, numbers, and symbols
    random_part = ''.join([
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ])
    
    # Combine and ensure at least 8 characters
    password = name_part + random_part
    
    return password

def reset_passwords_from_names():
    load_dotenv()
    
    db = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST'),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE')
    )
    
    cursor = db.cursor(dictionary=True)
    
    # Get all users
    cursor.execute("SELECT id, name, email FROM users ORDER BY id")
    users = cursor.fetchall()
    
    if not users:
        print("❌ No users found in database!")
        db.close()
        return
    
    print(f"\n{'='*70}")
    print(f"GENERATING PASSWORDS FROM USER NAMES")
    print(f"{'='*70}\n")
    
    new_passwords = {}
    
    for user in users:
        new_pass = generate_password_from_name(user['name'])
        hashed = hash_password(new_pass)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed, user['id']))
        new_passwords[user['email']] = (user['name'], new_pass)
        print(f"✅ Set password for: {user['email']} ({user['name']})")
    
    db.commit()
    cursor.close()
    db.close()
    
    print(f"\n{'='*70}")
    print(f"NEW PASSWORDS (Based on User Names)")
    print(f"{'='*70}\n")
    
    for email, (name, password) in new_passwords.items():
        print(f"Name: {name}")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print()
    
    print(f"{'='*70}\n")

if __name__ == "__main__":
    reset_passwords_from_names()

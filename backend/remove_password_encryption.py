#!/usr/bin/env python3
"""Revert hashed passwords back to plain text"""

import mysql.connector
from dotenv import load_dotenv
import os

# Plain text passwords for each user
PLAIN_PASSWORDS = {
    "nisal@admin.com": "Nisd94#",
    "mayu@user.com": "Maye34&",
    "malith@gmail.com": "Malx33$",
    "maleesha@gmail.com": "Malp77^",
    "abdul@gmail.com": "Kowj53@",
    "minduli@gmail.com": "Chay00@"
}

def revert_passwords():
    load_dotenv()
    
    db = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST'),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE')
    )
    
    cursor = db.cursor(dictionary=True)
    
    print(f"\n{'='*70}")
    print(f"REVERTING PASSWORDS TO PLAIN TEXT")
    print(f"{'='*70}\n")
    
    for email, password in PLAIN_PASSWORDS.items():
        cursor.execute("UPDATE users SET password = %s WHERE email = %s", (password, email))
        db.commit()
        print(f"✅ {email}: {password}")
    
    cursor.close()
    db.close()
    
    print(f"\n{'='*70}")
    print(f"All passwords reverted to plain text!")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    revert_passwords()

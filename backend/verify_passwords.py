#!/usr/bin/env python3
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
cursor.execute('SELECT email, password FROM users ORDER BY id')
rows = cursor.fetchall()
for row in rows:
    print(f"{row['email']}: {row['password']}")
db.close()

#!/usr/bin/env python3
"""Script to test password migration endpoint"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_password_migration():
    """Call the password migration endpoint"""
    print("Attempting to migrate all existing passwords to bcrypt hashes...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/admin/hash-existing-passwords", timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to backend at http://127.0.0.1:8000")
        print("Make sure the backend server is running with: python main.py")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_password_migration()

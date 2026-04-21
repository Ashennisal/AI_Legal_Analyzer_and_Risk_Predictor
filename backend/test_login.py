#!/usr/bin/env python3
"""Test login with one of the passwords"""

import requests
import json

def test_login():
    url = "http://127.0.0.1:8000/api/login"
    
    # Test login with nisal@admin.com
    payload = {
        "email": "nisal@admin.com",
        "password": "Nisd94#",
        "is_admin": True
    }
    
    print("Testing login with:")
    print(f"  Email: {payload['email']}")
    print(f"  Password: {payload['password']}")
    print(f"  Admin: {payload['is_admin']}")
    print()
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_login()

import requests
import json

# Test the analytics API
try:
    response = requests.get('http://127.0.0.1:8000/api/admin/analytics')
    print("📊 Analytics API Response:")
    print("=" * 60)
    print(json.dumps(response.json(), indent=2))
    
    data = response.json()
    print(f"\n✅ Timeline Data Points: {len(data.get('timelineData', []))}")
    print(f"✅ Risk Data Points: {len(data.get('riskData', []))}")
    print(f"✅ Clause Data Points: {len(data.get('clauseData', []))}")
    
except Exception as e:
    print(f"❌ Error: {e}")

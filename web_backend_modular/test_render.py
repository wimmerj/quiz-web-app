#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick test script for Render.com deployment
Run this after deploying to verify everything works
"""

import requests
import time
import sys

def test_render_deployment(service_url):
    """
    Quick test of deployed backend on Render.com
    
    Args:
        service_url: Your Render service URL (e.g., https://your-service.onrender.com)
    """
    
    print(f"🚀 Testing Render.com deployment: {service_url}")
    print("=" * 60)
    
    # Test 1: Health Check
    print("\n🔍 Test 1: Health Check")
    try:
        response = requests.get(f"{service_url}/api/health", timeout=30)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check OK")
            print(f"   Status: {data.get('status')}")
            print(f"   Database: {data.get('database')}")
            print(f"   Monica AI: {data.get('monica_ai')}")
            print(f"   Version: {data.get('version')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        print("   Note: First request after deploy can take 30-60 seconds (cold start)")
        return False
    
    # Test 2: API Info
    print("\n🔍 Test 2: API Info")
    try:
        response = requests.get(f"{service_url}/api/info", timeout=15)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API info OK")
            print(f"   Name: {data.get('name')}")
            print(f"   Features: {len(data.get('features', {}))}")
            print(f"   Endpoints: {len(data.get('endpoints', {}))}")
        else:
            print(f"❌ API info failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API info error: {str(e)}")
    
    # Test 3: Registration (create test user)
    print("\n🔍 Test 3: User Registration")
    test_user = {
        "username": f"test_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com", 
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{service_url}/api/auth/register", json=test_user, timeout=15)
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Registration OK")
            print(f"   User: {data['user']['username']}")
            print(f"   Role: {data['user']['role']}")
            token = data.get('token')
            
            # Test 4: Profile with token
            print("\n🔍 Test 4: Authenticated Request")
            headers = {"Authorization": f"Bearer {token}"}
            profile_response = requests.get(f"{service_url}/api/auth/profile", headers=headers, timeout=15)
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print(f"✅ Profile access OK")
                print(f"   Username: {profile_data['user']['username']}")
                print(f"   Created: {profile_data['user']['created_at']}")
            else:
                print(f"❌ Profile access failed: {profile_response.status_code}")
            
        else:
            print(f"❌ Registration failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
    
    # Test 5: Quiz Tables
    print("\n🔍 Test 5: Quiz Data")
    try:
        # Try with admin credentials
        admin_login = {"username": "admin", "password": "admin123"}
        login_response = requests.post(f"{service_url}/api/auth/login", json=admin_login, timeout=15)
        
        if login_response.status_code == 200:
            admin_data = login_response.json()
            admin_token = admin_data.get('token')
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Get quiz tables
            tables_response = requests.get(f"{service_url}/api/quiz/tables", headers=headers, timeout=15)
            
            if tables_response.status_code == 200:
                tables_data = tables_response.json()
                tables = tables_data.get('tables', [])
                print(f"✅ Quiz data OK")
                print(f"   Tables: {len(tables)}")
                for table in tables[:3]:  # Show first 3
                    print(f"   - {table['display_name']}: {table['question_count']} questions")
            else:
                print(f"❌ Quiz tables failed: {tables_response.status_code}")
        else:
            print(f"❌ Admin login failed: {login_response.status_code}")
    except Exception as e:
        print(f"❌ Quiz data error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🎉 Render.com deployment test completed!")
    print(f"🌐 Your backend is running at: {service_url}")
    print(f"📊 Health check: {service_url}/api/health")
    print(f"📖 API info: {service_url}/api/info")
    print("\n👤 Default accounts:")
    print("   Admin: admin / admin123")
    print("   Student: student / student123")
    
    return True

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python test_render.py <your-service-url>")
        print("Example: python test_render.py https://quiz-modular-backend.onrender.com")
        return
    
    service_url = sys.argv[1]
    
    # Clean up URL
    if not service_url.startswith('http'):
        service_url = f"https://{service_url}"
    
    service_url = service_url.rstrip('/')
    
    # Add warning about cold start
    print("⚠️  Note: First request after deployment can take 30-60 seconds")
    print("   This is normal for Render.com free tier (cold start)")
    print("   Please be patient...")
    print()
    
    # Run tests
    test_render_deployment(service_url)

if __name__ == '__main__':
    main()

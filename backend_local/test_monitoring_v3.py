#!/usr/bin/env python3
"""
Test script for Enhanced Quiz Server Manager v3.0
Tests the new monitoring functionality
"""

import requests
import json
import time
import threading

def test_monitoring_api(port=5000):
    """Test the new monitoring API endpoints"""
    base_url = f"http://localhost:{port}"
    
    print("🧪 Testing Enhanced Quiz Server Manager v3.0 Monitoring API")
    print("=" * 60)
    
    # Test health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check OK")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test user monitoring endpoint
    print("\n2. Testing user monitoring endpoint...")
    try:
        response = requests.get(f"{base_url}/api/monitoring/users", timeout=5)
        if response.status_code == 200:
            data = response.json()['data']
            print("✅ User monitoring endpoint OK")
            print(f"   Total users: {data['total_users']}")
            print(f"   Active users: {data['active_users']}")
            print(f"   New users today: {data['new_users_today']}")
            print(f"   Recent registrations: {len(data['recent_registrations'])}")
        else:
            print(f"❌ User monitoring failed: {response.status_code}")
    except Exception as e:
        print(f"❌ User monitoring error: {e}")
    
    # Test stats monitoring endpoint
    print("\n3. Testing stats monitoring endpoint...")
    try:
        response = requests.get(f"{base_url}/api/monitoring/stats", timeout=5)
        if response.status_code == 200:
            data = response.json()['data']
            print("✅ Stats monitoring endpoint OK")
            print(f"   Active users: {data['active_users']}")
            print(f"   Total answers: {data['total_answers']}")
            print(f"   Success rate: {data['success_rate']}%")
            print(f"   Monica calls: {data['monica_calls']}")
        else:
            print(f"❌ Stats monitoring failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Stats monitoring error: {e}")
    
    # Test user registration
    print("\n4. Testing user registration monitoring...")
    test_username = f"testuser_{int(time.time())}"
    try:
        # Register a test user
        reg_data = {
            "username": test_username,
            "password": "testpass123",
            "email": f"{test_username}@test.com"
        }
        
        response = requests.post(f"{base_url}/api/auth/register", 
                               json=reg_data, timeout=5)
        
        if response.status_code == 201:
            print(f"✅ Test user '{test_username}' registered successfully")
            
            # Wait a moment and check if it appears in monitoring
            time.sleep(2)
            
            response = requests.get(f"{base_url}/api/monitoring/users", timeout=5)
            if response.status_code == 200:
                data = response.json()['data']
                recent_users = [u['username'] for u in data['recent_registrations']]
                
                if test_username in recent_users:
                    print(f"✅ Test user appears in monitoring data")
                else:
                    print(f"⚠️ Test user not yet visible in monitoring (may take a moment)")
            
        else:
            print(f"❌ Test user registration failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Registration test error: {e}")
    
    print("\n" + "=" * 60)
    print("🏁 Monitoring API test completed!")
    print("\n💡 To test the GUI:")
    print("   1. Run: python enhanced_gui.py")
    print("   2. Click 'Quick Start Enhanced'")
    print("   3. Go to 'Real-time Monitoring' tab")
    print("   4. Register new users via the web interface")
    print("   5. Watch real-time notifications in the GUI")

def test_continuous_monitoring(port=5000, duration=30):
    """Test continuous monitoring for a specified duration"""
    base_url = f"http://localhost:{port}"
    print(f"\n🔄 Starting continuous monitoring test for {duration} seconds...")
    
    start_time = time.time()
    last_user_count = 0
    
    while time.time() - start_time < duration:
        try:
            response = requests.get(f"{base_url}/api/monitoring/users", timeout=5)
            if response.status_code == 200:
                data = response.json()['data']
                current_count = data['total_users']
                
                if current_count != last_user_count:
                    print(f"[{time.strftime('%H:%M:%S')}] User count changed: {last_user_count} → {current_count}")
                    if current_count > last_user_count:
                        recent = data['recent_registrations'][0] if data['recent_registrations'] else None
                        if recent:
                            print(f"   🆕 Latest user: {recent['username']} ({recent['email']})")
                    last_user_count = current_count
                
            time.sleep(5)  # Check every 5 seconds
            
        except Exception as e:
            print(f"❌ Monitoring check error: {e}")
            time.sleep(5)
    
    print("✅ Continuous monitoring test completed")

if __name__ == "__main__":
    import sys
    
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number")
            sys.exit(1)
    
    print(f"Testing on port {port}")
    
    # Basic API test
    test_monitoring_api(port)
    
    # Ask if user wants continuous monitoring
    try:
        choice = input("\n🤔 Run continuous monitoring test? (y/N): ").lower().strip()
        if choice in ['y', 'yes']:
            test_continuous_monitoring(port, 60)  # 1 minute test
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")

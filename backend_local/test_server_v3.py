#!/usr/bin/env python3
"""
Enhanced Quiz Server Test Script
Tests the server startup and basic functionality
"""

import subprocess
import time
import requests
import sys
import os

def print_header():
    print("=" * 60)
    print("Enhanced Quiz Server Manager v3.0 - Server Test")
    print("=" * 60)
    print()

def test_server_startup():
    """Test server startup independently"""
    print("🚀 Testing server startup...")
    
    try:
        # Start server process
        cmd = [sys.executable, "enhanced_backend_fixed.py", "5000"]
        print(f"📝 Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print("⏱️ Waiting for server to start (10 seconds)...")
        
        # Give server time to start
        time.sleep(10)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Server process is running")
            
            # Test health endpoint
            try:
                response = requests.get("http://localhost:5000/api/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Health check passed")
                    data = response.json()
                    print(f"   Status: {data.get('status')}")
                    print(f"   Version: {data.get('version')}")
                else:
                    print(f"❌ Health check failed: HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ Health check failed: {e}")
            
            # Stop the server
            print("⏹️ Stopping server...")
            process.terminate()
            
            try:
                process.wait(timeout=5)
                print("✅ Server stopped cleanly")
            except subprocess.TimeoutExpired:
                process.kill()
                print("🔥 Server force killed")
            
        else:
            print("❌ Server process exited")
            exit_code = process.returncode
            print(f"   Exit code: {exit_code}")
            
            # Read output
            stdout, stderr = process.communicate()
            
            if stdout:
                print("📤 STDOUT:")
                print(stdout)
            
            if stderr:
                print("🔴 STDERR:")
                print(stderr)
        
    except Exception as e:
        print(f"❌ Error testing server: {e}")

def test_dependencies():
    """Test all dependencies"""
    print("🔍 Testing dependencies...")
    
    dependencies = [
        'flask',
        'flask_cors',
        'requests',
        'jwt',
        'bcrypt'
    ]
    
    all_ok = True
    for dep in dependencies:
        try:
            __import__(dep)
            print(f"   ✅ {dep}")
        except ImportError:
            print(f"   ❌ {dep} - MISSING")
            all_ok = False
    
    return all_ok

def test_database():
    """Test database"""
    print("🗄️ Testing database...")
    
    db_path = "enhanced_quiz.db"
    if os.path.exists(db_path):
        print(f"   ✅ Database found: {db_path}")
        
        # Test connection
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            conn.close()
            print(f"   ✅ Database connection OK ({count} users)")
            return True
        except Exception as e:
            print(f"   ❌ Database connection failed: {e}")
            return False
    else:
        print(f"   ❌ Database not found: {db_path}")
        return False

def main():
    """Main test function"""
    print_header()
    
    # Test dependencies
    deps_ok = test_dependencies()
    print()
    
    # Test database
    db_ok = test_database()
    print()
    
    if not deps_ok:
        print("⚠️ Missing dependencies. Run: install_dependencies_v3.bat")
        return False
    
    if not db_ok:
        print("⚠️ Database issues. Run: python create_enhanced_database.py")
        return False
    
    # Test server startup
    test_server_startup()
    
    print()
    print("🏁 Test completed!")
    return True

if __name__ == "__main__":
    try:
        success = main()
        input("\nPress Enter to continue...")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 Test cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during test: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to continue...")
        sys.exit(1)

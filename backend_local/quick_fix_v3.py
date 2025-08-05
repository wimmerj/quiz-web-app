#!/usr/bin/env python3
"""
Enhanced Quiz Server v3.0 - Quick Fix Tool
Fixes common issues with the Enhanced Quiz Server Manager
"""

import os
import sys
import subprocess
import sqlite3
from datetime import datetime

def print_header():
    print("=" * 60)
    print("Enhanced Quiz Server Manager v3.0 - Quick Fix Tool")
    print("=" * 60)
    print()

def check_dependencies():
    """Check and fix dependency issues"""
    print("🔍 Checking dependencies...")
    
    dependencies = {
        'flask': 'Flask',
        'flask_cors': 'Flask-CORS',
        'requests': 'requests',
        'jwt': 'PyJWT', 
        'bcrypt': 'bcrypt'
    }
    
    missing = []
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n💊 Installing missing packages: {', '.join(missing)}")
        for package in missing:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"   ✅ Installed {package}")
            except Exception as e:
                print(f"   ❌ Failed to install {package}: {e}")
        return len(missing) == 0
    else:
        print("   ✅ All dependencies OK")
        return True

def check_database():
    """Check and fix database issues"""
    print("\n🗄️ Checking database...")
    
    db_path = "enhanced_quiz.db"
    if not os.path.exists(db_path):
        print(f"   ❌ Database not found: {db_path}")
        print("   💊 Creating database...")
        try:
            subprocess.run([sys.executable, "create_enhanced_database.py"], check=True)
            print("   ✅ Database created")
            return True
        except Exception as e:
            print(f"   ❌ Failed to create database: {e}")
            return False
    else:
        print(f"   ✅ Database found: {db_path}")
        
        # Check database integrity
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            required_tables = ['users', 'user_settings', 'user_results', 'system_logs', 'monica_api_calls']
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                print(f"   ⚠️ Missing tables: {', '.join(missing_tables)}")
                print("   💊 Recreating database...")
                conn.close()
                os.rename(db_path, f"{db_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                subprocess.run([sys.executable, "create_enhanced_database.py"], check=True)
                print("   ✅ Database recreated")
            else:
                print(f"   ✅ All required tables present: {len(tables)} tables")
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"   ❌ Database check failed: {e}")
            return False

def check_files():
    """Check required files"""
    print("\n📁 Checking required files...")
    
    required_files = [
        "enhanced_gui.py",
        "enhanced_backend_fixed.py",
        "create_enhanced_database.py"
    ]
    
    missing_files = []
    for file in required_files:
        if os.path.exists(file):
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file} - MISSING")
            missing_files.append(file)
    
    if missing_files:
        print(f"   ⚠️ Missing files: {', '.join(missing_files)}")
        print("   💡 Please ensure all files are in the correct directory")
        return False
    else:
        print("   ✅ All required files present")
        return True

def fix_permissions():
    """Fix file permissions"""
    print("\n🔐 Checking file permissions...")
    
    try:
        # Test write permissions
        test_file = "test_permissions.tmp"
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        print("   ✅ Write permissions OK")
        return True
    except Exception as e:
        print(f"   ❌ Permission error: {e}")
        print("   💡 Try running as administrator")
        return False

def fix_port_issues():
    """Check for port conflicts"""
    print("\n🚪 Checking port availability...")
    
    import socket
    
    ports_to_check = [5000, 8000]
    
    for port in ports_to_check:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('localhost', port))
            sock.close()
            print(f"   ✅ Port {port} available")
        except socket.error:
            print(f"   ⚠️ Port {port} in use (may be OK if server is running)")
    
    return True

def run_diagnostics():
    """Run comprehensive diagnostics"""
    print("\n🔬 Running diagnostics...")
    
    print(f"   Python version: {sys.version}")
    print(f"   Platform: {sys.platform}")
    print(f"   Working directory: {os.getcwd()}")
    print(f"   Python executable: {sys.executable}")
    
    return True

def main():
    """Main fix function"""
    print_header()
    
    checks = [
        ("Dependencies", check_dependencies),
        ("Database", check_database), 
        ("Files", check_files),
        ("Permissions", fix_permissions),
        ("Ports", fix_port_issues),
        ("Diagnostics", run_diagnostics)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"   ❌ {check_name} check failed: {e}")
            results.append((check_name, False))
    
    print("\n" + "=" * 60)
    print("🏁 Fix Summary:")
    print("=" * 60)
    
    all_passed = True
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {check_name}")
        if not result:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 All checks passed! Enhanced Quiz Server Manager v3.0 should work correctly.")
        print("\n🚀 To start the application:")
        print("   python enhanced_gui.py")
        print("   or run: start_enhanced_gui_v3.bat")
    else:
        print("⚠️ Some issues detected. Please review the output above.")
        print("\n💡 Common solutions:")
        print("   1. Run: install_dependencies_v3.bat")
        print("   2. Run as administrator")
        print("   3. Check antivirus software")
        print("   4. Restart Windows and try again")
    
    return all_passed

if __name__ == "__main__":
    try:
        success = main()
        input("\nPress Enter to continue...")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 Fix cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during fix: {e}")
        input("Press Enter to continue...")
        sys.exit(1)

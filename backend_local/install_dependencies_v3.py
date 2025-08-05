#!/usr/bin/env python3
"""
Enhanced Quiz Server v3.0 - Dependency Installer
Installs all required dependencies for the Enhanced Quiz Server Manager
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a Python package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def check_package(package):
    """Check if a package is already installed"""
    try:
        __import__(package)
        print(f"✅ {package} is already installed")
        return True
    except ImportError:
        print(f"⚠️ {package} is not installed")
        return False

def main():
    """Main installation function"""
    print("=" * 60)
    print("Enhanced Quiz Server Manager v3.0 - Dependency Installer")
    print("=" * 60)
    print()
    
    # Required packages
    required_packages = {
        'flask': 'Flask',
        'flask_cors': 'Flask-CORS', 
        'requests': 'requests',
        'jwt': 'PyJWT',
        'bcrypt': 'bcrypt',
        'sqlite3': None,  # Built-in module
        'json': None,     # Built-in module
        'datetime': None, # Built-in module
        'threading': None,# Built-in module
        'os': None,       # Built-in module
        'sys': None,      # Built-in module
        'time': None,     # Built-in module
        'webbrowser': None,# Built-in module
        'hashlib': None,  # Built-in module
        'secrets': None,  # Built-in module
        'uuid': None,     # Built-in module
        'functools': None,# Built-in module
        'logging': None,  # Built-in module
        'shutil': None    # Built-in module
    }
    
    print("🔍 Checking currently installed packages...")
    print()
    
    missing_packages = []
    installed_packages = []
    
    for module, package in required_packages.items():
        if package is None:  # Built-in module
            print(f"✅ {module} (built-in)")
            continue
            
        if check_package(module):
            installed_packages.append(package)
        else:
            missing_packages.append(package)
    
    print()
    print(f"📊 Summary:")
    print(f"   ✅ Installed packages: {len(installed_packages)}")
    print(f"   ❌ Missing packages: {len(missing_packages)}")
    print()
    
    if not missing_packages:
        print("🎉 All dependencies are already installed!")
        print("✅ Enhanced Quiz Server Manager v3.0 is ready to run!")
        return True
    
    print("📦 Installing missing packages...")
    print()
    
    failed_installations = []
    successful_installations = []
    
    for package in missing_packages:
        print(f"📥 Installing {package}...")
        if install_package(package):
            successful_installations.append(package)
        else:
            failed_installations.append(package)
        print()
    
    print("=" * 60)
    print("🏁 Installation Summary:")
    print("=" * 60)
    
    if successful_installations:
        print("✅ Successfully installed:")
        for package in successful_installations:
            print(f"   • {package}")
        print()
    
    if failed_installations:
        print("❌ Failed to install:")
        for package in failed_installations:
            print(f"   • {package}")
        print()
        print("💡 Try installing manually:")
        for package in failed_installations:
            print(f"   pip install {package}")
        print()
    
    if not failed_installations:
        print("🎉 All dependencies installed successfully!")
        print("✅ Enhanced Quiz Server Manager v3.0 is ready to run!")
        print()
        print("🚀 To start the application:")
        print("   python enhanced_gui.py")
        print("   or run: start_enhanced_gui_v3.bat")
        return True
    else:
        print("⚠️ Some dependencies failed to install.")
        print("🔧 The application may not work correctly.")
        return False

if __name__ == "__main__":
    try:
        success = main()
        input("\nPress Enter to continue...")
        if success:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Installation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during installation: {e}")
        input("Press Enter to continue...")
        sys.exit(1)

#!/usr/bin/env python3
"""
Quiz Web Application Setup Tool

Tento skript vám pomůže nastavit webovou quiz aplikaci.
Automaticky zkontroluje závislosti, nastaví prostředí a připraví aplikaci pro deploy.
"""

import os
import sys
import json
import shutil
import subprocess
import sqlite3
from pathlib import Path
import urllib.request
import time

class QuizWebSetup:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backend_dir = self.root_dir / "web_backend"
        self.frontend_dir = self.root_dir / "web_frontend"
        self.original_backend = self.root_dir / "backend_local"
        self.original_frontend = self.root_dir / "frontend_deploy"
        
        # Colors for console output
        self.GREEN = '\033[92m'
        self.RED = '\033[91m'
        self.YELLOW = '\033[93m'
        self.BLUE = '\033[94m'
        self.BOLD = '\033[1m'
        self.RESET = '\033[0m'

    def print_colored(self, text, color=""):
        """Print colored text to console"""
        print(f"{color}{text}{self.RESET}")

    def print_step(self, step_num, total_steps, description):
        """Print step progress"""
        self.print_colored(f"\n[{step_num}/{total_steps}] {description}", self.BLUE + self.BOLD)

    def check_command(self, command):
        """Check if command exists in system"""
        try:
            subprocess.run([command, "--version"], 
                         capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def run_command(self, command, cwd=None, capture_output=False):
        """Run shell command and return result"""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd,
                capture_output=capture_output,
                text=True,
                check=True
            )
            return result
        except subprocess.CalledProcessError as e:
            self.print_colored(f"❌ Chyba při spuštění příkazu: {command}", self.RED)
            if capture_output:
                self.print_colored(f"Výstup: {e.stdout}", self.RED)
                self.print_colored(f"Chyba: {e.stderr}", self.RED)
            return None

    def check_requirements(self):
        """Check system requirements"""
        self.print_step(1, 8, "Kontrola systémových požadavků")
        
        requirements = {
            "Python 3.8+": self.check_python_version(),
            "pip": self.check_command("pip"),
            "Git": self.check_command("git"),
            "Node.js (optional)": self.check_command("node")
        }
        
        for req, status in requirements.items():
            status_icon = "✅" if status else "❌"
            self.print_colored(f"  {status_icon} {req}", 
                             self.GREEN if status else self.RED)
        
        missing = [req for req, status in requirements.items() 
                  if not status and not "optional" in req]
        
        if missing:
            self.print_colored(f"\n❌ Chybí požadavky: {', '.join(missing)}", self.RED)
            self.print_colored("Nainstalujte je před pokračováním.", self.YELLOW)
            return False
        
        self.print_colored("✅ Všechny požadavky splněny!", self.GREEN)
        return True

    def check_python_version(self):
        """Check if Python version is 3.8+"""
        try:
            version = sys.version_info
            return version.major == 3 and version.minor >= 8
        except:
            return False
        
    def print_header(self):
        print("=" * 60)
        print("🎯 Quiz Web App - Migration & Setup Tool")
        print("=" * 60)
        print()
        
    def check_requirements(self):
        """Kontrola požadavků pro setup"""
        print("🔍 Checking requirements...")
        
        requirements = {
            'python': self.check_python(),
            'git': self.check_git(),
            'pip': self.check_pip()
        }
        
        all_ok = all(requirements.values())
        
        if all_ok:
            print("✅ All requirements satisfied")
        else:
            print("❌ Some requirements missing:")
            for req, status in requirements.items():
                if not status:
                    print(f"   ❌ {req} not found")
            print("\nPlease install missing requirements and try again.")
            return False
            
        return True
    
    def check_python(self):
        try:
            result = subprocess.run([sys.executable, '--version'], 
                                  capture_output=True, text=True)
            version = result.stdout.strip()
            print(f"   ✅ {version}")
            return True
        except:
            print("   ❌ Python not found")
            return False
    
    def check_git(self):
        try:
            result = subprocess.run(['git', '--version'], 
                                  capture_output=True, text=True)
            version = result.stdout.strip()
            print(f"   ✅ {version}")
            return True
        except:
            print("   ❌ Git not found")
            return False
    
    def check_pip(self):
        try:
            result = subprocess.run([sys.executable, '-m', 'pip', '--version'], 
                                  capture_output=True, text=True)
            version = result.stdout.strip()
            print(f"   ✅ {version}")
            return True
        except:
            print("   ❌ Pip not found")
            return False
    
    def setup_backend_environment(self):
        """Nastavení backend prostředí"""
        print("\n🖥️ Setting up backend environment...")
        
        backend_dir = self.base_dir / 'web_backend'
        venv_dir = backend_dir / 'venv'
        
        # Vytvoření virtual environment
        if not venv_dir.exists():
            print("   📦 Creating virtual environment...")
            subprocess.run([sys.executable, '-m', 'venv', str(venv_dir)])
        
        # Aktivace venv a instalace dependencies
        if os.name == 'nt':  # Windows
            python_exe = venv_dir / 'Scripts' / 'python.exe'
            pip_exe = venv_dir / 'Scripts' / 'pip.exe'
        else:  # Linux/Mac
            python_exe = venv_dir / 'bin' / 'python'
            pip_exe = venv_dir / 'bin' / 'pip'
        
        print("   📥 Installing Python dependencies...")
        requirements_file = backend_dir / 'requirements.txt'
        if requirements_file.exists():
            subprocess.run([str(pip_exe), 'install', '-r', str(requirements_file)])
        
        print("   ✅ Backend environment ready")
        return python_exe
    
    def test_backend(self, python_exe):
        """Test backend aplikace"""
        print("\n🧪 Testing backend...")
        
        backend_dir = self.base_dir / 'web_backend'
        app_file = backend_dir / 'app.py'
        
        if not app_file.exists():
            print("   ❌ app.py not found")
            return False
        
        try:
            # Test import
            result = subprocess.run([
                str(python_exe), '-c', 
                f'import sys; sys.path.insert(0, "{backend_dir}"); import app; print("✅ App imports successfully")'
            ], capture_output=True, text=True, cwd=backend_dir)
            
            if result.returncode == 0:
                print("   ✅ Backend imports successfully")
                return True
            else:
                print(f"   ❌ Backend test failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"   ❌ Backend test error: {e}")
            return False
    
    def setup_frontend(self):
        """Nastavení frontend"""
        print("\n🌐 Setting up frontend...")
        
        frontend_dir = self.base_dir / 'web_frontend'
        
        # Zkontrolovat, že existují klíčové soubory
        required_files = ['index.html', 'quiz_app.html', 'api-client.js']
        missing_files = []
        
        for file in required_files:
            if not (frontend_dir / file).exists():
                missing_files.append(file)
        
        if missing_files:
            print(f"   ❌ Missing frontend files: {', '.join(missing_files)}")
            return False
        
        print("   ✅ Frontend files present")
        return True
    
    def create_env_file(self):
        """Vytvoření .env souboru pro development"""
        print("\n📝 Creating environment configuration...")
        
        env_content = """# Quiz Web App - Development Environment
# Copy this to .env and update values

# Database (for local development)
DATABASE_URL=sqlite:///quiz_dev.db

# Security
SECRET_KEY=dev-secret-key-change-in-production

# Flask
FLASK_ENV=development
FLASK_DEBUG=true

# Monica AI (optional)
MONICA_API_KEY=your-monica-api-key-here

# Server
PORT=5000
HOST=127.0.0.1
"""
        
        env_file = self.base_dir / 'web_backend' / '.env.example'
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print(f"   ✅ Environment template created: {env_file}")
        print("   📝 Copy .env.example to .env and update values")
    
    def create_start_scripts(self):
        """Vytvoření start scriptů"""
        print("\n🚀 Creating start scripts...")
        
        # Windows batch script
        batch_content = """@echo off
echo.
echo ================================================
echo Quiz Web App - Development Server
echo ================================================
echo.

cd web_backend
echo 🖥️ Starting backend server...
venv\\Scripts\\python.exe app.py

pause
"""
        
        batch_file = self.base_dir / 'start_dev_server.bat'
        with open(batch_file, 'w', encoding='utf-8') as f:
            f.write(batch_content)
        
        # Linux/Mac shell script
        shell_content = """#!/bin/bash
echo
echo "================================================"
echo "Quiz Web App - Development Server"
echo "================================================"
echo

cd web_backend
echo "🖥️ Starting backend server..."
venv/bin/python app.py
"""
        
        shell_file = self.base_dir / 'start_dev_server.sh'
        with open(shell_file, 'w', encoding='utf-8') as f:
            f.write(shell_content)
        
        # Make shell script executable
        if os.name != 'nt':
            os.chmod(shell_file, 0o755)
        
        print(f"   ✅ Start scripts created:")
        print(f"      Windows: {batch_file}")
        print(f"      Linux/Mac: {shell_file}")
    
    def git_init(self):
        """Inicializace Git repository"""
        print("\n📦 Initializing Git repository...")
        
        if (self.base_dir / '.git').exists():
            print("   ✅ Git repository already exists")
            return True
        
        try:
            subprocess.run(['git', 'init'], cwd=self.base_dir, check=True)
            
            # Vytvoření .gitignore
            gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
env/
ENV/

# Environment Variables
.env
.env.local
.env.production

# Database
*.db
*.sqlite3

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp
"""
            
            gitignore_file = self.base_dir / '.gitignore'
            with open(gitignore_file, 'w', encoding='utf-8') as f:
                f.write(gitignore_content)
            
            print("   ✅ Git repository initialized")
            print("   ✅ .gitignore created")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Git initialization failed: {e}")
            return False
    
    def print_next_steps(self):
        """Výpis dalších kroků"""
        print("\n" + "=" * 60)
        print("🎉 SETUP COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print("📋 Next steps:")
        print()
        print("1. 🔧 Configure environment:")
        print("   cd web_backend")
        print("   cp .env.example .env")
        print("   # Edit .env with your settings")
        print()
        print("2. 🚀 Start development server:")
        if os.name == 'nt':
            print("   start_dev_server.bat")
        else:
            print("   ./start_dev_server.sh")
        print()
        print("3. 🌐 Open browser:")
        print("   Backend:  http://localhost:5000")
        print("   Frontend: Open web_frontend/index.html")
        print("   Admin:    Open web_frontend/admin/index.html")
        print()
        print("4. 📚 Read documentation:")
        print("   README.md - Přehled projektu")
        print("   DEPLOYMENT_GUIDE.md - Návod na nasazení")
        print("   MIGRATION_TO_WEB_COMPLETE.md - Kompletní migrace")
        print()
        print("5. 🚀 Deploy to production:")
        print("   Follow DEPLOYMENT_GUIDE.md for Render.com deployment")
        print()
        print("=" * 60)
        print("✨ Happy coding! 🎯")
        print("=" * 60)
    
    def run_setup(self):
        """Hlavní setup funkce"""
        self.print_header()
        
        if not self.check_requirements():
            return False
        
        python_exe = self.setup_backend_environment()
        
        if not self.test_backend(python_exe):
            print("\n❌ Backend setup failed")
            return False
        
        if not self.setup_frontend():
            print("\n❌ Frontend setup failed")
            return False
        
        self.create_env_file()
        self.create_start_scripts()
        self.git_init()
        
        self.print_next_steps()
        return True

def main():
    """Main funkce"""
    if len(sys.argv) > 1 and sys.argv[1] == '--help':
        print("Quiz Web App Setup Tool")
        print("\nUsage:")
        print("  python setup.py          # Běžný setup")
        print("  python setup.py --help   # Zobrazit nápovědu")
        return
    
    setup = QuizWebSetup()
    
    try:
        success = setup.run_setup()
        if success:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n👋 Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

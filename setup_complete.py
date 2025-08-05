#!/usr/bin/env python3
"""
Quiz Web Application - Complete Setup Tool

Tento skript nastaví kompletní webovou quiz aplikaci s automatickou konfigurací.
"""

import os
import sys
import json
import shutil
import subprocess
import sqlite3
from pathlib import Path
import time

class QuizWebSetup:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backend_dir = self.root_dir / "web_backend"
        self.frontend_dir = self.root_dir / "web_frontend"
        
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

    def run_command(self, command, cwd=None):
        """Run shell command"""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd,
                check=True
            )
            return True
        except subprocess.CalledProcessError:
            return False

    def check_requirements(self):
        """Check system requirements"""
        self.print_step(1, 6, "Kontrola systémových požadavků")
        
        requirements = {
            "Python 3.8+": self.check_python_version(),
            "pip": self.check_command("pip"),
            "Git": self.check_command("git")
        }
        
        for req, status in requirements.items():
            status_icon = "✅" if status else "❌"
            self.print_colored(f"  {status_icon} {req}", 
                             self.GREEN if status else self.RED)
        
        missing = [req for req, status in requirements.items() if not status]
        
        if missing:
            self.print_colored(f"\n❌ Chybí požadavky: {', '.join(missing)}", self.RED)
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

    def setup_backend(self):
        """Setup backend environment"""
        self.print_step(2, 6, "Nastavení backend prostředí")
        
        if not self.backend_dir.exists():
            self.print_colored("❌ Web backend adresář neexistuje!", self.RED)
            return False
        
        # Create virtual environment
        venv_path = self.backend_dir / "venv"
        if not venv_path.exists():
            self.print_colored("📦 Vytváření virtuálního prostředí...", self.BLUE)
            if not self.run_command(f"python -m venv {venv_path}"):
                return False
        
        # Install requirements
        pip_cmd = str(venv_path / ("Scripts" if os.name == 'nt' else "bin") / "pip")
        requirements_file = self.backend_dir / "requirements.txt"
        
        if requirements_file.exists():
            self.print_colored("📦 Instalování závislostí...", self.BLUE)
            if not self.run_command(f"{pip_cmd} install -r {requirements_file}"):
                return False
        
        self.print_colored("✅ Backend prostředí nastaveno!", self.GREEN)
        return True

    def validate_frontend(self):
        """Validate frontend structure"""
        self.print_step(3, 6, "Validace frontend struktury")
        
        required_files = [
            "index.html",
            "quiz_app.html", 
            "quiz_app.js",
            "quiz_styles.css",
            "api-client.js"
        ]
        
        for file in required_files:
            file_path = self.frontend_dir / file
            if file_path.exists():
                self.print_colored(f"  ✅ {file}", self.GREEN)
            else:
                self.print_colored(f"  ❌ {file}", self.RED)
                return False
        
        self.print_colored("✅ Frontend struktura v pořádku!", self.GREEN)
        return True

    def create_startup_scripts(self):
        """Create convenient startup scripts"""
        self.print_step(4, 6, "Vytváření startup skriptů")
        
        # Development server script
        dev_script = '''#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import threading
import webbrowser
from pathlib import Path

def start_backend():
    backend_dir = Path(__file__).parent / "web_backend"
    venv_python = backend_dir / "venv" / ("Scripts" if os.name == 'nt' else "bin") / "python"
    
    if venv_python.exists():
        cmd = [str(venv_python), "app.py"]
    else:
        cmd = [sys.executable, "app.py"]
    
    print("🚀 Starting backend server...")
    subprocess.run(cmd, cwd=backend_dir)

def start_frontend():
    frontend_dir = Path(__file__).parent / "web_frontend"
    print("🌐 Starting frontend server...")
    subprocess.run([sys.executable, "-m", "http.server", "8000"], cwd=frontend_dir)

def main():
    print("🎯 Starting development environment...")
    print("📍 Backend: http://localhost:5000")
    print("📍 Frontend: http://localhost:8000")
    print()
    
    # Start backend in thread
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()
    
    time.sleep(2)
    
    try:
        webbrowser.open("http://localhost:8000")
    except:
        pass
    
    try:
        start_frontend()
    except KeyboardInterrupt:
        print("\\n👋 Servers stopped")

if __name__ == "__main__":
    main()
'''
        
        dev_script_path = self.root_dir / "start_development.py"
        with open(dev_script_path, 'w', encoding='utf-8') as f:
            f.write(dev_script)
        
        # Windows batch file
        if os.name == 'nt':
            batch_content = f'''@echo off
echo 🎯 Starting development environment...
python "{dev_script_path}"
pause
'''
            batch_path = self.root_dir / "start_development.bat"
            with open(batch_path, 'w') as f:
                f.write(batch_content)
        
        self.print_colored("✅ Startup skripty vytvořeny!", self.GREEN)
        return True

    def create_environment_files(self):
        """Create environment configuration files"""
        self.print_step(5, 6, "Vytváření konfiguračních souborů")
        
        # Backend .env file
        env_content = """# Backend Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-this-in-production

# Database Configuration
DATABASE_URL=sqlite:///quiz_app.db

# CORS Configuration
FRONTEND_URL=http://localhost:8000

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
"""
        
        env_file = self.backend_dir / ".env"
        if not env_file.exists():
            with open(env_file, 'w') as f:
                f.write(env_content)
        
        # Frontend configuration
        frontend_config = {
            "development": {
                "apiBaseUrl": "http://localhost:5000"
            },
            "production": {
                "apiBaseUrl": "https://your-app.onrender.com"
            }
        }
        
        config_file = self.frontend_dir / "config.json"
        if not config_file.exists():
            with open(config_file, 'w') as f:
                json.dump(frontend_config, f, indent=2)
        
        self.print_colored("✅ Konfigurační soubory vytvořeny!", self.GREEN)
        return True

    def generate_summary(self):
        """Generate setup summary"""
        self.print_step(6, 6, "Generování souhrnu")
        
        self.print_colored("\n" + "="*60, self.BOLD)
        self.print_colored("🎉 SETUP DOKONČEN ÚSPĚŠNĚ!", self.GREEN + self.BOLD)
        self.print_colored("="*60, self.BOLD)
        
        self.print_colored("\n🚀 Spuštění aplikace:", self.YELLOW + self.BOLD)
        self.print_colored("  python start_development.py", self.BLUE)
        
        self.print_colored("\n📍 URL adresy:", self.YELLOW + self.BOLD)
        self.print_colored("  Frontend: http://localhost:8000", self.BLUE)
        self.print_colored("  Backend:  http://localhost:5000", self.BLUE)
        self.print_colored("  Admin:    http://localhost:8000/admin/", self.BLUE)
        
        self.print_colored("\n🔐 Admin přihlášení:", self.YELLOW + self.BOLD)
        self.print_colored("  Username: admin", self.BLUE)
        self.print_colored("  Password: admin123", self.BLUE)
        
        self.print_colored("\n📚 Dokumentace:", self.YELLOW + self.BOLD)
        self.print_colored("  README.md", self.BLUE)
        self.print_colored("  DEPLOYMENT_GUIDE.md", self.BLUE)
        
        self.print_colored("\n" + "="*60, self.BOLD)
        self.print_colored("🎯 Aplikace je připravena k použití!", self.GREEN + self.BOLD)
        self.print_colored("="*60 + "\n", self.BOLD)
        
        return True

    def run_setup(self):
        """Run complete setup process"""
        self.print_colored(f"\n{self.BOLD}🎯 QUIZ WEB APPLICATION SETUP{self.RESET}")
        self.print_colored(f"{self.BOLD}{'='*50}{self.RESET}")
        
        steps = [
            self.check_requirements,
            self.setup_backend,
            self.validate_frontend,
            self.create_startup_scripts,
            self.create_environment_files,
            self.generate_summary
        ]
        
        for step in steps:
            if not step():
                self.print_colored("\n❌ Setup selhal!", self.RED)
                return False
        
        return True

def main():
    """Main entry point"""
    setup = QuizWebSetup()
    
    try:
        success = setup.run_setup()
        return 0 if success else 1
    except KeyboardInterrupt:
        setup.print_colored("\n\n👋 Setup přerušen uživatelem.", setup.YELLOW)
        return 1
    except Exception as e:
        setup.print_colored(f"\n❌ Neočekávaná chyba: {e}", setup.RED)
        return 1

if __name__ == "__main__":
    sys.exit(main())

# 🖥️ Backend Local Package - Počítač

## 📦 Co obsahuje tento adresář

**Všechny soubory potřebné pro lokální spuštění backend serveru:**

### 🐍 Python Backend soubory
- `backend_proxy.py` - Původní backend (Monica AI proxy)
- `enhanced_backend_fixed.py` - **Enhanced backend** (doporučeno)
- `enhanced_gui.py` - GUI manager pro enhanced backend
- `create_enhanced_database.py` - Vytvoření databáze

### 🗄️ Databáze
- `enhanced_quiz.db` - SQLite databáze s uživateli a výsledky
- `DB/Otazky_Quiz.db` - Původní databáze s otázkami

### 🚀 Spouštěče (.bat soubory)
- `start_enhanced_gui_quick.bat` - **Quick Start GUI** (doporučeno)
- `start_enhanced_gui.bat` - Standardní enhanced GUI
- `start_enhanced_fixed.bat` - Přímý enhanced backend
- `start_gui.bat` - Původní GUI
- `start_backend.bat` - Původní backend

### 📋 Konfigurace
- `package.json` - Node.js dependencies
- `*.spec` - PyInstaller specs pro EXE build

## 🚀 Jak spustit Backend

### Nejrychlejší způsob:
```bash
start_gui.bat
```

**V GUI:**
- Klikněte "🚀 Start Enhanced Backend" nebo **Ctrl+Q**
- GUI automaticky nakonfiguruje prostředí
- Backend se spustí na `http://localhost:5000`

### Alternativní způsob:
Pro přímé spuštění backendu bez GUI můžete použít:
```bash
..\.venv\Scripts\python.exe enhanced_backend_fixed.py
```

## ⚙️ Enhanced Backend Features

### 🔐 Uživatelské účty
- Registrace nových uživatelů
- JWT autentifikace
- Správa profilů

### 👨‍💼 Admin rozhraní
- Správa uživatelů
- Udělování Monica AI přístupů
- Statistiky použití

### 🤖 Monica AI Integration
- Funkční komunikace s Monica AI
- CORS opraveno pro frontend komunikaci
- Bez authentifikace pro kompatibilitu

### 📊 Databáze a statistiky
- Centralizované ukládání výsledků
- Pokročilé reporty a grafy
- Migrace dat mezi verzemi

### 📝 Logging
- Detailní záznamy všech aktivit
- Request monitoring
- Error tracking

## 🛠️ Požadavky

### Python Environment
Backend potřebuje Python virtual environment s těmito balíčky:
- Flask + flask-cors
- PyJWT + bcrypt  
- requests (Monica API)
- sqlite3 (databáze)

**GUI automaticky nakonfiguruje prostředí při prvním spuštění.**

## 🔧 Konfigurace

### Monica AI API
Nastavte v `enhanced_backend_fixed.py`:
```python
MONICA_API_URL = "https://api.monica.im/v1/chat/completions"
# API klíč se nastavuje v GUI nebo při registraci uživatele
```

### Database
- Databáze se vytvoří automaticky při prvním spuštění
- Lokace: `enhanced_quiz.db`
- Backup: GUI obsahuje backup/restore funkce

### CORS
CORS je nakonfigurováno pro frontend komunikaci:
```python
from flask_cors import CORS
CORS(app)  # Funguje s Google Cloud frontendem
```

## 📱 GUI Features

### Quick Start (Ctrl+Q)
- Jeden klik spuštění enhanced backend
- Auto-konfigurace prostředí
- Real-time status monitoring

### User Management
- Registrace nových účtů
- Správa oprávnění (Monica AI přístup)
- Seznam uživatelů s detaily

### Server Control
- Start/Stop backend serveru
- Process monitoring  
- Log viewer

### Database Tools
- Backup & Restore
- Migration tools
- Statistics dashboard

## 🌐 Připojení s Frontendem

Backend běží na `http://localhost:5000` a poskytuje API pro:
- Registraci/přihlášení uživatelů
- Ukládání výsledků quizů
- Monica AI komunikaci
- Statistiky a reporty

**Frontend automaticky detekuje běžící backend a přepne do server režimu.**

# 🌐 Kompletní migrace Quiz aplikace na web

## 📋 Přehled migrace

Převod z lokální Python aplikace na plně webovou aplikaci s:
- 🚀 **Backend**: Flask API na Render.com
- 🌐 **Frontend**: Statické stránky na GitHub Pages nebo Render
- 👨‍💼 **Admin panel**: Webové rozhraní místo desktop GUI
- 🗄️ **Databáze**: PostgreSQL na Render.com
- 🔐 **Authentifikace**: JWT tokens
- 🔄 **CI/CD**: GitHub Actions

## 🏗️ Nová struktura projektu

```
quiz-web-app/
├── 📁 backend/                 # Flask API server
│   ├── app.py                  # Hlavní Flask aplikace
│   ├── requirements.txt        # Python dependencies
│   ├── render.yaml            # Render.com config
│   ├── database.py            # Database models & utilities
│   ├── auth.py                # Authentifikace & JWT
│   ├── admin_api.py           # Admin API endpoints
│   └── migrations/            # Database migrace
├── 📁 frontend/               # React/Vue frontend (nebo vanilla JS)
│   ├── public/                # Statické soubory
│   ├── src/                   # Frontend source kód
│   ├── admin/                 # Admin panel
│   └── package.json           # NPM dependencies
├── 📁 shared/                 # Sdílené soubory
│   └── database.sql           # Initial database schema
├── .github/workflows/         # GitHub Actions CI/CD
├── docker-compose.yml         # Lokální development
├── README.md                  # Deployment guide
└── DEPLOYMENT_GUIDE.md        # Kompletní návod
```

## 🚀 Fáze 1: Příprava Backend API

### 1.1 Vytvoření nového Flask API

**Soubor: `backend/app.py`**
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import jwt
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Database configuration pro Render.com
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///quiz.db')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app)

# Import všech routes
from routes import auth_routes, quiz_routes, admin_routes
from models import User, Question, UserAnswer

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
```

### 1.2 Database Models

**Soubor: `backend/models.py`**
```python
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), default='student')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    monica_api_access = db.Column(db.Boolean, default=False)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(50), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.Text, nullable=False)
    option_b = db.Column(db.Text, nullable=False)
    option_c = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)
    explanation = db.Column(db.Text)

class UserAnswer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    user_answer = db.Column(db.String(1), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### 1.3 Requirements.txt pro Render.com

**Soubor: `backend/requirements.txt`**
```
Flask==2.3.3
Flask-CORS==4.0.0
Flask-SQLAlchemy==3.0.5
Flask-Migrate==4.0.5
PyJWT==2.8.0
requests==2.31.0
gunicorn==21.2.0
psycopg2-binary==2.9.7
python-dotenv==1.0.0
```

### 1.4 Render.com konfigurace

**Soubor: `backend/render.yaml`**
```yaml
services:
  - type: web
    name: quiz-backend
    env: python
    buildCommand: |
      pip install -r requirements.txt
      flask db upgrade
    startCommand: gunicorn app:app
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: quiz-database
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: FLASK_ENV
        value: production

databases:
  - name: quiz-database
    databaseName: quiz_app
    user: quiz_user
```

## 🌐 Fáze 2: Frontend aktualizace

### 2.1 Aktualizace API endpointů

**Soubor: `frontend/js/api-config.js`**
```javascript
const API_CONFIG = {
    // Production URL - změňte na vaši Render.com URL
    PRODUCTION_URL: 'https://quiz-backend-xxx.onrender.com',
    
    // Development URL
    DEVELOPMENT_URL: 'http://localhost:5000',
    
    // Auto-detect
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : 'https://quiz-backend-xxx.onrender.com'
};

class ApiClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('jwt_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
}

const apiClient = new ApiClient();
```

## 👨‍💼 Fáze 3: Webový Admin Panel

### 3.1 Admin panel HTML

**Soubor: `frontend/admin/index.html`**
```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quiz Admin Panel</title>
    <link rel="stylesheet" href="admin-styles.css">
</head>
<body>
    <div id="admin-app">
        <nav class="admin-nav">
            <h1>🎯 Quiz Admin Panel</h1>
            <div class="nav-buttons">
                <button onclick="showUsers()">👥 Uživatelé</button>
                <button onclick="showStatistics()">📊 Statistiky</button>
                <button onclick="showLogs()">📝 Logy</button>
                <button onclick="showSettings()">⚙️ Nastavení</button>
                <button onclick="logout()" class="logout-btn">🚪 Odhlásit</button>
            </div>
        </nav>

        <main class="admin-content">
            <!-- Uživatelé -->
            <section id="users-section" class="admin-section">
                <h2>👥 Správa uživatelů</h2>
                <div class="users-controls">
                    <button onclick="refreshUsers()" class="btn btn-primary">🔄 Obnovit</button>
                    <button onclick="exportUsers()" class="btn btn-secondary">📥 Export</button>
                </div>
                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Uživatel</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Registrace</th>
                                <th>Aktivní</th>
                                <th>Monica API</th>
                                <th>Akce</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <!-- Dynamicky naplněno -->
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Real-time statistiky -->
            <section id="stats-section" class="admin-section hidden">
                <h2>📊 Real-time statistiky</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>👥 Celkem uživatelů</h3>
                        <div class="stat-value" id="total-users">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>🎯 Aktivní kvízy</h3>
                        <div class="stat-value" id="active-quizzes">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>✅ Správné odpovědi</h3>
                        <div class="stat-value" id="correct-answers">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>📊 Úspěšnost</h3>
                        <div class="stat-value" id="success-rate">0%</div>
                    </div>
                </div>
                <canvas id="stats-chart" width="800" height="400"></canvas>
            </section>

            <!-- Logy -->
            <section id="logs-section" class="admin-section hidden">
                <h2>📝 Systémové logy</h2>
                <div class="logs-controls">
                    <select id="log-level-filter">
                        <option value="all">Všechny úrovně</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                    <button onclick="refreshLogs()" class="btn btn-primary">🔄 Obnovit</button>
                    <button onclick="clearLogs()" class="btn btn-danger">🗑️ Vymazat</button>
                </div>
                <div class="logs-container">
                    <div id="logs-content" class="logs-content">
                        <!-- Real-time logy -->
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="admin.js"></script>
</body>
</html>
```

### 3.2 Admin panel JavaScript

**Soubor: `frontend/admin/admin.js`**
```javascript
class AdminPanel {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.baseUrl = API_CONFIG.BASE_URL;
        
        if (!this.token) {
            this.showLogin();
            return;
        }
        
        this.init();
    }

    async init() {
        await this.verifyAuth();
        this.setupEventListeners();
        this.showUsers();
        this.startRealTimeUpdates();
    }

    async verifyAuth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Auth failed');
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.showLogin();
        }
    }

    showLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <form class="login-form" onsubmit="adminPanel.login(event)">
                    <h2>🔐 Admin přihlášení</h2>
                    <input type="text" id="admin-username" placeholder="Uživatelské jméno" required>
                    <input type="password" id="admin-password" placeholder="Heslo" required>
                    <button type="submit">Přihlásit</button>
                </form>
            </div>
        `;
    }

    async login(event) {
        event.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.token && data.user.role === 'admin') {
                localStorage.setItem('admin_token', data.token);
                this.token = data.token;
                window.location.reload();
            } else {
                alert('Přístup pouze pro administrátory');
            }
        } catch (error) {
            alert('Chyba při přihlášení');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.baseUrl}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const users = await response.json();
            this.renderUsers(users);
        } catch (error) {
            console.error('Chyba při načítání uživatelů:', error);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <select onchange="adminPanel.updateUserRole(${user.id}, this.value)">
                        <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <input type="checkbox" ${user.is_active ? 'checked' : ''} 
                           onchange="adminPanel.toggleUserActive(${user.id}, this.checked)">
                </td>
                <td>
                    <input type="checkbox" ${user.monica_api_access ? 'checked' : ''} 
                           onchange="adminPanel.toggleMonicaAccess(${user.id}, this.checked)">
                </td>
                <td>
                    <button onclick="adminPanel.deleteUser(${user.id})" class="btn btn-danger btn-sm">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async updateUserRole(userId, newRole) {
        try {
            await fetch(`${this.baseUrl}/api/admin/user/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });
        } catch (error) {
            console.error('Chyba při aktualizaci role:', error);
        }
    }

    async toggleMonicaAccess(userId, hasAccess) {
        try {
            await fetch(`${this.baseUrl}/api/admin/user/${userId}/monica-access`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ monica_access: hasAccess })
            });
        } catch (error) {
            console.error('Chyba při aktualizaci Monica přístupu:', error);
        }
    }

    startRealTimeUpdates() {
        // Real-time aktualizace každých 30 sekund
        setInterval(() => {
            if (document.getElementById('users-section').style.display !== 'none') {
                this.loadUsers();
            }
            if (document.getElementById('stats-section').style.display !== 'none') {
                this.loadStatistics();
            }
        }, 30000);
    }

    showUsers() {
        this.hideAllSections();
        document.getElementById('users-section').classList.remove('hidden');
        this.loadUsers();
    }

    showStatistics() {
        this.hideAllSections();
        document.getElementById('stats-section').classList.remove('hidden');
        this.loadStatistics();
    }

    hideAllSections() {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.add('hidden');
        });
    }
}

// Inicializace admin panelu
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
```

## 🗄️ Fáze 4: Database migrace

### 4.1 Migration script

**Soubor: `backend/migrate_data.py`**
```python
#!/usr/bin/env python3
"""
Migrace dat z SQLite do PostgreSQL na Render.com
"""
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime

def migrate_sqlite_to_postgres():
    # Připojení k SQLite
    sqlite_path = '../backend_local/enhanced_quiz.db'
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    
    # Připojení k PostgreSQL
    postgres_url = os.environ.get('DATABASE_URL')
    postgres_conn = psycopg2.connect(postgres_url)
    postgres_cursor = postgres_conn.cursor(cursor_factory=RealDictCursor)
    
    print("🔄 Začínám migraci dat...")
    
    # Migrace uživatelů
    print("👥 Migrování uživatelů...")
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute("SELECT * FROM users")
    users = sqlite_cursor.fetchall()
    
    for user in users:
        postgres_cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, created_at, is_active, monica_api_access)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING
        """, (
            user['username'],
            user['email'], 
            user['password_hash'],
            user['role'],
            user['created_at'],
            user['is_active'],
            user.get('monica_api_access', False)
        ))
    
    # Migrace otázek
    print("❓ Migrování otázek...")
    sqlite_cursor.execute("SELECT * FROM questions")
    questions = sqlite_cursor.fetchall()
    
    for question in questions:
        postgres_cursor.execute("""
            INSERT INTO questions (table_name, question_text, option_a, option_b, option_c, correct_answer, explanation)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            question['table_name'],
            question['question_text'],
            question['option_a'],
            question['option_b'], 
            question['option_c'],
            question['correct_answer'],
            question.get('explanation', '')
        ))
    
    # Migrace odpovědí
    print("✅ Migrování odpovědí...")
    sqlite_cursor.execute("SELECT * FROM user_answers")
    answers = sqlite_cursor.fetchall()
    
    for answer in answers:
        postgres_cursor.execute("""
            INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, answered_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            answer['user_id'],
            answer['question_id'],
            answer['user_answer'],
            answer['is_correct'],
            answer['answered_at']
        ))
    
    postgres_conn.commit()
    print("✅ Migrace dokončena!")
    
    # Cleanup
    sqlite_conn.close()
    postgres_conn.close()

if __name__ == '__main__':
    migrate_sqlite_to_postgres()
```

## 🚀 Fáze 5: Deployment

### 5.1 GitHub repository struktura

```bash
# Vytvoření nového GitHub repository
git init
git add .
git commit -m "Initial commit: Quiz app migration to web"
git branch -M main
git remote add origin https://github.com/your-username/quiz-web-app.git
git push -u origin main
```

### 5.2 GitHub Actions CI/CD

**Soubor: `.github/workflows/deploy.yml`**
```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        python -m pytest tests/ -v

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v0.0.8
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}
```

### 5.3 Render.com deployment

1. **Vytvořte účet na Render.com**
2. **Připojte GitHub repository**
3. **Vytvořte PostgreSQL databázi**
4. **Nakonfigurujte Web Service**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Environment Variables:
     - `DATABASE_URL` (auto z databáze)
     - `SECRET_KEY` (generate random)
     - `FLASK_ENV=production`

### 5.4 Frontend deployment

**Option A: GitHub Pages**
```bash
# Nastavte GitHub Pages na main branch /docs folder
mkdir docs
cp -r frontend/* docs/
git add docs/
git commit -m "Add frontend for GitHub Pages"
git push
```

**Option B: Render Static Site**
- Připojte stejný GitHub repo
- Root Directory: `frontend`
- Build Command: `npm run build` (pokud používáte build process)

## 📚 Fáze 6: Dokumentace

### 6.1 Deployment guide

**Soubor: `DEPLOYMENT_GUIDE.md`**
```markdown
# 🚀 Deployment Guide

## Lokální development

1. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   flask db init
   flask db migrate
   flask db upgrade
   python app.py
   ```

2. **Frontend setup:**
   ```bash
   cd frontend
   # Otevřete index.html v prohlížeči
   # Nebo použijte live server
   python -m http.server 8000
   ```

## Production deployment

### Render.com Backend

1. Vytvořte nový Web Service
2. Připojte GitHub repository
3. Nastavte build & start commands
4. Přidejte environment variables
5. Deploy!

### Frontend hosting

- GitHub Pages (zdarma)
- Render Static Site
- Netlify
- Vercel

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
FLASK_ENV=production
MONICA_API_KEY=your-monica-key
```

### Frontend (api-config.js)
```javascript
const PRODUCTION_URL = 'https://your-app.onrender.com';
```
```

## 📋 Checklist pro migraci

### ✅ Backend migrace
- [ ] Převést Flask app pro production
- [ ] Nastavit PostgreSQL
- [ ] Nakonfigurovat Gunicorn
- [ ] Přidat requirements.txt
- [ ] Vytvořit render.yaml
- [ ] Migrovat data z SQLite

### ✅ Frontend aktualizace  
- [ ] Aktualizovat API endpoints
- [ ] Vytvořit production config
- [ ] Testovat CORS
- [ ] Optimalizovat pro mobile

### ✅ Admin panel
- [ ] Vytvořit webové rozhraní
- [ ] Implementovat real-time monitoring
- [ ] Přidat user management
- [ ] Vytvořit statistiky dashboard

### ✅ Deployment
- [ ] Vytvořit GitHub repository
- [ ] Nastavit CI/CD
- [ ] Deploy na Render.com
- [ ] Nakonfigurovat doménu
- [ ] Testovat production

### ✅ Dokumentace
- [ ] Napsat deployment guide
- [ ] Vytvořit user manual
- [ ] Dokumentovat API
- [ ] Přidat troubleshooting

## 🎯 Výhody nového řešení

1. **Škálovatelnost**: Automatické škálování na Render.com
2. **Dostupnost**: 24/7 online přístup
3. **Maintenance**: Automatické aktualizace a zálohy
4. **Spolupráce**: Multi-user přístup z kdekoli
5. **Mobile**: Responzivní design pro mobily
6. **Security**: HTTPS, JWT, bezpečné API

## 💰 Náklady

- **Render.com**: $7/měsíc za Web Service + PostgreSQL
- **GitHub**: Zdarma pro public repositories
- **Doména**: $10-15/rok (volitelné)

**Total: ~$85/rok** pro plně hostovanou aplikaci

## 🔧 Maintenance

- **Automatické zálohy**: Render.com PostgreSQL
- **Monitoring**: Render.com dashboard
- **Updates**: GitHub Actions CI/CD
- **Logs**: Centralizované logování v Render

---

Tento plán zajistí bezproblémovou migraci z lokální Python aplikace na moderní webovou aplikaci s profesionálním hostingem a maintenance!

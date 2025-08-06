# 🚀 Render.com Deployment - Detailní návod

## 📋 Přehled
Tento návod vás provede kroky k nasazení modulárního backend API na **Render.com** s **PostgreSQL databází**.

**Co nasazujeme:**
- Flask API server (`web_backend_modular/`)
- PostgreSQL databáze
- Environment variables pro produkci

## ⚠️ DŮLEŽITÉ POŘADÍ KROKŮ:
1. **PRVNÍ:** Registrace na Render.com
2. **DRUHÉ:** Vytvoření PostgreSQL databáze ← **NEJDŮLEŽITĚJŠÍ!**
3. **TŘETÍ:** Vytvoření Web Service (propojení GitHub)
4. **ČTVRTÉ:** Environment Variables setup
5. **PÁTÉ:** Deploy a testování

**Proč databáze první?** Web Service potřebuje DATABASE_URL při startu!

---

## 🔧 KROK 1: Příprava před nasazením

### 1.1 Ověření GitHub repository
Ujistěte se, že máte na GitHubu:
```
quiz-web-app/
├── web_backend_modular/
│   ├── app.py
│   ├── api_extensions.py
│   ├── requirements.txt
│   ├── render.yaml
│   ├── init_db.py
│   └── ...
└── modular-app/frontend/
    └── ...
```

### 1.2 Kontrola souborů
Zkontrolujte klíčové soubory:

**✅ requirements.txt** - musí obsahovat:
```
Flask==3.1.0
Flask-CORS==4.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-Limiter==3.5.0
PyJWT==2.8.0
psycopg2-binary==2.9.9
gunicorn==21.2.0
```

**✅ render.yaml** - musí být v `web_backend_modular/`:
```yaml
name: quiz-app-backend
region: fra
services:
  - type: web
    name: quiz-api
    runtime: python3
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120
    plan: free
```

---

## 🌐 KROK 2: Registrace na Render.com

### 2.1 Registrace účtu
1. Jděte na **[render.com](https://render.com)**
2. Klikněte **"Get Started for Free"**
3. Zaregistrujte se pomocí **GitHub účtu** (doporučeno)
4. Autorizujte přístup k vašemu GitHub účtu

### 2.2 Dashboard příprava
- Po přihlášení budete v **Render Dashboard**
- **NEPROPOJUJTE** ještě repository
- Nejdříve vytvoříme databázi, pak teprve backend service

### 2.3 Projekty na Render.com
**Render.com má dva přístupy:**

**A) Bez projektů (doporučeno pro začátečníky):**
- Služby (databáze, web services) vytváříte přímo z hlavního dashboard
- Jednodušší správa pro malé aplikace
- **Tento přístup použijeme v návodu**

**B) S projekty (pro větší aplikace):**
- Vytvoříte projekt pomocí **"New Project"**
- V projektu pak přidáváte související služby
- Lepší organizace pro complex apps

**Pro naši Quiz App použijeme přístup A) - bez projektů.**

---

## 🗄️ KROK 3: Vytvoření PostgreSQL databáze

### 3.1 Vytvoření databáze (PRVNÍ!)
**⚠️ DŮLEŽITÉ: Databázi vytvořte PŘED web service!**

1. V Render dashboardu klikněte **"New +"**
2. Vyberte **"PostgreSQL"**
3. Vyplňte údaje:
   ```
   Name: quiz-modular-db
   Database Name: quiz_modular
   User: quiz_user
   Region: Frankfurt (FRA)
   Plan: Free
   ```
4. Klikněte **"Create Database"**

### 3.2 Zkopírování databázového URL
1. Po vytvoření databáze jděte do **Database Dashboard**
2. V sekci **"Connections"** zkopírujte:
   - **Internal Database URL** (začíná `postgresql://`)
   - Poznamenejte si ho - budete ho potřebovat!

**Příklad URL:**
```
postgresql://quiz_user:dlouhy_password_string@dpg-xyz123/quiz_modular
```

---

## 🖥️ KROK 4: Vytvoření Web Service

### 4.1 Propojení GitHub repository a základní konfigurace
1. V Render dashboardu klikněte **"New +"** v pravém horním rohu
2. Vyberte **"Web Service"**
3. Klikněte **"Build and deploy from a Git repository"**
4. Klikněte **"Connect a repository"**
5. Najděte a vyberte **`quiz-web-app`** repository
6. Klikněte **"Connect"**
7. Vyplňte konfigurace:

```
Name: quiz-modular-backend
Region: Frankfurt (FRA)
Branch: main
Root Directory: web_backend_modular
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120
```

### 4.2 Plán a nastavení
- **Plan:** Free (pro začátek)
- **Auto-Deploy:** Yes (automatické nasazení při push)
- Klikněte **"Advanced"** pro environment variables

---

## 🔐 KROK 5: Environment Variables

### 5.1 Povinné proměnné
V sekci **"Environment Variables"** přidejte:

```bash
# Flask konfigurace
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-minimum-32-characters-long

# Databáze (zkopírujte Internal Database URL z kroku 3.2)
DATABASE_URL=postgresql://quiz_user:password@dpg-xyz123/quiz_modular

# CORS - URL vašeho GitHub Pages
CORS_ORIGINS=https://wimmerj.github.io,https://localhost:3000

# Monica AI (volitelné - zatím nechte prázdné)
MONICA_API_KEY=your-monica-api-key-here
```

### 5.2 Generování SECRET_KEY
Pro bezpečný SECRET_KEY použijte:
```python
import secrets
print(secrets.token_hex(32))
# Výstup: něco jako 'a1b2c3d4e5f6...' (64 znaků)
```

### 5.3 CORS_ORIGINS
Nahraďte `wimmerj` vaším GitHub username:
```
https://YOUR-GITHUB-USERNAME.github.io,https://localhost:3000
```

---

## 🚀 KROK 6: Spuštění nasazení

### 6.1 Deploy
1. Po vyplnění všech údajů klikněte **"Create Web Service"**
2. Render začne:
   - Klonovat repository
   - Instalovat dependencies
   - Buildovat aplikaci
   - Spouštět server

### 6.2 Sledování procesu
- Sledujte **"Logs"** tab v reálném čase
- Build by měl trvat 2-3 minuty
- Hledejte zprávy:
  ```
  ✅ Database tables created successfully
  ✅ Admin user created (username: admin, password: admin123)
  ✅ Added X sample questions
  ```

### 6.3 První nasazení může selhat
**Je to normální!** První nasazení často selže kvůli:
- Databázové connection timeouts
- Circular imports
- Missing dependencies

**Řešení:** Render automaticky opakuje deployment

---

## 🔍 KROK 7: Ověření funkčnosti

### 7.1 Health Check
Po úspěšném deployu:
1. Zkopírujte **Service URL** (např. `https://quiz-modular-backend.onrender.com`)
2. Otestujte health check:
   ```
   https://quiz-modular-backend.onrender.com/api/health
   ```

**Očekávaný výstup:**
```json
{
  "status": "healthy",
  "database": "connected",
  "monica_ai": "disabled",
  "timestamp": "2025-08-06T...",
  "version": "2.0.0-modular"
}
```

### 7.2 API Info
Otestujte info endpoint:
```
https://quiz-modular-backend.onrender.com/api/info
```

### 7.3 Test registrace
Můžete otestovat registraci pomocí cURL nebo Postman:
```bash
curl -X POST https://quiz-modular-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

---

## ⚠️ KROK 8: Řešení problémů

### 8.1 Common Errors

**❌ "Build failed"**
- Zkontrolujte `requirements.txt` syntax
- Ujistěte se, že Root Directory = `web_backend_modular`

**❌ "Database connection failed"**
- Ověřte DATABASE_URL v Environment Variables
- Zkontrolujte, že databáze běží
- Možná časová prodleva - zkuste redeploy

**❌ "Application timeout"**
- Prvního nasazení se čeká ~1-2 minuty cold start
- Zkuste refresh stránky

**❌ "Import errors"**
- Circular imports mezi `app.py` a `api_extensions.py`
- Render automaticky opakuje deployment

### 8.2 Debugging kroky

1. **Logs tab** - sledujte live logy
2. **Events tab** - historie deploymentů
3. **Environment** - zkontrolujte variables
4. **Settings** - zkontrolujte konfigurace

### 8.3 Manual redeploy
Pokud deployment selže:
1. Jděte do **Settings** tab
2. Klikněte **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🔧 KROK 9: Optimalizace po nasazení

### 9.1 Custom Domain (volitelné)
Po ověření funkčnosti můžete přidat vlastní doménu:
1. **Settings** → **"Custom Domains"**
2. Přidejte doménu (např. `api.yoursite.com`)
3. Nakonfigurujte DNS

### 9.2 Monitoring
Render poskytuje:
- **Metrics** - CPU, memory, response times
- **Logs** - real-time application logs
- **Alerts** - email notifikace při problémech

### 9.3 Database Backup
PostgreSQL na Render má:
- Automatické denní zálohy
- Point-in-time recovery
- Manual backup možnost

---

## 🔗 KROK 10: Propojení s frontendem

### 10.1 Aktualizace API URL
V `modular-app/frontend/shared/api-client.js` ověřte:
```javascript
detectBackendURL() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';  // Development
    } else {
        return 'https://quiz-modular-backend.onrender.com';  // Production
    }
}
```

### 10.2 CORS Update
Pokud změníte frontend URL, aktualizujte `CORS_ORIGINS` v Render:
```
Environment Variables → CORS_ORIGINS → Edit
```

---

## 📊 KROK 11: Finální kontrola

### ✅ Checklist
- [ ] PostgreSQL databáze vytvořena a běží
- [ ] Web service nasazen a běží
- [ ] Health check vrací 200 OK
- [ ] Environment variables nastaveny
- [ ] CORS správně nakonfigurován
- [ ] API endpoints odpovídají
- [ ] Database inicializována s demo daty

### 🎯 URLs pro testování
```
Health Check: https://YOUR-SERVICE.onrender.com/api/health
API Info: https://YOUR-SERVICE.onrender.com/api/info
Registration: https://YOUR-SERVICE.onrender.com/api/auth/register
Login: https://YOUR-SERVICE.onrender.com/api/auth/login
```

### 👤 Default accounts
```
Admin: admin / admin123
Student: student / student123
```

---

## 🎉 Nasazení dokončeno!

**Backend API je nyní live na:**
`https://your-service-name.onrender.com`

### Další kroky:
1. ✅ Otestovat všechny API endpointy
2. ✅ Propojit s frontend aplikací
3. ✅ Získat Monica AI API klíč (volitelné)
4. ✅ Nastavit monitoring a alerting

**Backend je připraven k použití! 🚀**

---

## 📞 Podpora

**Render.com dokumentace:** https://render.com/docs  
**GitHub Issues:** Pro problémy s kódem  
**Render Community:** https://community.render.com  

**Užitečné odkazy:**
- Render Dashboard: https://dashboard.render.com
- PostgreSQL Guide: https://render.com/docs/databases
- Environment Variables: https://render.com/docs/environment-variables

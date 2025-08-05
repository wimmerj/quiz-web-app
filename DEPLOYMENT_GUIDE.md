# 🚀 DEPLOYMENT GUIDE - Quiz Web App

> Kompletní návod pro nahrání Quiz aplikace na GitHub a Render.com

## 📋 Přehled

Tento návod vás provede **kompletním deploymentem** Quiz aplikace na web včetně:
- 📁 **Příprava GitHub repository** - správná struktura a nastavení
- 🖥️ **Backend API** na Render.com - Flask server s PostgreSQL
- 🌐 **Frontend** na GitHub Pages - statické stránky
- 👨‍💼 **Admin panel** jako webové rozhraní
- 🔄 **Automatizace CI/CD** - GitHub Actions
- 🗄️ **PostgreSQL databáze** na Render.com

## 🏗️ Krok 1: Příprava GitHub Repository

### 1.1 Vytvoření nového repository

```bash
# Přejděte do složky s projektem
cd HTML_v5

# Inicializace Git repository
git init

# Přidání všech souborů
git add .

# První commit
git commit -m "Initial commit: Quiz web app migration"

# Vytvoření main branch
git branch -M main

# Připojení k GitHub (nahraďte your-username)
git remote add origin https://github.com/your-username/quiz-web-app.git

# Push na GitHub
git push -u origin main
```

### 1.2 Struktura repository

Po dokončení migrace bude vaše repository obsahovat:

```
quiz-web-app/
├── web_backend/           # Flask API server
│   ├── app.py            # Hlavní aplikace
│   ├── requirements.txt  # Python dependencies
│   ├── render.yaml       # Render.com konfigurace
│   └── migrate_data.py   # Data migration script
├── web_frontend/         # Frontend soubory
│   ├── index.html        # Hlavní stránka
│   ├── quiz_app.html     # Quiz aplikace
│   ├── api-client.js     # API komunikace
│   └── admin/           # Admin panel
│       ├── index.html    # Admin rozhraní
│       ├── admin.js      # Admin logika
│       └── admin-styles.css
├── frontend_deploy/      # Původní frontend (backup)
├── backend_local/        # Původní backend (backup)
├── .github/workflows/    # CI/CD automation
├── README.md
└── DEPLOYMENT_GUIDE.md  # Tento soubor
```

## 🖥️ Krok 2: Deployment Backend na Render.com

### 2.1 Vytvoření účtu na Render.com

1. Jděte na [render.com](https://render.com)
2. Vytvořte si účet (můžete se přihlásit přes GitHub)
3. Ověřte svůj email

### 2.2 Vytvoření PostgreSQL databáze

1. V Render dashboardu klikněte **"New +"**
2. Vyberte **"PostgreSQL"**
3. Nastavte:
   - **Name**: `quiz-database`
   - **Database Name**: `quiz_app`
   - **User**: `quiz_user`
   - **Region**: `Frankfurt` (pro lepší rychlost z ČR)
   - **Plan**: `Free` (pro začátek)
4. Klikněte **"Create Database"**

### 2.3 Deployment Flask aplikace

1. V Render dashboardu klikněte **"New +"**
2. Vyberte **"Web Service"**
3. Připojte váš GitHub repository
4. Nastavte:
   - **Name**: `quiz-backend`
   - **Region**: `Frankfurt`
   - **Branch**: `main`
   - **Root Directory**: `web_backend`
   - **Runtime**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     gunicorn app:app
     ```

### 2.4 Environment Variables

V nastavení Web Service přidejte:

| Key | Value | Source |
|-----|-------|--------|
| `DATABASE_URL` | [Auto] | From Database (quiz-database) |
| `SECRET_KEY` | [Generate] | Generate random value |
| `FLASK_ENV` | `production` | Manual |
| `MONICA_API_KEY` | `your-api-key` | Manual (volitelné) |

### 2.5 Deploy

1. Klikněte **"Create Web Service"**
2. Render automaticky začne build process
3. Sledujte logy v **"Logs"** sekci
4. Po dokončení by měl být backend dostupný na: `https://quiz-backend-xxx.onrender.com`

## 🗄️ Krok 3: Migrace dat

### 3.1 Lokální migrace (doporučeno)

```bash
# Nastavte DATABASE_URL environment variable
set DATABASE_URL=postgresql://quiz_user:password@dpg-xxx.oregon-postgres.render.com/quiz_app

# Spusťte migraci
cd web_backend
python migrate_data.py
```

### 3.2 Ověření migrace

```bash
# Test připojení k backend API
curl https://quiz-backend-xxx.onrender.com/api/health

# Měli byste dostat odpověď:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## 🌐 Krok 4: Deployment Frontend

### 4.1 Aktualizace API URL

V souboru `web_frontend/api-client.js` aktualizujte:

```javascript
const API_CONFIG = {
    // Nahraďte XXX vaší skutečnou Render URL
    PRODUCTION_URL: 'https://quiz-backend-xxx.onrender.com',
    DEVELOPMENT_URL: 'http://localhost:5000',
    // ...
};
```

### 4.2 GitHub Pages deployment

1. V GitHub repository jděte do **"Settings"**
2. Scrollujte dolů na **"Pages"**
3. V **"Source"** vyberte **"Deploy from a branch"**
4. V **"Branch"** vyberte **"main"**
5. V **"Folder"** vyberte **"/ (root)"** nebo **"/web_frontend"**
6. Klikněte **"Save"**

### 4.3 Custom domain (volitelné)

Pokud máte vlastní doménu:

1. V **"Pages"** nastavení přidejte **"Custom domain"**
2. V DNS nastavení své domény přidejte CNAME záznam:
   ```
   quiz.yourdomain.com CNAME your-username.github.io
   ```

## 👨‍💼 Krok 5: Admin Panel

### 5.1 Přístup k admin panelu

1. Frontend je dostupný na: `https://your-username.github.io/quiz-web-app/`
2. Admin panel je na: `https://your-username.github.io/quiz-web-app/admin/`
3. Přihlašovací údaje:
   - **Username**: `admin`
   - **Password**: `admin123`

### 5.2 První nastavení

1. Přihlaste se do admin panelu
2. Změňte heslo admina
3. Nastavte Monica API klíč (pokud jej máte)
4. Zkontrolujte statistiky a uživatele

## 🔧 Krok 6: Konfigurace a testování

### 6.1 CORS nastavení

Ujistěte se, že backend povoluje požadavky z vašeho frontend URL:

```python
# V app.py
CORS(app, origins=[
    'https://your-username.github.io',
    'http://localhost:3000',  # pro development
    'http://127.0.0.1:3000'   # pro development
])
```

### 6.2 Test celé aplikace

1. **Frontend test**:
   - Otevřete hlavní stránku
   - Zkuste registraci nového uživatele
   - Přihlaste se a spusťte kvíz

2. **Admin panel test**:
   - Přihlaste se jako admin
   - Zkontrolujte seznam uživatelů
   - Prohlédněte si statistiky

3. **API test**:
   - Test health endpoint: `GET /api/health`
   - Test registrace: `POST /api/auth/register`
   - Test quiz endpointů

## 🚀 Krok 7: Automatizace (CI/CD)

### 7.1 GitHub Actions secrets

V GitHub repository nastavte secrets:

1. Jděte do **"Settings" > "Secrets and variables" > "Actions"**
2. Přidejte:
   - `RENDER_API_KEY`: Váš Render.com API klíč
   - `RENDER_SERVICE_ID`: ID vašeho Web Service

### 7.2 Automatické deploymenty

Díky `.github/workflows/deploy.yml` se aplikace automaticky deployuje při každém push do main branch.

## 📊 Krok 8: Monitoring a maintenance

### 8.1 Render.com monitoring

- **Metrics**: CPU, Memory, Response times
- **Logs**: Real-time logs z aplikace
- **Alerts**: Email notifikace při problémech

### 8.2 Database backups

Render.com automaticky zálohuje PostgreSQL databázi:
- **Free plan**: 7 dní historie
- **Starter plan**: 30 dní historie

### 8.3 Custom monitoring

Můžete přidat externí monitoring služby:
- **UptimeRobot**: Monitoring dostupnosti
- **Sentry**: Error tracking
- **Google Analytics**: Usage analytics

## 🔒 Krok 9: Bezpečnost

### 9.1 Doporučená nastavení

1. **Změňte default admin heslo**
2. **Nastavte silný SECRET_KEY**
3. **Použijte HTTPS všude**
4. **Pravidelně aktualizujte dependencies**

### 9.2 Rate limiting (volitelné)

Přidejte rate limiting do backend API:

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
```

## 🆘 Troubleshooting

### Časté problémy:

**1. Backend nefunguje**
- Zkontrolujte logy na Render.com
- Ověřte environment variables
- Test DATABASE_URL připojení

**2. Frontend nevidí backend**
- Zkontrolujte CORS nastavení
- Ověřte API_CONFIG URL
- Test v browser developer tools

**3. Database problémy**
- Zkontrolujte connection string
- Ověřte, že migrace proběhla
- Test připojení přes psql

**4. GitHub Pages nefungují**
- Zkontrolujte nastavení Pages
- Ověřte, že soubory jsou v správné složce
- Test 404.html existence

## 💰 Náklady

| Služba | Plan | Cena | Poznámka |
|--------|------|------|----------|
| Render.com Web Service | Free | $0 | 750 hodin/měsíc |
| Render.com PostgreSQL | Free | $0 | 1GB storage |
| GitHub Pages | Free | $0 | 100GB bandwidth |
| **Celkem** | | **$0** | Pro začátek zdarma! |

### Upgrade možnosti:
- **Render Starter**: $7/měsíc - více výkonu, custom domain
- **PostgreSQL Starter**: $7/měsíc - více storage, backups

## 🎯 Výsledek

Po dokončení tohoto návodu budete mít:

✅ **Plně funkční webovou aplikace dostupnou 24/7**  
✅ **Moderní admin panel pro správu uživatelů**  
✅ **Automatické deploymenty přes GitHub**  
✅ **Bezpečnou PostgreSQL databázi**  
✅ **Responzivní design pro všechna zařízení**  
✅ **Škálovatelnou architekturu pro budoucí růst**

---

## 📞 Podpora

Pokud narazíte na problémy:

1. **Zkontrolujte dokumentaci**: README.md v repository
2. **Prohledejte logy**: Render.com Dashboard > Logs
3. **GitHub Issues**: Vytvořte issue v repository
4. **Community**: Render.com Community nebo StackOverflow

**Úspěšný deployment! 🎉**

Vaše quiz aplikace je nyní dostupná online a připravena k používání!

---

*Poslední aktualizace: Leden 2025*

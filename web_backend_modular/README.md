# Modular Quiz App - Backend

Kompletní backend API pro modulární quiz aplikaci s pokročilými funkcemi.

## 🌟 Funkce

### ✅ Základní systémy
- **Autentifikace & autorizace** - JWT tokeny, role-based access
- **Bezpečnost** - Rate limiting, CORS, password hashing
- **Database** - PostgreSQL s SQLAlchemy ORM
- **Monitoring** - Health checks, system logs

### 🎯 Moduly API

#### 1. **Auth Module** (`/api/auth/*`)
- `POST /auth/register` - Registrace uživatelů
- `POST /auth/login` - Přihlášení
- `GET /auth/profile` - Profil uživatele

#### 2. **Quiz Module** (`/api/quiz/*`)
- `GET /quiz/tables` - Seznam dostupných tabulek otázek
- `GET /quiz/questions/<table>` - Otázky pro konkrétní tabulku
- `POST /quiz/submit-answer` - Odeslání odpovědi

#### 3. **Battle Module** (`/api/battle/*`)
- `POST /battle/quick-match` - Rychlé souboje
- `POST /battle/ranked-match` - Hodnocené zápasy
- `POST /battle/submit-result` - Výsledky bitev
- `GET /battle/leaderboard` - Žebříček hráčů

#### 4. **Oral Exam Module** (`/api/oral-exam/*`)
- `POST /oral-exam/start` - Spuštění ústního zkoušení
- `POST /oral-exam/submit-audio` - Hodnocení zvukové odpovědi
- `GET /oral-exam/history` - Historie ústních zkoušek

#### 5. **Admin Module** (`/api/admin/*`)
- `GET /admin/stats` - Statistiky systému
- `GET /admin/users` - Správa uživatelů
- `GET/POST /admin/questions` - Správa otázek
- `GET /admin/system-logs` - Systémové logy

#### 6. **Settings Module** (`/api/settings/*`)
- `GET /settings` - Načtení nastavení
- `PUT /settings` - Aktualizace nastavení

### 🤖 Monica AI Integrace
- **Ústní zkoušky** - Automatické hodnocení mluvených odpovědí
- **Smart hints** - Inteligentní nápovědy pro otázky
- **Analýza výkonu** - AI-powered statistiky

## 🚀 Nasazení

### 1. **Lokální vývoj**

```bash
# Klonování a setup
cd web_backend_modular

# Instalace závislostí
pip install -r requirements.txt

# Konfigurace prostředí
cp .env.example .env
# Upravte .env s vašimi hodnotami

# Inicializace databáze
python init_db.py

# Spuštění serveru
python app.py
```

### 2. **Render.com produkce**

1. **Vytvoření služby na Render.com:**
   ```bash
   # Push do Git repository
   git add .
   git commit -m "Modular backend ready"
   git push origin main
   ```

2. **Konfigurace na Render.com:**
   - Vytvořte Web Service z Git repository
   - Nastavte `web_backend_modular` jako Root Directory
   - Build Command: `pip install --upgrade pip && pip install -r requirements.txt`
   - Start Command: `python -c "from app import init_database; init_database()" && gunicorn app:app`

3. **Environment Variables:**
   ```
   FLASK_ENV=production
   SECRET_KEY=[auto-generated]
   DATABASE_URL=[auto-generated PostgreSQL]
   CORS_ORIGINS=https://your-username.github.io
   MONICA_API_KEY=your-monica-api-key-here
   ```

4. **PostgreSQL Database:**
   - Render automaticky vytvoří a připojí PostgreSQL databázi
   - Database bude inicializována při prvním spuštění

### 3. **Testování**

```bash
# Lokální testování
python test_backend.py

# Testování produkce
python test_backend.py your-backend-url.onrender.com
```

## 📊 Database Schema

### Tabulky:
- **users** - Uživatelé (auth, settings, battle stats)
- **questions** - Otázky a odpovědi
- **quiz_progress** - Pokrok v kvízech
- **battle_results** - Výsledky soubojů
- **oral_exams** - Ústní zkoušky a hodnocení
- **system_logs** - Systémové logy
- **monica_usage** - Sledování použití AI

### Ukázková data:
- Admin user: `admin` / `admin123`
- Test user: `student` / `student123`
- 10+ demo otázek napříč kategoriemi

## 🔧 API dokumentace

### Autentifikace
Všechny chráněné endpointy vyžadují JWT token v hlavičce:
```
Authorization: Bearer <your-jwt-token>
```

### Rate Limiting
- **Registrace**: 5 požadavků/minuta
- **Přihlášení**: 10 požadavků/minuta
- **API obecně**: 1000/den, 100/hodina

### Error handling
Standardní HTTP status kódy + JSON error zprávy:
```json
{
  "error": "Popis chyby",
  "code": "ERROR_CODE",
  "details": {...}
}
```

## 🔗 Propojení s frontendem

### API Configuration
Aktualizujte `frontend/shared/api-client.js`:
```javascript
const API_CONFIG = {
    BASE_URL: 'https://your-backend.onrender.com/api',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};
```

### CORS nastavení
Backend automaticky povoluje požadavky z:
- GitHub Pages URL (z CORS_ORIGINS)
- Localhost pro vývoj

## 📈 Monitoring & Logs

### Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

### System Info
```bash
curl https://your-backend.onrender.com/api/info
```

### Admin Dashboard
- Statistiky uživatelů a aktivity
- Monitoring Monica AI usage
- System logs a audit trail

## 🛡️ Bezpečnost

- **JWT tokeny** s expirací 24 hodin
- **PBKDF2** password hashing s salt
- **Rate limiting** proti brute force útokům
- **CORS** protection
- **SQL injection** ochrana přes SQLAlchemy ORM
- **Input validation** na všech endpointech

## 🔄 Aktualizace & údržba

### Database migrace
```bash
python init_db.py reset  # Resetování (DEV only!)
python init_db.py battle-data  # Přidání demo battle dat
```

### Monitoring
- Health endpoint pro automated monitoring
- System logs pro debugging
- Monica AI usage tracking pro cost monitoring

---

## 🎯 Další kroky

1. **Deploy backend** na Render.com
2. **Aktualizovat frontend** API URLs
3. **Testovat** propojení frontend ↔ backend
4. **Získat Monica AI** API klíč
5. **Nastavit monitoring** a alerts

**Backend je připraven k nasazení! 🚀**

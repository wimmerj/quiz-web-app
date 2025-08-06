# 🔧 Render.com Troubleshooting Guide

## ⚡ Rychlé řešení častých problémů

### 🚨 Problem 1: Build Failed
**Error:** `Build failed with exit code 1`

**Nejčastější příčiny:**
```bash
# ❌ Chybný requirements.txt
ERROR: Could not find a version that satisfies the requirement

# ❌ Špatný Root Directory
ERROR: Could not install packages due to an EnvironmentError
```

**✅ Řešení:**
1. Zkontrolujte Root Directory: `web_backend_modular`
2. Ověřte requirements.txt:
   ```bash
   # Lokálně otestujte
   cd web_backend_modular
   pip install -r requirements.txt
   ```
3. Manual redeploy v Render dashboardu

---

### 🚨 Problem 2: Database Connection Failed
**Error:** `sqlalchemy.exc.OperationalError: connection to server failed`

**✅ Řešení:**
1. **Zkontrolujte DATABASE_URL:**
   - Musí být Internal Database URL z PostgreSQL dashboardu
   - Formát: `postgresql://user:pass@host/dbname`

2. **Ověřte databázi běží:**
   - PostgreSQL dashboard → Status: "Available"

3. **Časová prodleva:**
   - První connection může trvat 30-60s
   - Zkuste refresh po 2 minutách

---

### 🚨 Problem 3: Application Timeout
**Error:** `Application failed to respond`

**✅ Řešení:**
```bash
# Zvětšete timeout v render.yaml
startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 180
```

**Nebo v Render dashboard:**
Settings → Build & Deploy → Start Command

---

### 🚨 Problem 4: Import Error
**Error:** `ModuleNotFoundError: No module named 'app'`

**✅ Řešení:**
1. **Zkontrolujte Root Directory:** `web_backend_modular`
2. **File structure:**
   ```
   web_backend_modular/
   ├── app.py          ← hlavní soubor
   ├── requirements.txt
   └── ...
   ```

---

### 🚨 Problem 5: CORS Error ve frontendu
**Error:** `Access-Control-Allow-Origin header`

**✅ Řešení:**
1. **Environment Variables:**
   ```bash
   CORS_ORIGINS=https://wimmerj.github.io,http://localhost:3000
   ```
   
2. **Přesný URL match:**
   - Bez trailing slash: `https://wimmerj.github.io`
   - Správný protocol (https/http)

---

### 🚨 Problem 6: 500 Internal Server Error
**Error:** HTTP 500 při API calls

**✅ Debugging kroky:**
1. **Logs tab** - hledejte Python traceback
2. **Common issues:**
   ```python
   # Missing environment variables
   SECRET_KEY not set
   
   # Database not initialized
   relation "users" does not exist
   ```

3. **Manual database init:**
   - Render shell: `python init_db.py`

---

### 🚨 Problem 7: Cold Start Delays
**Problem:** První request trvá 30+ sekund

**✅ Normální chování Free tier:**
- Service "spí" po 15 minutách neaktivity
- První request "budí" service
- Následující requesty jsou rychlé

**Řešení pro produkci:**
- Upgrade na Starter plan ($7/měsíc)
- External monitoring service (ping každých 10 min)

---

## 🔍 Debugging Commands

### V Render Logs hledejte:
```bash
# ✅ Successful startup
✅ Database tables created successfully
✅ Admin user created
Flask app started

# ❌ Common errors
❌ Error initializing database
❌ Import error
❌ Connection refused
```

### Užitečné logy:
```bash
# Database connection
Initializing database...
Creating admin user...

# Flask startup
Running on http://0.0.0.0:PORT
Workers started

# Request handling
POST /api/auth/login - 200
GET /api/health - 200
```

---

## 📞 Kde hledat pomoc

### 1. Render Dashboard
- **Logs** - real-time error messages
- **Events** - deployment history
- **Metrics** - performance data

### 2. Local Testing
```bash
# Testujte lokálně před deployem
cd web_backend_modular
python app.py

# Test endpoint
curl http://localhost:5000/api/health
```

### 3. Render Community
- https://community.render.com
- Discord: https://discord.gg/render

### 4. Documentation
- https://render.com/docs
- https://render.com/docs/troubleshooting

---

## ⚡ Quick Fixes

### Manual Redeploy
```
Dashboard → Your Service → Manual Deploy → Deploy latest commit
```

### Environment Variables Reset
```
Dashboard → Environment → Delete → Add new
```

### Database Reset
```
⚠️ DANGEROUS - smaže všechna data!
Dashboard → Database → Settings → Delete Database
```

### Logs Download
```
Dashboard → Logs → Download → Last 1000 lines
```

---

## 🎯 Prevention Tips

### 1. Test Before Deploy
```bash
# Vždy otestujte lokálně
python init_db.py
python app.py
python test_backend.py
```

### 2. Use Git Tags
```bash
# Označte working versions
git tag -a v1.0 -m "Working backend"
git push origin v1.0
```

### 3. Monitor Regularly
- Nastavte si bookmarky na health check
- Kontrolujte Render dashboard týdně

### 4. Backup Strategy
- Render automaticky zálohuje PostgreSQL
- Stáhněte si také kód lokálně

---

**Většina problémů se vyřeší automaticky po 2-3 redeploy cyklech! 🔄**

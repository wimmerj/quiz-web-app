# 🔧 DEEP DEBUGGING - Database Connection Issue

## ❌ **SOUČASNÝ STAV:**
```json
{"database":"disconnected","monica_ai":"enabled","status":"healthy"}
```

**PROBLÉM:** Ani Internal ani External URL nefunguje!

---

## 🛠️ **IMMEDIATE DEBUG STEPS:**

### 1️⃣ **Opraven Health Check**
Opravil jsem database connection test v backendu:
- ✅ Používá `db.text('SELECT 1')` místo `'SELECT 1'`
- ✅ Přidán error logging
- ✅ Přidán debug endpoint

### 2️⃣ **Commit a Deploy**
```bash
git add .
git commit -m "Fix database health check and add debug endpoint"
git push origin main
```

**Poté v Render.com:**
- Manual Deploy → Deploy latest commit

### 3️⃣ **Test Debug Endpoint**
Po deployu zkuste:
```
https://quiz-modular-backend.onrender.com/api/debug
```

**Očekávaný výstup:**
```json
{
  "database_url_set": true,
  "database_url_masked": "postgresql://quiz_user:***@dpg-xyz/quiz_modular",
  "sqlalchemy_uri": "postgresql://quiz_user:...",
  "environment": "production",
  "cors_origins": "https://wimmerj.github.io,..."
}
```

### 4️⃣ **Check Render Logs**
1. **Render.com Dashboard**
2. **Web Service → Logs tab**
3. **Sledujte real-time logs**
4. **Hledejte "Database connection error:" zprávy**

---

## 🔍 **MOŽNÉ PŘÍČINY:**

### A) **PostgreSQL Database není nastartovaná**
- Render.com → PostgreSQL Database → Status
- Měla by být "Available"
- Pokud ne → Restart database

### B) **Environment Variable problém**
- DATABASE_URL není správně nastavená
- Debug endpoint ukáže přesné hodnoty

### C) **Network/Security problém**
- PostgreSQL firewall rules
- Internal network connection issues

### D) **SQLAlchemy/psycopg2 problém**
- Compatibility issues s Python 3.13
- Connection pool settings

---

## 🚀 **ACTION PLAN:**

### KROK 1: Deploy opravený kód
```bash
git add .
git commit -m "Fix database health check and add debug endpoint"
git push origin main
```

### KROK 2: Test debug endpoint
```
https://quiz-modular-backend.onrender.com/api/debug
```

### KROK 3: Check logs v Render.com
- Live logs během health check

### KROK 4: Pokud pořád nefunguje, zkuste restart
- PostgreSQL Database → Restart
- Web Service → Restart

---

## 📋 **DEBUGGING CHECKLIST:**

- [ ] Git push nového kódu
- [ ] Manual deploy v Render.com
- [ ] Test `/api/debug` endpoint
- [ ] Check Render logs pro database errors
- [ ] Verify PostgreSQL database status
- [ ] Test `/api/health` znovu

**Po opravě by health check měl konečně ukázat "connected"! 🎯**

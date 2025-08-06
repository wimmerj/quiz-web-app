# 🚀 PRVNÍ TESTOVÁNÍ - Quick Start Guide

## 🎯 **RYCHLÝ START TESTOVÁNÍ**

✅ Backend běží na Render.com  
✅ Frontend má modulární strukturu  
🔄 Začínáme testování!

---

## 📋 **KROK 1: Ověření Backend URL**

### Co zkontrolovat:
Váš backend URL by měl být v této formě:
```
https://YOUR-SERVICE-NAME.onrender.com
```

### Aktualizace frontend:
V `modular-app/frontend/shared/api-client.js` na řádku 54:
```javascript
return 'https://quiz-modular-backend.onrender.com';  // ← Změňte na váš URL
```

**DŮLEŽITÉ:** Také aktualizujte CORS_ORIGINS v Render.com environment variables:
```
CORS_ORIGINS=https://wimmerj.github.io,https://localhost:8000,http://localhost:8000
```

---

## 📋 **KROK 2: Backend Health Check**

Otevřete browser a jděte na:
```
https://quiz-modular-backend.onrender.com/api/health
```

**✅ ÚSPĚŠNÝ výstup:**
```json
{
  "status": "healthy",
  "database": "connected",    // ✅ WORKING!
  "monica_ai": "enabled",
  "timestamp": "2025-08-06T...",
  "version": "2.0.0-modular"
}
```

**⚠️ POKUD "database": "disconnected":**
- **PROBLÉM:** Backend používá External URL místo Internal URL
- **ŘEŠENÍ:** Jděte do Render.com Dashboard
  1. Web Service → Environment → DATABASE_URL
  2. Smažte současnou variable
  3. Přidejte novou: Value → Select database z dropdown
  4. Manual Deploy
- **VERIFY:** Internal URL vypadá: `postgresql://user:pass@dpg-xyz/dbname`
- **NOT:** External URL: `postgres://user:pass@dpg-xyz-a.frankfurt-postgres.render.com/dbname`

---

## 📋 **KROK 3: Spuštění Frontend Locally**

```bash
cd modular-app/frontend
python -m http.server 8000
```

Pak otevřete: `http://localhost:8000`

**⚠️ POKUD HTTPS ERROR:**
Zkuste raději přímo GitHub Pages:
```
https://wimmerj.github.io/quiz-web-app/modular-app/frontend/
```

---

## 📋 **KROK 4: První Testovací Scénáře**

### Test 1: Basic Quiz
1. Otevřete frontend
2. Klikněte na **"Basic Quiz"**
3. Zkontrolujte, že se načítají otázky z backendu

### Test 2: Auth Test
1. Klikněte na **"Auth"**
2. Zkuste registraci nového uživatele
3. Pak se přihlaste

### Test 3: API Communication
1. Otevřete Developer Tools (F12)
2. Sledujte Network tab
3. Zkontrolujte API calls na váš backend

---

## 🛠️ **RYCHLÉ DEBUGGING**

### Browser Console Commands:
```javascript
// Zkontrolovat current API URL
console.log(api.baseURL);

// Test API health
api.get('/api/health').then(console.log);

// Zkontrolovat auth token
console.log(localStorage.getItem('jwt_token'));
```

### Typické problémy:
- **CORS errors**: Zkontrolujte CORS_ORIGINS v backend env vars
- **404 errors**: Zkontrolujte backend URL
- **Network errors**: Zkontrolujte, že backend běží

---

## 📱 **POKUD VŠECHNO FUNGUJE:**

1. ✅ **GitHub Pages Deploy:**
   ```bash
   git add .
   git commit -m "Working frontend-backend integration"
   git push origin main
   ```

2. ✅ **Test Production:**
   Otevřete: `https://YOUR-GITHUB-USERNAME.github.io/quiz-web-app/modular-app/frontend/`

3. ✅ **Pokračování v testování:**
   Projděte všech 6 modulů postupně

---

## 🎉 **SUCCESS INDIKÁTORY:**

- [ ] Backend health check vrací 200 OK
- [ ] Frontend se načítá bez chyb
- [ ] API calls fungují v Network tab
- [ ] Registrace a login funguje
- [ ] Basic quiz načítá otázky z databáze

**Když tohle vše funguje, máme KOMPLETNÍ working aplikaci! 🚀**

---

## 🆘 **HELP:**

Pokud něco nefunguje:
1. Zkontrolujte backend logs v Render.com
2. Sledujte browser console pro errors
3. Ověřte Network tab v Developer Tools
4. Zkontrolujte API URL v api-client.js

**Let's test this! 🧪**

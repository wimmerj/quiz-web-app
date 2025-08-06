# 🔧 DEBUGGING PROBLÉMŮ - Immediate Fix

## ❌ **PROBLÉMY IDENTIFIKOVÁNY:**

### 1️⃣ **Database disconnected**
```json
{"database":"disconnected","monica_ai":"enabled","status":"healthy"}
```

### 2️⃣ **Local server HTTPS error**
```
You're speaking plain HTTP to an SSL-enabled server port.
```

### 3️⃣ **Auth loop - Přihlášení se resetuje**
- Registrace funguje ✅
- Login funguje ✅  
- Po přechodu na quiz se musí přihlásit znovu ❌

---

## 🛠️ **ŘEŠENÍ 1: Database Connection Fix**

### Krok A: Zkontrolujte Render.com
1. Jděte do **Render.com Dashboard**
2. Zkontrolujte **PostgreSQL database** status
3. Měla by být **"Available"**
4. Pokud ne, klikněte **"Restart"**

### Krok B: Environment Variables
Ověřte v Web Service **Environment Variables:**
```
DATABASE_URL=postgresql://[auto-generated]
CORS_ORIGINS=https://wimmerj.github.io,https://localhost:8000,http://localhost:8000
```

### Krok C: Manual Restart
1. **Web Service** → **Settings** → **Manual Deploy**
2. **Deploy latest commit**

---

## 🛠️ **ŘEŠENÍ 2: Local Development Fix**

### Místo local serveru použijte přímo GitHub Pages:
```
https://wimmerj.github.io/quiz-web-app/modular-app/frontend/
```

**Proč:** Backend běží na HTTPS, local server na HTTP = CORS problém

---

## 🛠️ **ŘEŠENÍ 3: Auth Loop Fix**

### Problém: JWT token se neukládá správně

### Debug kroky:
1. **Otevřete Developer Tools (F12)**
2. **Console tab**
3. **Zkuste tyto příkazy:**

```javascript
// Po přihlášení zkontrolujte token
console.log(localStorage.getItem('jwt_token'));
console.log(localStorage.getItem('auth_token'));

// Zkontrolujte auth status
console.log(sessionStorage.getItem('isAuthenticated'));

// Manual auth test
api.get('/api/auth/profile').then(console.log).catch(console.error);
```

### Možné příčiny:
- **Token expiration:** JWT token je příliš krátký
- **Storage conflicts:** Více storage mechanismů
- **CORS issues:** Cross-origin problems

---

## 🔍 **IMMEDIATE DEBUG STEPS**

### 1. Backend Database Check
```bash
curl https://quiz-modular-backend.onrender.com/api/info
```

### 2. Auth Flow Debug
```javascript
// V browser console po přihlášení:
localStorage.clear();
sessionStorage.clear();

// Pak se znovu přihlaste a sledujte:
console.log('All localStorage:', localStorage);
console.log('All sessionStorage:', sessionStorage);
```

### 3. Network Tab Analysis
1. **F12** → **Network tab**
2. **Sledujte API calls**
3. **Hledajte failed requests**

---

## 🚀 **QUICK FIX SEQUENCE**

### Pro immediate testing:

1. **Backend Fix:**
   ```
   Render.com → PostgreSQL → Restart database
   Render.com → Web Service → Manual Deploy
   ```

2. **Frontend Fix:**
   ```
   Použijte GitHub Pages místo local server
   https://wimmerj.github.io/quiz-web-app/modular-app/frontend/
   ```

3. **Auth Debug:**
   ```javascript
   // Browser console
   localStorage.clear();
   // Znovu se přihlaste
   ```

---

## 🎯 **SUCCESS TEST**

Po opravách zkontrolujte:
- [ ] `/api/health` vrací `"database": "connected"`
- [ ] GitHub Pages se načítá bez HTTPS errors
- [ ] Po přihlášení token zůstává v localStorage
- [ ] Quiz stránka nevrací na login

**Po těchto opravách by vše mělo fungovat! 🎉**

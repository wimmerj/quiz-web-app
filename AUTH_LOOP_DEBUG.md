# 🔧 AUTH LOOP DEBUGGING - Immediate Fix

## ❌ **PROBLÉM:**
- ✅ Registrace funguje
- ✅ Login říká "přihlášen"  
- ❌ Quiz page říká "musíte se přihlásit"
- ❌ Redirect zpět na login

**ROOT CAUSE:** JWT token se neukládá/nečte správně!

---

## 🛠️ **IMMEDIATE DEBUG STEPS:**

### 1️⃣ **Browser Console Debug**
Po přihlášení (před přechodem na quiz) otevřete **F12 Console** a zkuste:

```javascript
// Check token storage
console.log('JWT Token:', localStorage.getItem('modular_quiz_token'));
console.log('Auth status:', api.isAuthenticated());
console.log('API token:', api.authToken);

// Test API call
api.get('/api/auth/profile').then(console.log).catch(console.error);

// Check all localStorage
console.log('All localStorage:', localStorage);
```

### 2️⃣ **Expected Debug Output**
**SPRÁVNÝ výstup:**
```javascript
JWT Token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJI..."  // Long token string
Auth status: true
API token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJI..."
```

**PROBLÉMOVÝ výstup:**
```javascript
JWT Token: null                    // ← PROBLÉM!
Auth status: false                 // ← PROBLÉM!
API token: null                    // ← PROBLÉM!
```

---

## 🔍 **MOŽNÉ PŘÍČINY:**

### A) **Token se neukládá při login**
- Login response neobsahuje token
- Token se ukládá pod jiným názvem
- localStorage je blokován

### B) **Token se maže hned po uložení**
- Jiný kód čistí localStorage
- Token expiruje okamžitě
- Conflict mezi storage mechanismy

### C) **Token se čte z jiného místa**
- Quiz page hledá token pod jiným názvem
- Multiple auth implementations

---

## 🛠️ **IMMEDIATE FIXES:**

### Fix A: **Verify Login Response**
Zkontrolujte Network tab při přihlášení:
1. **F12 → Network tab**
2. **Klikněte Login**
3. **Najděte `/api/auth/login` request**
4. **Response by měl obsahovat:**
```json
{
  "token": "eyJ0eXAiOiJKV1Q...",
  "user": {...}
}
```

### Fix B: **Manual Token Test**
Po přihlášení v console:
```javascript
// Manual token save
localStorage.setItem('modular_quiz_token', 'test-token');
console.log('Saved:', localStorage.getItem('modular_quiz_token'));

// Reload API client
api.authToken = api.loadAuthToken();
console.log('Reloaded:', api.authToken);
```

### Fix C: **Clear ALL Storage**
```javascript
// Clear everything and try again
localStorage.clear();
sessionStorage.clear();

// Then re-register and login
```

---

## 🎯 **DIAGNOSIS STEPS:**

### Step 1: **Login Flow Debug**
1. **F12 → Console tab**
2. **Login znovu**
3. **Sledujte console messages během loginu**
4. **Note:** Všechny error messages

### Step 2: **Network Flow Debug**
1. **F12 → Network tab**
2. **Clear network log**
3. **Login znovu**
4. **Check:** Login request/response
5. **Check:** Subsequent API calls

### Step 3: **Storage Debug**
1. **F12 → Application tab**
2. **Local Storage section**
3. **Check:** Co je uloženo pod wimmerj.github.io
4. **Look for:** modular_quiz_token nebo jwt_token

---

## 🚀 **QUICK FIXES TO TRY:**

### Option 1: **Backend Token Issue**
V Render.com environment variables zkontrolujte:
```
SECRET_KEY=[should be set]
JWT_EXPIRATION_HOURS=24
```

### Option 2: **Frontend Storage Issue**
Zkuste jiný browser (incognito mode) - možná localStorage conflict.

### Option 3: **CORS Issue**
Verify CORS_ORIGINS obsahuje GitHub Pages URL:
```
CORS_ORIGINS=https://wimmerj.github.io,https://localhost:8000
```

---

## 📋 **IMMEDIATE ACTION:**

1. **Otevřete GitHub Pages znovu**
2. **F12 → Console**
3. **Login znovu**
4. **Zkopírujte console output zde**
5. **Zkontrolujte Network tab pro login request/response**

**Potřebujeme vidět, co přesně vrací login API a jak se token ukládá! 🔍**

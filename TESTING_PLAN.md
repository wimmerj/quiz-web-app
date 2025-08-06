# 🧪 KOMPLETNÍ TESTOVACÍ PLÁN - Modulární Quiz App

## 🎯 **Přehled testování**

✅ **Backend běží na Render.com**  
✅ **Frontend má modulární strukturu**  
🔄 **Nyní testujeme propojení a funkčnost**

---

## 📋 **FÁZE 1: Backend API testování**

### 1.1 Health Check
```bash
curl https://your-backend.onrender.com/api/health
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

### 1.2 API Info
```bash
curl https://your-backend.onrender.com/api/info
```

### 1.3 Auth testování
```bash
# Registrace
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# Přihlášení
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

---

## 📋 **FÁZE 2: Frontend testování**

### 2.1 Aktualizace API URL
Ověřte v `modular-app/frontend/shared/api-client.js`:
```javascript
detectBackendURL() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    } else {
        return 'https://YOUR-BACKEND.onrender.com';  // ← Aktualizujte toto!
    }
}
```

### 2.2 Local Server Test
```bash
cd modular-app/frontend
python -m http.server 8000
# Nebo
npx serve .
```

### 2.3 GitHub Pages Deployment
```bash
git add .
git commit -m "Frontend with working backend integration"
git push origin main
```

---

## 📋 **FÁZE 3: Kompletní integrace testování**

### 3.1 Testovací scénáře

#### Scénář 1: Basic Quiz
1. Otevřete frontend
2. Jděte na **"Basic Quiz"**
3. Zkuste quiz bez přihlášení
4. Zkontrolujte, že se data načítají z backendu

#### Scénář 2: Autentifikace
1. Jděte na **"Auth"** stránku
2. Zaregistrujte nového uživatele
3. Přihlaste se
4. Zkontrolujte, že JWT token funguje

#### Scénář 3: Battle Mode
1. Přihlašte se
2. Jděte na **"Battle Mode"**
3. Zkuste Quick Match
4. Zkontrolujte komunikaci s backend API

#### Scénář 4: Statistics
1. Po pár kvízech jděte na **"Statistics"**
2. Zkontrolujte, že se zobrazují data z databáze

#### Scénář 5: Admin Panel
1. Přihlašte se jako admin (admin/admin123)
2. Jděte na **"Admin"**
3. Zkontrolujte správu uživatelů a otázek

#### Scénář 6: Oral Exam
1. Jděte na **"Oral Exam"**
2. Zkuste spustit ústní zkoušku
3. Zkontrolujte Monica AI integraci (pokud máte API klíč)

---

## 📋 **FÁZE 4: Cross-platform testování**

### 4.1 Desktop testování
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari

### 4.2 Mobile testování
- ✅ Android Chrome
- ✅ iOS Safari
- ✅ Responsive design

### 4.3 Performance testování
- ✅ API response times
- ✅ Frontend loading times
- ✅ Database query performance

---

## 📋 **FÁZE 5: Error handling testování**

### 5.1 Network Errors
- Vypněte internet a zkontrolujte error messages
- Zkuste neplatné API requesty

### 5.2 Auth Errors
- Neplatné přihlašovací údaje
- Expirované JWT tokeny
- Neautorizované requesty

### 5.3 Rate Limiting
- Zkuste velmi rychlé requesty
- Zkontrolujte Flask-Limiter funkčnost

---

## 🛠️ **DEBUGGING TOOLS**

### Browser Developer Tools
```javascript
// Console debugging
localStorage.getItem('jwt_token');
api.get('/api/auth/profile').then(console.log);
```

### Network Tab
- Zkontrolujte API calls
- Ověřte response times
- Sledujte error codes

### Backend Logs
- Render.com Dashboard → Logs
- Sledujte real-time backend aktivity

---

## 📊 **SUCCESS KRITÉRIA**

### ✅ **Kompletní úspěch:**
- [ ] Všech 6 modulů funguje
- [ ] Frontend ↔ Backend komunikace
- [ ] Autentifikace a autorizace
- [ ] Data persistence v PostgreSQL
- [ ] Responsive design na všech zařízeních
- [ ] Error handling a user feedback
- [ ] Performance pod 2s loading times

### 🎯 **Bonus funkce:**
- [ ] Monica AI integrace (s API klíčem)
- [ ] Real-time battle modes
- [ ] Advanced statistics
- [ ] Admin panel plně funkční

---

## 🚀 **POKRAČOVÁNÍ**

Po úspěšném testování:
1. **Production deployment** na GitHub Pages
2. **Custom domain** setup (volitelné)
3. **Monica AI API** integrace
4. **User feedback** a iterace
5. **Feature rozšíření**

**Začněme testováním! 🧪**

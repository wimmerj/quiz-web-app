# ⚡ Render.com Quick Start Guide

## 🎯 Správné pořadí kroků (5 minut)

### 1️⃣ Registrace (1 min)
- Jděte na [render.com](https://render.com)
- **"Get Started for Free"** → GitHub účet
- Autorizujte přístup

### 2️⃣ Vytvoření databáze (1 min) ← **PRVNÍ!**
- Dashboard → **"New +"** → **"PostgreSQL"**
- Name: `quiz-modular-db`
- Database: `quiz_modular`
- Region: Frankfurt
- Plan: Free
- **"Create Database"**
- ✅ **Zkopírujte Internal Database URL!**

### 3️⃣ Vytvoření Web Service (2 min)
- Dashboard → **"New +"** → **"Web Service"**
- **"Build and deploy from Git"**
- Connect repository: `quiz-web-app`
- Root Directory: `web_backend_modular`
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 4`

### 4️⃣ Environment Variables (1 min)
```bash
FLASK_ENV=production
SECRET_KEY=your-64-character-secret-key
DATABASE_URL=postgresql://user:pass@host/db  # Z kroku 2
CORS_ORIGINS=https://wimmerj.github.io,https://localhost:3000
```

### 5️⃣ Deploy & Test (auto)
- **"Create Web Service"**
- Sledujte Logs
- Test: `https://your-service.onrender.com/api/health`

---

## ❓ FAQ

**Q: Musím vytvořit projekt?**  
A: **NE!** Služby vytváříte přímo z dashboard. Projekty jsou volitelné pro větší apps.

**Q: Proč databáze první?**  
A: Web Service potřebuje DATABASE_URL při startu. Bez databáze deployment selže.

**Q: Jak dlouho trvá první deploy?**  
A: 2-3 minuty build + 30-60s cold start pro první request.

**Q: Co když deployment selže?**  
A: Normální! Render opakuje automaticky. Zkontrolujte Logs.

---

## 🔗 Po nasazení

**Test URLs:**
```
https://your-service.onrender.com/api/health
https://your-service.onrender.com/api/info
```

**Default accounts:**
```
Admin: admin / admin123
Student: student / student123
```

**Pro detailní návod viz:** `RENDER_DEPLOYMENT.md`

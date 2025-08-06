# ✅ Render.com Deployment Checklist

## 📋 Před nasazením

### GitHub Preparation
- [ ] Repository `quiz-web-app` je public nebo máte Render access
- [ ] Folder `web_backend_modular/` obsahuje všechny soubory
- [ ] `requirements.txt` je správný a testovaný
- [ ] `render.yaml` je ve správném umístění
- [ ] Změny jsou committed a pushed na GitHub

### Účet a příprava
- [ ] Render.com účet vytvořen pomocí GitHub
- [ ] GitHub repository je propojené s Render
- [ ] Máte připravené environment variables (SECRET_KEY, etc.)

---

## 🗄️ Vytvoření databáze

### PostgreSQL Setup
- [ ] Nová PostgreSQL databáze vytvořena
- [ ] Name: `quiz-modular-db`
- [ ] Database Name: `quiz_modular`
- [ ] Region: Frankfurt (FRA)
- [ ] Plan: Free
- [ ] Internal Database URL zkopírováno

---

## 🖥️ Vytvoření Web Service

### Basic Configuration
- [ ] Web Service vytvořen z GitHub repository
- [ ] Name: `quiz-modular-backend`
- [ ] Region: Frankfurt (FRA)
- [ ] Branch: `main`
- [ ] Root Directory: `web_backend_modular`
- [ ] Runtime: Python 3

### Build & Deploy Settings
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120`
- [ ] Plan: Free
- [ ] Auto-Deploy: Yes

---

## 🔐 Environment Variables

### Required Variables
- [ ] `FLASK_ENV=production`
- [ ] `SECRET_KEY=` (64-character string)
- [ ] `DATABASE_URL=` (Internal PostgreSQL URL)
- [ ] `CORS_ORIGINS=https://YOUR-USERNAME.github.io,https://localhost:3000`

### Optional Variables
- [ ] `MONICA_API_KEY=` (if you have Monica AI)

### Variable Validation
- [ ] SECRET_KEY má alespoň 32 znaků
- [ ] DATABASE_URL začíná `postgresql://`
- [ ] CORS_ORIGINS obsahuje správný GitHub Pages URL
- [ ] Žádné trailing spaces v proměnných

---

## 🚀 Deployment Process

### First Deploy
- [ ] Deployment spuštěn kliknutím "Create Web Service"
- [ ] Logs zobrazují progress
- [ ] Build phase completed (pip install)
- [ ] Database initialization started
- [ ] Application startup successful

### Expected Log Messages
- [ ] `✅ Database tables created successfully`
- [ ] `✅ Admin user created (username: admin, password: admin123)`
- [ ] `✅ Added X sample questions`
- [ ] `Flask app started`
- [ ] `Listening at: http://0.0.0.0:PORT`

---

## 🔍 Post-Deploy Verification

### Health Checks
- [ ] Service URL dostupný: `https://your-service.onrender.com`
- [ ] Health endpoint: `/api/health` vrací 200 OK
- [ ] Database status: "connected"
- [ ] API info endpoint: `/api/info` vrací správné data

### API Testing
- [ ] Registration endpoint funguje
- [ ] Login s admin/admin123 funguje
- [ ] Quiz tables endpoint vrací data
- [ ] CORS headers přítomny

### Database Verification
- [ ] Users table obsahuje admin a student
- [ ] Questions table obsahuje sample data
- [ ] Database connections stabilní

---

## 🔧 Troubleshooting Steps

### If Build Fails
- [ ] Check Root Directory = `web_backend_modular`
- [ ] Verify requirements.txt syntax
- [ ] Try Manual Deploy
- [ ] Check Logs for specific error

### If Application Fails
- [ ] Check Environment Variables
- [ ] Verify DATABASE_URL connection
- [ ] Wait for cold start (60+ seconds)
- [ ] Check PostgreSQL database status

### If CORS Issues
- [ ] Verify CORS_ORIGINS exact URLs
- [ ] Check protocol (https vs http)
- [ ] No trailing slashes in URLs

---

## 📊 Final Testing

### Automated Testing
- [ ] Run: `python test_render.py https://your-service.onrender.com`
- [ ] All tests pass (health, registration, API)
- [ ] Response times acceptable

### Manual Testing
- [ ] Open health check URL in browser
- [ ] Try API endpoints with Postman/curl
- [ ] Test from frontend application
- [ ] Verify error handling

### Performance Check
- [ ] First request works (cold start)
- [ ] Subsequent requests fast (<1s)
- [ ] Database queries responsive
- [ ] No memory/CPU issues in metrics

---

## 🔗 Frontend Integration

### API Client Update
- [ ] Frontend `api-client.js` má správné production URL
- [ ] CORS working from GitHub Pages
- [ ] Authentication flow funguje
- [ ] All modules communicate correctly

### GitHub Pages
- [ ] Frontend deployed na GitHub Pages
- [ ] Komunikace frontend ↔ backend working
- [ ] No CORS errors in browser console

---

## 📈 Monitoring Setup

### Render Dashboard
- [ ] Bookmark Render dashboard
- [ ] Check Metrics tab pro performance
- [ ] Set up email alerts (optional)
- [ ] Monitor Logs for errors

### External Monitoring
- [ ] Bookmark health check URL
- [ ] Consider uptime monitoring service
- [ ] Set up backup monitoring

---

## 🎉 Deployment Complete!

### Success Criteria
- [ ] ✅ Health check returns 200 OK
- [ ] ✅ Admin login works (admin/admin123)
- [ ] ✅ Quiz API returns data
- [ ] ✅ Database contains sample questions
- [ ] ✅ Frontend can communicate with backend
- [ ] ✅ No CORS errors
- [ ] ✅ Performance acceptable

### URLs to Save
```
Production Backend: https://your-service.onrender.com
Health Check: https://your-service.onrender.com/api/health
API Documentation: https://your-service.onrender.com/api/info
Render Dashboard: https://dashboard.render.com
```

### Credentials
```
Admin: admin / admin123
Student: student / student123
```

---

## 📞 Support Resources

- **Render Documentation:** https://render.com/docs
- **Community:** https://community.render.com
- **Status Page:** https://status.render.com
- **Troubleshooting Guide:** See RENDER_TROUBLESHOOTING.md

**🎯 Deployment Status: [ ] Complete**

---

*Last updated: August 6, 2025*  
*Backend Version: 2.0.0-modular*

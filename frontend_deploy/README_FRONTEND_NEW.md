# 🎯 Frontend Deploy - Quiz Web App

Tato složka obsahuje produkční verzi frontend aplikace optimalizovanou pro GitHub Pages.

## ⚙️ Konfigurace Backend URL

### Automatická konfigurace
Aplikace automaticky detekuje prostředí:
- **GitHub Pages**: Používá produkční backend na Render.com
- **Lokální vývoj**: Používá localhost:5000

### Manuální konfigurace

Pokud potřebujete změnit URL backend serveru:

1. **Editace api-config.js**:
```javascript
const API_CONFIG = {
    PRODUCTION_URL: 'https://your-backend-url.onrender.com',
    DEVELOPMENT_URL: 'http://localhost:5000',
    // ...
};
```

2. **Změna v nastavení aplikace**:
   - Otevřete aplikaci
   - Klikněte na "Nastavení"
   - Změňte "Režim backend" na "Serverová verze"
   - Zadejte správnou URL do "URL serveru"
   - Klikněte "Uložit"

## 🚀 Nasazení

### GitHub Pages
Aplikace se automaticky nasadí na GitHub Pages při push do main branch.

### Lokální testování
```bash
# Spusťte lokální webový server
python -m http.server 8000
# nebo
npx serve .

# Otevřete v prohlížeči
http://localhost:8000/quiz_app.html
```

## 📁 Struktura souborů

- `quiz_app.html` - Hlavní aplikace
- `quiz_app.js` - Logika aplikace
- `enhanced_integration.js` - Backend integrace
- `api-config.js` - Konfigurace API endpoints
- `quiz_styles.css` - Styly aplikace
- `quiz_data.js` - Lokální data pro fallback

## 🔧 Nastavení pro produkci

1. **Aktualizujte Backend URL**:
   - Najděte svou Render.com URL
   - Aktualizujte `PRODUCTION_URL` v `api-config.js`

2. **Test připojení**:
   - Otevřete aplikaci na GitHub Pages
   - Zkontrolujte stav serveru v status baru
   - Zelené ✅ = připojeno, červené ❌ = problém

3. **Troubleshooting**:
   - Zkontrolujte CORS nastavení na backend serveru
   - Ověřte, že backend běží na Render.com
   - Otevřte Developer Tools pro detaily chyb

## 🔗 Odkazy

- **GitHub Pages**: https://wimmerj.github.io/quiz-web-app/frontend_deploy/quiz_app.html
- **Admin Panel**: https://wimmerj.github.io/quiz-web-app/web_frontend/admin/
- **Backend API**: https://your-backend-url.onrender.com/api/health

## 📝 Poznámky

- Aplikace funguje i offline s lokálními daty
- Backend připojení umožňuje sdílení výsledků mezi uživateli
- Všechna nastavení se ukládají do localStorage

# 🌐 Frontend Deploy Package - Google Cloud

## 📦 Co obsahuje tento adresář

**Všechny soubory potřebné pro nahrání na Google Cloud hosting:**

### 🎯 Hlavní soubory
- `index.html` - Úvodní stránka
- `quiz_app.html` - Hlavní quiz aplikace
- `test_oral_exam.html` - Ústní zkouška

### 📜 JavaScript soubory
- `quiz_app.js` - Hlavní logika quiz aplikace
- `enhanced_integration.js` - **Smart Integration** (server/lokální režim)
- `oral_exam_system.js` - Systém ústního zkoušení
- `data_management.js` - Správa dat
- `statistics.js` - Statistiky a grafy
- `accessibility.js` - Přístupnost
- `security_improvements.js` - Bezpečnostní vylepšení
- `ux_improvements.js` - UX vylepšení

### 🎨 Styly
- `quiz_styles.css` - Základní styly
- `oral_exam_styles.css` - Styly pro ústní zkoušení
- `enhanced_integration.css` - Styly pro smart integration
- `advanced_styles.css` - Pokročilé styly

### 📊 Data
- `quiz_data.js` - JavaScript data pro quiz
- `quiz_data.json` - JSON data pro quiz

## 🚀 Deployment na Google Cloud

1. **Nahrajte všechny soubory** z tohoto adresáře na Google Cloud
2. **Nastavte `index.html` jako výchozí stránku**
3. **Konfigurace není potřeba** - frontend automaticky detekuje:
   - Zda je dostupný backend server (lokální nebo vzdálený)
   - Přepne mezi server/lokální režimem
   - Zobrazí instrukce pro spuštění backendu

## ⚙️ Smart Integration Features

Frontend obsahuje **smart integration**, který:
- ✅ **Automaticky detekuje** dostupnost backend serveru
- ✅ **Dual mode**: server databáze nebo lokální úložiště  
- ✅ **Waiting mode**: čeká na spuštění backendu s instrukcemi
- ✅ **Seamless switch**: přepíná mezi režimy bez ztráty dat
- ✅ **Monica AI**: funkční v server režimu
- ✅ **Kompatibilita**: funguje s původním i enhanced backendem

## 🔗 Backend připojení

Frontend se pokusí připojit k backend serveru na:
- `http://localhost:5000` (lokální development)
- Můžete změnit URL v `enhanced_integration.js`

**Pokud backend není dostupný, automaticky přepne na lokální režim.**

## 📱 Responsive Design

Všechny stránky jsou optimalizované pro:
- 💻 Desktop
- 📱 Mobile
- 📱 Tablet
- ♿ Accessibility

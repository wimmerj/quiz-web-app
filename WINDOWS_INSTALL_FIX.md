# 🚀 Windows 10 Instalace - Krok za Krokem

## ❌ **Problém vyřešen:**
Váš Windows má **Restricted** execution policy - už jsme to opravili!

## 🔧 **Aktuální stav:**
- ✅ PowerShell execution policy nastavena
- ❌ Node.js není nainstalován/není v PATH

## 📋 **Co musíte udělat NYNÍ:**

### **Krok 1: Stáhněte Node.js**
👆 **Otevřel jsem vám stránku:** https://nodejs.org/en/download/

1. **Klikněte na "Windows Installer (.msi)"** - 64-bit verze
2. **Stáhněte LTS verzi** (doporučeno - stabilní)

### **Krok 2: Instalace Node.js**
1. **Spusťte stažený .msi soubor**
2. **DŮLEŽITÉ:** Při instalaci zaškrtněte:
   - ✅ "Add to PATH environment variable"
   - ✅ "Install npm package manager"
3. **Dokončete instalaci** (restart může být potřeba)

### **Krok 3: Restart PowerShell**
```powershell
# Zavřete toto okno PowerShell
# Otevřete nové PowerShell jako administrátor
```

### **Krok 4: Ověření (po restartu)**
```powershell
node --version    # Mělo by vypsat v18.x.x nebo v20.x.x
npm --version     # Mělo by vypsat 9.x.x nebo 10.x.x
```

### **Krok 5: Instalace Vercel CLI**
```powershell
npm install -g vercel
```

## 🎯 **Alternativní rychlé řešení:**

Pokud máte **Windows Package Manager** (winget):

```powershell
# Zkuste tuto metodu (rychlejší):
winget install OpenJS.NodeJS

# Pak restartujte PowerShell a:
npm install -g vercel
```

## 🚨 **Pokud problémy přetrvávají:**

### **Ručně přidejte do PATH:**
1. **Win + R** → `sysdm.cpl`
2. **Advanced** → **Environment Variables**
3. **System Variables** → najděte **Path**
4. **Přidejte:** `C:\Program Files\nodejs\`

### **Ověřte instalaci:**
```powershell
# Zkontrolujte, jestli existuje:
Test-Path "C:\Program Files\nodejs\node.exe"
Test-Path "C:\Program Files\nodejs\npm.cmd"
```

## ✅ **Po úspěšné instalaci:**

Vraťte se k hlavnímu návodu v README.md a pokračujte krokem:

```powershell
cd c:\Users\honza\Documents\13_Programming\HTML\quiz-web-app\vercel-api-proxy
vercel login
```

## 💡 **Pro příště:**
- Execution policy už máte nastavenou ✅
- Node.js bude fungovat po instalaci ✅
- Vercel CLI půjde nainstalovat ✅

**Napište mi, až budete mít Node.js nainstalován a otestovaný!** 🎉

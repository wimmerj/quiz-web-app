# Enhanced Logging System - Dokumentace

## Přehled

Enhanced Logging System je pokročilý logovací systém pro Quiz Web App, který poskytuje komplexní sledování všech aktivit uživatelů, API volání, stavu serveru a systémových událostí s možností stažení logů ve formátu JSON.

## Funkcionalita

### 🔍 **Základní Logování**
- Rozdělení logů podle typů: `info`, `success`, `warning`, `error`, `system`
- Automatické časové značky
- Barevné rozlišení podle typu
- Automatické scrollování k nejnovějším záznamům

### 📊 **Action Logging**
- Sledování konkrétních uživatelských akcí
- Strukturovaná metadata pro každou akci
- Kategorizace podle typu akce (button_click, form_submit, api_call, atd.)

### 🌐 **Server Status Monitoring**
- Sledování stavu připojení k serveru
- Měření ping času
- Detekce změn stavu (online, offline, checking, unstable)
- Automatické logování při změnách

### 💾 **Session Management**
- Sledování relace uživatele
- Unikátní session ID
- Počítání akcí v relaci
- Metadata o prohlížeči a prostředí

### 📥 **Download Capability**
- Export všech logů do JSON souboru
- Zachování struktury a metadat
- Automatické pojmenování souborů s timestamp
- Filtrování podle typu logů

## API Reference

### Inicializace

```javascript
// Inicializace enhanced loggeru
const enhancedLogger = new EnhancedLogger();
window.enhancedLogger = enhancedLogger;
```

### Základní Metody

#### `log(message, type, metadata)`
Základní logování zpráv.

```javascript
enhancedLogger.log('Aplikace načtena', 'info');
enhancedLogger.log('Uživatel přihlášen', 'success');
enhancedLogger.log('Upozornění: Nízká úroveň baterie', 'warning');
enhancedLogger.log('Chyba připojení k serveru', 'error');
enhancedLogger.log('Systém restartován', 'system');
```

**Parametry:**
- `message` (string): Text zprávy
- `type` (string): Typ logu - 'info', 'success', 'warning', 'error', 'system'
- `metadata` (object, optional): Dodatečná data

#### `logAction(actionType, data)`
Logování strukturovaných akcí uživatele.

```javascript
enhancedLogger.logAction('button_click', { 
    buttonId: 'startQuiz',
    timestamp: Date.now(),
    userAgent: navigator.userAgent
});

enhancedLogger.logAction('api_call', {
    url: '/api/auth/login',
    method: 'POST',
    status: 200,
    duration: 234
});

enhancedLogger.logAction('form_submit', {
    formType: 'registration',
    fields: ['username', 'email', 'password'],
    success: true
});
```

**Parametry:**
- `actionType` (string): Typ akce
- `data` (object): Data související s akcí

#### `logServerStatus(status, pingTime)`
Logování stavu serveru.

```javascript
enhancedLogger.logServerStatus('online', 145);    // Server online, ping 145ms
enhancedLogger.logServerStatus('offline', null);  // Server offline
enhancedLogger.logServerStatus('checking', null); // Kontrola připojení
enhancedLogger.logServerStatus('unstable', 2500); // Nestabilní připojení
```

**Parametry:**
- `status` (string): Stav serveru - 'online', 'offline', 'checking', 'unstable'
- `pingTime` (number|null): Ping čas v milisekundách

### Správa Logů

#### `clearLogs()`
Vymaže všechny logy z paměti i z UI.

```javascript
enhancedLogger.clearLogs();
```

#### `downloadLogs(filename)`
Stáhne všechny logy jako JSON soubor.

```javascript
enhancedLogger.downloadLogs(); // Automatické pojmenování
enhancedLogger.downloadLogs('custom-logs.json'); // Vlastní název
```

#### `getLogs()`
Vrátí všechny logy jako pole objektů.

```javascript
const allLogs = enhancedLogger.getLogs();
console.log(`Celkem logů: ${allLogs.length}`);
```

#### `getLogsByType(type)`
Vrátí logy filtrované podle typu.

```javascript
const errorLogs = enhancedLogger.getLogsByType('error');
const actionLogs = enhancedLogger.getLogsByType('action');
```

#### `getActionsByType(actionType)`
Vrátí akce filtrované podle typu.

```javascript
const apiCalls = enhancedLogger.getActionsByType('api_call');
const buttonClicks = enhancedLogger.getActionsByType('button_click');
```

## Struktura Logů

### Základní Log
```json
{
    "id": "log_1704134567890_123",
    "timestamp": "2024-01-01T15:42:47.890Z",
    "type": "info",
    "message": "Uživatel přihlášen",
    "sessionId": "session_1704134567890",
    "metadata": {}
}
```

### Action Log
```json
{
    "id": "action_1704134567890_124",
    "timestamp": "2024-01-01T15:42:47.890Z",
    "type": "action",
    "actionType": "api_call",
    "sessionId": "session_1704134567890",
    "data": {
        "url": "/api/auth/login",
        "method": "POST",
        "status": 200,
        "duration": 234
    }
}
```

### Server Status Log
```json
{
    "id": "server_1704134567890_125",
    "timestamp": "2024-01-01T15:42:47.890Z",
    "type": "server_status",
    "status": "online",
    "pingTime": 145,
    "sessionId": "session_1704134567890"
}
```

## Integrace s Quiz App

### HTML Integrace

```html
<!-- Přidání do quiz_app.html -->
<script src="enhanced_logging.js"></script>

<!-- Debug panel aktualizace -->
<div class="debug-controls">
    <div class="debug-buttons">
        <button onclick="clearDebugLog()" class="debug-clear">Vymazat</button>
        <button onclick="downloadDebugLog()" class="debug-download">📥 Stáhnout</button>
    </div>
    <div class="debug-stats">
        <span id="debugStats">Logů: 0</span>
    </div>
</div>
```

### JavaScript Integrace

```javascript
// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    if (window.EnhancedLogger) {
        window.enhancedLogger = new EnhancedLogger();
        enhancedLogger.log('Enhanced Logger initialized', 'system');
    }
});

// Funkce pro UI
function clearDebugLog() {
    if (window.enhancedLogger) {
        enhancedLogger.clearLogs();
    }
}

function downloadDebugLog() {
    if (window.enhancedLogger) {
        enhancedLogger.downloadLogs();
    }
}
```

### Enhanced Integration Integrace

```javascript
// V enhanced_integration.js
log(message, type = 'info', action = null, metadata = {}) {
    if (window.enhancedLogger) {
        if (action) {
            enhancedLogger.logAction(action, { message, ...metadata });
        } else {
            enhancedLogger.log(message, type);
        }
    }
}

// Použití
this.log('Server ping successful', 'success', 'server_ping', { pingTime: 145 });
```

## Typy Akcí

### Běžné Action Types
- `button_click` - Kliknutí na tlačítko
- `form_submit` - Odeslání formuláře
- `form_input` - Vstup do formuláře
- `navigation` - Navigace mezi stránkami
- `modal_open` - Otevření modálního okna
- `modal_close` - Zavření modálního okna

### Authentication Actions
- `user_login` - Přihlášení uživatele
- `user_logout` - Odhlášení uživatele
- `user_register` - Registrace uživatele
- `password_change` - Změna hesla

### API Actions
- `api_call` - API volání
- `server_ping` - Ping serveru
- `server_connect` - Připojení k serveru
- `server_disconnect` - Odpojení od serveru

### Quiz Actions
- `quiz_start` - Spuštění kvízu
- `quiz_answer` - Odpověď na otázku
- `quiz_end` - Ukončení kvízu
- `table_select` - Výběr tabulky otázek

## Výhody Enhanced Logging

### 🔍 **Ladění (Debugging)**
- Rychlé identifikace problémů
- Sledování toku aplikace
- Analýza chyb a jejich kontextu

### 📈 **Analýza Výkonu**
- Měření rychlosti API volání
- Sledování odezvy serveru
- Identifikace úzkých míst

### 👤 **Analýza Uživatelského Chování**
- Sledování interakcí uživatele
- Analýza používání funkcí
- Optimalizace UX na základě dat

### 🛠️ **Údržba a Podpora**
- Export logů pro technickou podporu
- Historický přehled činnosti
- Proaktivní řešení problémů

### 🔒 **Audit a Compliance**
- Sledování přístupů k systému
- Audit bezpečnostních událostí
- Compliance s požadavky na logování

## Testování

Pro testování enhanced logging systému použijte:

```
test_enhanced_logging.html
```

Testovací stránka obsahuje:
- Testy všech základních funkcí
- Simulaci různých scénářů
- Performance testy
- Stress testy
- Test downloadů

## Troubleshooting

### Logger se neinicializuje
```javascript
// Zkontrolujte, jestli je script načten
if (typeof EnhancedLogger === 'undefined') {
    console.error('EnhancedLogger not loaded');
}

// Zkontrolujte DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Inicializace zde
});
```

### Logy se nezobrazují v UI
```javascript
// Zkontrolujte debug panel element
const debugLog = document.getElementById('debugLog');
if (!debugLog) {
    console.error('Debug log element not found');
}
```

### Download nefunguje
```javascript
// Zkontrolujte podporu prohlížeče
if (typeof Blob === 'undefined') {
    console.error('Browser does not support Blob API');
}
```

## Budoucí Vylepšení

### 🔮 **Plánované Funkce**
- Filtrování logů v real-time
- Export do různých formátů (CSV, XML)
- Vzdálené odesílání logů na server
- Grafické zobrazení statistik
- Automatické čištění starých logů
- Kompresi dat pro velké logy

### 🎯 **Optimalizace**
- Lazy loading pro velké množství logů
- Indexování pro rychlejší vyhledávání
- Memory management pro dlouhé relace
- WebWorker pro asynchronní zpracování

---

## Autor
Enhanced Logging System pro Quiz Web App  
Verze: 1.0  
Datum: Leden 2024

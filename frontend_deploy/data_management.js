// Pokročilé data management a konfigurace

class DataManager {
    constructor() {
        this.version = '1.0.0';
        this.migrations = new Map();
        this.initMigrations();
    }
    
    initMigrations() {
        // Migrace pro přechod na novější verze dat
        this.migrations.set('0.9.0', (data) => {
            // Přidání nových polí do uživatelských dat
            if (data.users) {
                Object.keys(data.users).forEach(username => {
                    if (!data.users[username].preferences) {
                        data.users[username].preferences = {
                            theme: 'auto',
                            difficulty: 'normal',
                            notifications: true
                        };
                    }
                });
            }
            return data;
        });
    }
    
    migrateData() {
        const currentVersion = localStorage.getItem('quiz_app_version') || '0.9.0';
        
        if (currentVersion !== this.version) {
            console.log(`Migrace dat z verze ${currentVersion} na ${this.version}`);
            
            // Provést všechny potřebné migrace
            this.migrations.forEach((migration, version) => {
                if (this.isNewerVersion(version, currentVersion)) {
                    const allData = this.getAllStorageData();
                    const migratedData = migration(allData);
                    this.saveAllStorageData(migratedData);
                }
            });
            
            localStorage.setItem('quiz_app_version', this.version);
        }
    }
    
    isNewerVersion(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return true;
            if (v1Part < v2Part) return false;
        }
        
        return false;
    }
    
    getAllStorageData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('quiz_app_')) {
                const cleanKey = key.replace('quiz_app_', '');
                try {
                    data[cleanKey] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    data[cleanKey] = localStorage.getItem(key);
                }
            }
        }
        return data;
    }
    
    saveAllStorageData(data) {
        Object.keys(data).forEach(key => {
            const storageKey = `quiz_app_${key}`;
            try {
                localStorage.setItem(storageKey, JSON.stringify(data[key]));
            } catch (e) {
                console.error(`Chyba při ukládání ${key}:`, e);
            }
        });
    }
    
    exportData() {
        const data = this.getAllStorageData();
        data.exportDate = new Date().toISOString();
        data.version = this.version;
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validace dat
                    if (!this.validateImportData(data)) {
                        reject(new Error('Neplatný formát dat'));
                        return;
                    }
                    
                    // Záloha současných dat
                    const backup = this.getAllStorageData();
                    localStorage.setItem('quiz_app_backup', JSON.stringify(backup));
                    
                    // Import nových dat
                    delete data.exportDate;
                    delete data.version;
                    this.saveAllStorageData(data);
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error('Chyba při čtení souboru: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
            reader.readAsText(file);
        });
    }
    
    validateImportData(data) {
        // Základní validace struktury dat
        if (!data || typeof data !== 'object') return false;
        
        // Kontrola, zda obsahuje alespoň některá očekávaná pole
        const expectedFields = ['users', 'settings', 'last_user'];
        return expectedFields.some(field => data.hasOwnProperty(field));
    }
    
    clearAllData() {
        if (confirm('Opravdu chcete smazat všechna data? Tato akce je nevratná!')) {
            // Záloha před smazáním
            const backup = this.getAllStorageData();
            sessionStorage.setItem('quiz_app_emergency_backup', JSON.stringify(backup));
            
            // Smazání všech dat
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('quiz_app_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Restart aplikace
            window.location.reload();
        }
    }
    
    getStorageUsage() {
        let totalSize = 0;
        const itemSizes = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('quiz_app_')) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                totalSize += size;
                itemSizes[key.replace('quiz_app_', '')] = size;
            }
        }
        
        return {
            totalSize,
            itemSizes,
            totalSizeFormatted: this.formatBytes(totalSize),
            percentage: (totalSize / (5 * 1024 * 1024)) * 100 // 5MB limit
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Pokročilé nastavení s validací
class AdvancedSettings {
    constructor() {
        this.defaults = {
            theme: 'auto', // 'light', 'dark', 'auto'
            language: 'cs',
            difficulty: 'normal', // 'easy', 'normal', 'hard'
            autoSave: true,
            notifications: true,
            sound: true,
            animations: true,
            accessibility: {
                highContrast: false,
                reducedMotion: false,
                screenReader: false
            },
            quiz: {
                showHints: false,
                timeLimit: 0, // 0 = žádný limit
                shuffleQuestions: false,
                shuffleAnswers: false,
                showExplanations: true
            },
            ui: {
                questionFontSize: 'auto', // 'small', 'medium', 'large', 'auto'
                answerFontSize: 'auto',
                compactMode: false
            }
        };
    }
    
    get(path = null) {
        const settings = { ...this.defaults, ...this.loadFromStorage() };
        
        if (!path) return settings;
        
        return path.split('.').reduce((obj, key) => obj?.[key], settings);
    }
    
    set(path, value) {
        const settings = this.get();
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, settings);
        
        target[lastKey] = value;
        this.save(settings);
    }
    
    loadFromStorage() {
        try {
            return JSON.parse(localStorage.getItem('quiz_app_advanced_settings')) || {};
        } catch (e) {
            return {};
        }
    }
    
    save(settings) {
        localStorage.setItem('quiz_app_advanced_settings', JSON.stringify(settings));
        this.applySettings(settings);
    }
    
    applySettings(settings) {
        // Aplikovat nastavení na UI
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.setAttribute('data-animations', settings.animations);
        document.documentElement.setAttribute('data-high-contrast', settings.accessibility.highContrast);
        
        // CSS proměnné
        const root = document.documentElement;
        if (settings.ui.questionFontSize !== 'auto') {
            const sizes = { small: '20px', medium: '28px', large: '36px' };
            root.style.setProperty('--question-font-size', sizes[settings.ui.questionFontSize]);
        }
    }
    
    reset() {
        localStorage.removeItem('quiz_app_advanced_settings');
        this.applySettings(this.defaults);
    }
}

/**
 * API Configuration for Quiz Web App
 * Konfigurace pro komunikaci s backend API
 */

const API_CONFIG = {
    // Produkční URL na Render.com (nahraďte XXX skutečnou URL)
    PRODUCTION_URL: 'https://quiz-web-app-wpls.onrender.com',
    
    // Development URL pro lokální vývoj
    DEVELOPMENT_URL: 'http://localhost:5000',
    
    // Automatická detekce prostředí
    getCurrentUrl() {
        // Pokud jdeme z GitHub Pages, použij produkční URL
        if (window.location.hostname.includes('github.io')) {
            return this.PRODUCTION_URL;
        }
        // Jinak použij development URL
        return this.DEVELOPMENT_URL;
    },
    
    // Výchozí nastavení pro aplikaci
    getDefaultSettings() {
        const isProduction = window.location.hostname.includes('github.io');
        
        return {
            backendMode: isProduction ? 'server' : 'local',
            serverUrl: isProduction ? this.PRODUCTION_URL : this.DEVELOPMENT_URL
        };
    }
};

// Globální dostupnost
window.API_CONFIG = API_CONFIG;

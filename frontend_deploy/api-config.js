/**
 * API Configuration for Quiz Web App
 * Konfigurace pro komunikaci s backend API
 */

const API_CONFIG = {
    // Produkční URL na Render.com - NOVÝ modular backend
    PRODUCTION_URL: 'https://quiz-modular-backend.onrender.com',
    
    // Development URL pro lokální vývoj
    DEVELOPMENT_URL: 'http://localhost:5000',
    
    // Monica AI API Proxy na Vercel (nová bezplatná alternativa)
    MONICA_API_URL: 'https://quiz-api-proxy-37drka9ro-jan-wimmers-projects.vercel.app/api/monica',
    
    // Automatická detekce prostředí
    getCurrentUrl() {
        // Pokud jdeme z GitHub Pages, použij produkční URL
        if (window.location.hostname.includes('github.io')) {
            return this.PRODUCTION_URL;
        }
        // Jinak použij development URL
        return this.DEVELOPMENT_URL;
    },
    
    // Získá Monica API URL
    getMonicaUrl() {
        return this.MONICA_API_URL;
    },
    
    // Výchozí nastavení pro aplikaci
    getDefaultSettings() {
        const isProduction = window.location.hostname.includes('github.io');
        
        return {
            backendMode: isProduction ? 'server' : 'local',
            serverUrl: isProduction ? this.PRODUCTION_URL : this.DEVELOPMENT_URL,
            monicaUrl: this.MONICA_API_URL
        };
    }
};

// Globální dostupnost
window.API_CONFIG = API_CONFIG;

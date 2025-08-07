/**
 * MODULAR QUIZ APP - NAVIGATION SYSTEM
 * SPA-like navigation mezi moduly
 */

class NavigationManager {
    constructor() {
        this.currentModule = null;
        this.navigationHistory = [];
        this.modules = {
            'auth': '/pages/auth/login.html',
            'quiz': '/pages/quiz/quiz.html',
            'oral-exam': '/pages/oral-exam/oral-exam.html',
            'battle': '/pages/battle/battle.html',
            'admin': '/pages/admin/admin.html',
            'settings': '/pages/settings/settings.html',
            'home': '/index.html'
        };
        
        this.init();
    }
    
    init() {
        this.setupNavigationHandlers();
        this.detectCurrentModule();
        this.setupBackButton();
        
        console.log('NavigationManager initialized');
    }
    
    setupNavigationHandlers() {
        // Handle všechny navigační linky
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-navigate]');
            if (link) {
                e.preventDefault();
                const module = link.getAttribute('data-navigate');
                this.navigateToModule(module);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.navigateToModule('home');
            }
        });
    }
    
    detectCurrentModule() {
        const path = window.location.pathname;
        
        for (const [module, modulePath] of Object.entries(this.modules)) {
            if (path.includes(modulePath.replace('.html', ''))) {
                this.currentModule = module;
                break;
            }
        }
        
        if (!this.currentModule) {
            this.currentModule = 'home';
        }
        
        console.log(`Current module detected: ${this.currentModule}`);
    }
    
    navigateToModule(module) {
        if (!this.modules[module]) {
            console.error(`Module '${module}' not found`);
            return;
        }
        
        // Add to history
        if (this.currentModule) {
            this.navigationHistory.push(this.currentModule);
        }
        
        const targetPath = this.modules[module];
        const fullPath = this.resolveModulePath(targetPath);
        
        console.log(`Navigating to module: ${module} (${fullPath})`);
        
        // Save navigation state
        this.saveNavigationState();
        
        // Navigate
        window.location.href = fullPath;
    }
    
    resolveModulePath(path) {
        // Resolve relative path based on current location
        const currentPath = window.location.pathname;
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
        
        if (currentDir.includes('/pages/')) {
            // We're in a module, go back to frontend root
            return '../../' + path.substring(1);
        } else if (currentDir.includes('/frontend')) {
            // We're in frontend root
            return '.' + path;
        } else {
            // We're probably in modular-app root
            return './frontend' + path;
        }
    }
    
    setupBackButton() {
        // Browser back button support
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.module) {
                this.currentModule = e.state.module;
                this.loadNavigationState();
            }
        });
    }
    
    goBack() {
        if (this.navigationHistory.length > 0) {
            const previousModule = this.navigationHistory.pop();
            this.navigateToModule(previousModule);
        } else {
            this.navigateToModule('home');
        }
    }
    
    saveNavigationState() {
        const state = {
            module: this.currentModule,
            history: this.navigationHistory,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('quiz_navigation_state', JSON.stringify(state));
        
        // Push state for browser history
        history.pushState(
            { module: this.currentModule },
            `Quiz App - ${this.currentModule}`,
            window.location.href
        );
    }
    
    loadNavigationState() {
        try {
            const saved = localStorage.getItem('quiz_navigation_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.navigationHistory = state.history || [];
                console.log('Navigation state loaded', state);
            }
        } catch (error) {
            console.error('Error loading navigation state:', error);
        }
    }
    
    // Utility methods
    getCurrentModule() {
        return this.currentModule;
    }
    
    getAvailableModules() {
        return Object.keys(this.modules);
    }
    
    createNavigationMenu() {
        const moduleInfo = {
            'home': { icon: '🏠', title: 'Hlavní stránka' },
            'auth': { icon: '🔐', title: 'Přihlášení' },
            'quiz': { icon: '📝', title: 'Quiz' },
            'oral-exam': { icon: '🎤', title: 'Ústní zkoušení' },
            'battle': { icon: '⚔️', title: 'Battle Mode' },
            'admin': { icon: '👨‍💼', title: 'Admin' },
            'settings': { icon: '⚙️', title: 'Nastavení' }
        };
        
        // Pokud existuje kontejner pro horizontální navigaci, použij ho
        const container = document.getElementById('navigation-links-container');
        if (container) {
            let links = [];
            for (const [module, info] of Object.entries(moduleInfo)) {
                if (module !== this.currentModule) { // Nezobrazuj aktuální modul
                    const link = `<a href="#" data-navigate="${module}">${info.icon} ${info.title}</a>`;
                    links.push(link);
                }
            }
            container.innerHTML = links.join(' | ');
            return container;
        }
        
        // Fallback - původní vertikální navigace
        const nav = document.createElement('nav');
        nav.className = 'navigation-menu';
        
        const ul = document.createElement('ul');
        
        for (const [module, info] of Object.entries(moduleInfo)) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = '#';
            a.setAttribute('data-navigate', module);
            a.innerHTML = `${info.icon} ${info.title}`;
            a.className = module === this.currentModule ? 'active' : '';
            
            li.appendChild(a);
            ul.appendChild(li);
        }
        
        nav.appendChild(ul);
        return nav;
    }
    
    // Breadcrumb generation
    createBreadcrumb() {
        const breadcrumb = document.createElement('nav');
        breadcrumb.className = 'breadcrumb';
        
        const ol = document.createElement('ol');
        
        // Home
        const homeLi = document.createElement('li');
        const homeA = document.createElement('a');
        homeA.href = '#';
        homeA.setAttribute('data-navigate', 'home');
        homeA.textContent = 'Domů';
        homeLi.appendChild(homeA);
        ol.appendChild(homeLi);
        
        // Current module (if not home)
        if (this.currentModule && this.currentModule !== 'home') {
            const currentLi = document.createElement('li');
            currentLi.className = 'active';
            currentLi.textContent = this.getModuleTitle(this.currentModule);
            ol.appendChild(currentLi);
        }
        
        breadcrumb.appendChild(ol);
        return breadcrumb;
    }
    
    getModuleTitle(module) {
        const titles = {
            'auth': 'Přihlášení',
            'quiz': 'Quiz',
            'oral-exam': 'Ústní zkoušení',
            'battle': 'Battle Mode',
            'admin': 'Administrace',
            'settings': 'Nastavení'
        };
        
        return titles[module] || module;
    }
}

// Global navigation instance
let Navigation = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Navigation = new NavigationManager();
    window.Navigation = Navigation; // Make globally available
    
    // Add navigation menu to pages - prioritize breadcrumb container
    const navigationContainer = document.getElementById('navigation-links-container');
    if (navigationContainer) {
        // Use horizontal breadcrumb navigation
        Navigation.createNavigationMenu();
    } else {
        // Fallback to traditional vertical navigation
        const existingNav = document.querySelector('.navigation-menu');
        if (!existingNav && !document.body.classList.contains('no-navigation')) {
            const header = document.querySelector('header') || document.body.firstElementChild;
            if (header) {
                header.appendChild(Navigation.createNavigationMenu());
            }
        }
    }
    
    // Add breadcrumb
    const existingBreadcrumb = document.querySelector('.breadcrumb');
    if (!existingBreadcrumb && !document.body.classList.contains('no-breadcrumb')) {
        const main = document.querySelector('main') || document.querySelector('.container') || document.body;
        if (main) {
            main.insertBefore(Navigation.createBreadcrumb(), main.firstChild);
        }
    }
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}

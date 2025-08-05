// Vylepšení error handlingu a UX

// 1. Toast notifikace místo alert()
class NotificationSystem {
    constructor() {
        this.createContainer();
    }
    
    createContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getColor(type)};
            color: white;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${this.getIcon(type)}</span>
                <span>${message}</span>
                <span style="margin-left: auto; opacity: 0.7;">✕</span>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255,255,255,0.3); width: 100%; animation: progress ${duration}ms linear;"></div>
        `;
        
        notification.onclick = () => this.remove(notification);
        
        const container = document.getElementById('notification-container');
        container.appendChild(notification);
        
        setTimeout(() => this.remove(notification), duration);
    }
    
    getColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }
    
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    remove(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// 2. Loading state management
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.createOverlay();
    }
    
    createOverlay() {
        if (document.getElementById('loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <div id="loading-text">Načítání...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    show(text = 'Načítání...', id = 'default') {
        this.activeLoaders.add(id);
        const overlay = document.getElementById('loading-overlay');
        const textElement = document.getElementById('loading-text');
        
        textElement.textContent = text;
        overlay.style.display = 'flex';
    }
    
    hide(id = 'default') {
        this.activeLoaders.delete(id);
        
        if (this.activeLoaders.size === 0) {
            const overlay = document.getElementById('loading-overlay');
            overlay.style.display = 'none';
        }
    }
}

// 3. Offline detection
class OfflineManager {
    constructor(callback) {
        this.callback = callback;
        this.isOnline = navigator.onLine;
        this.setupListeners();
    }
    
    setupListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.callback(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.callback(false);
        });
    }
}

// 4. Auto-save funkce
class AutoSave {
    constructor(saveFunction, interval = 30000) {
        this.saveFunction = saveFunction;
        this.interval = interval;
        this.timer = null;
        this.hasChanges = false;
        this.start();
    }
    
    markChanged() {
        this.hasChanges = true;
    }
    
    start() {
        this.timer = setInterval(() => {
            if (this.hasChanges) {
                this.saveFunction();
                this.hasChanges = false;
            }
        }, this.interval);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    saveNow() {
        if (this.hasChanges) {
            this.saveFunction();
            this.hasChanges = false;
        }
    }
}

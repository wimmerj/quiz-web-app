/**
 * MODULAR QUIZ APP - UNIFIED LOGGER
 * Centralizovaný logging systém pro všechny moduly
 */

class ModularLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevels = {
            'system': 0,
            'error': 1,
            'warning': 2,
            'info': 3,
            'success': 4,
            'debug': 5,
            'action': 6
        };
        this.currentLevel = 5; // Show all logs by default
        this.persistLogs = true;
        
        this.init();
    }
    
    init() {
        this.loadPersistedLogs();
        this.setupConsoleIntegration();
        this.log('system', 'ModularLogger initialized');
    }
    
    log(type, message, data = null) {
        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            type: type || 'info',
            message: message || '',
            data: data,
            module: this.detectCurrentModule(),
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        // Add to logs array
        this.logs.push(entry);
        
        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Persist if enabled
        if (this.persistLogs) {
            this.persistToStorage();
        }
        
        // Output to console
        this.outputToConsole(entry);
        
        // Update debug panel if exists
        this.updateDebugPanel(entry);
        
        // Trigger events for other components
        this.triggerLogEvent(entry);
        
        return entry;
    }
    
    detectCurrentModule() {
        const path = window.location.pathname;
        
        if (path.includes('/auth/')) return 'auth';
        if (path.includes('/quiz/')) return 'quiz';
        if (path.includes('/oral-exam/')) return 'oral-exam';
        if (path.includes('/battle/')) return 'battle';
        if (path.includes('/admin/')) return 'admin';
        if (path.includes('/settings/')) return 'settings';
        if (path.includes('modular-app')) return 'modular-home';
        
        return 'unknown';
    }
    
    outputToConsole(entry) {
        const styles = {
            'system': 'color: #9C27B0; font-weight: bold',
            'error': 'color: #F44336; font-weight: bold',
            'warning': 'color: #FF9800; font-weight: bold',
            'info': 'color: #2196F3',
            'success': 'color: #4CAF50; font-weight: bold',
            'debug': 'color: #607D8B',
            'action': 'color: #E91E63; font-weight: bold'
        };
        
        const style = styles[entry.type] || styles['info'];
        const prefix = `[${entry.type.toUpperCase()}] [${entry.module}]`;
        
        console.log(`%c${prefix} ${entry.message}`, style, entry.data || '');
    }
    
    updateDebugPanel(entry) {
        const debugLog = document.getElementById('debugLog');
        if (!debugLog) return;
        
        const logElement = document.createElement('div');
        logElement.className = `debug-entry ${entry.type}`;
        logElement.dataset.logId = entry.id;
        
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        
        logElement.innerHTML = `
            <span class="debug-timestamp">[${timestamp}]</span>
            <span class="debug-module">[${entry.module}]</span>
            <span class="debug-type">${entry.type.toUpperCase()}</span>
            <span class="debug-message">${entry.message}</span>
            ${entry.data ? `<details class="debug-data"><summary>Data</summary><pre>${JSON.stringify(entry.data, null, 2)}</pre></details>` : ''}
        `;
        
        debugLog.appendChild(logElement);
        
        // Auto-scroll
        debugLog.scrollTop = debugLog.scrollHeight;
        
        // Limit DOM entries
        if (debugLog.children.length > 100) {
            debugLog.removeChild(debugLog.firstChild);
        }
        
        // Update stats
        this.updateDebugStats();
    }
    
    updateDebugStats() {
        const statsElement = document.getElementById('debugStats');
        if (!statsElement) return;
        
        const stats = this.getLogStats();
        statsElement.innerHTML = `
            Logů: ${stats.total} | 
            Chyby: ${stats.errors} | 
            Varování: ${stats.warnings} | 
            Akce: ${stats.actions}
        `;
    }
    
    getLogStats() {
        const stats = {
            total: this.logs.length,
            errors: 0,
            warnings: 0,
            actions: 0,
            byModule: {}
        };
        
        this.logs.forEach(log => {
            if (log.type === 'error') stats.errors++;
            if (log.type === 'warning') stats.warnings++;
            if (log.type === 'action') stats.actions++;
            
            if (!stats.byModule[log.module]) {
                stats.byModule[log.module] = 0;
            }
            stats.byModule[log.module]++;
        });
        
        return stats;
    }
    
    setupConsoleIntegration() {
        // Capture console errors
        const originalError = console.error;
        console.error = (...args) => {
            this.log('error', args.join(' '), { source: 'console' });
            originalError.apply(console, args);
        };
        
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.log('error', `Unhandled error: ${event.message}`, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log('error', `Unhandled promise rejection: ${event.reason}`, {
                promise: event.promise,
                reason: event.reason
            });
        });
    }
    
    triggerLogEvent(entry) {
        const event = new CustomEvent('modularlog', {
            detail: entry
        });
        document.dispatchEvent(event);
    }
    
    // Storage methods
    persistToStorage() {
        try {
            const dataToStore = {
                logs: this.logs.slice(-500), // Store only last 500 logs
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem('modular_quiz_logs', JSON.stringify(dataToStore));
        } catch (error) {
            console.warn('Failed to persist logs to storage:', error);
        }
    }
    
    loadPersistedLogs() {
        try {
            const stored = localStorage.getItem('modular_quiz_logs');
            if (stored) {
                const data = JSON.parse(stored);
                this.logs = data.logs || [];
                this.log('system', `Loaded ${this.logs.length} persisted logs`);
            }
        } catch (error) {
            console.warn('Failed to load persisted logs:', error);
        }
    }
    
    // Public API methods
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('modular_quiz_logs');
        
        // Clear debug panel
        const debugLog = document.getElementById('debugLog');
        if (debugLog) {
            debugLog.innerHTML = '';
        }
        
        this.log('system', 'Logs cleared');
    }
    
    downloadLogs() {
        const data = {
            exportDate: new Date().toISOString(),
            stats: this.getLogStats(),
            logs: this.logs
        };
        
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-logs-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.log('action', 'Logs downloaded');
        } catch (error) {
            this.log('error', `Failed to download logs: ${error.message}`);
        }
    }
    
    getLogsByModule(module) {
        return this.logs.filter(log => log.module === module);
    }
    
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }
    
    getLogsByTimeRange(startTime, endTime) {
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        
        return this.logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= start && logTime <= end;
        });
    }
    
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(lowerQuery) ||
            log.type.toLowerCase().includes(lowerQuery) ||
            log.module.toLowerCase().includes(lowerQuery) ||
            JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
        );
    }
    
    // Convenience methods for different log types
    error(message, data) { return this.log('error', message, data); }
    warning(message, data) { return this.log('warning', message, data); }
    info(message, data) { return this.log('info', message, data); }
    success(message, data) { return this.log('success', message, data); }
    debug(message, data) { return this.log('debug', message, data); }
    action(message, data) { return this.log('action', message, data); }
    system(message, data) { return this.log('system', message, data); }
}

// Global logger instance
let Logger = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Logger = new ModularLogger();
    window.Logger = Logger; // Make globally available
    
    // Backward compatibility with SimpleLogger
    window.SimpleLogger = {
        log: (type, message, data) => Logger.log(type, message, data),
        clear: () => Logger.clearLogs(),
        downloadLogs: () => Logger.downloadLogs()
    };
    
    Logger.system('Logger system ready');
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularLogger;
}

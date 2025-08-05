/**
 * Enhanced Logging System for Quiz App
 * Comprehensive logging with download capability
 */

class EnhancedLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.startTime = new Date();
        this.serverStatus = 'unknown';
        this.sessionId = this.generateSessionId();
        
        // Track server connection attempts
        this.connectionAttempts = 0;
        this.lastServerCheck = null;
        
        this.init();
    }
    
    init() {
        this.log('SYSTEM', 'Enhanced Logger initialized', { sessionId: this.sessionId });
        
        // Override console methods to capture all logs
        this.overrideConsole();
        
        // Monitor server status periodically
        this.startServerMonitoring();
        
        // Log page events
        this.setupPageEventLogging();
    }
    
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    log(category, message, data = null) {
        const timestamp = new Date();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp.toISOString(),
            relativeTime: this.getRelativeTime(timestamp),
            category: category.toUpperCase(),
            message: message,
            data: data,
            serverStatus: this.serverStatus,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        this.logs.push(logEntry);
        
        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Display in debug panel if available
        this.displayInDebugPanel(logEntry);
        
        // Also log to console for debugging
        console.log(`[${category}] ${message}`, data);
    }
    
    getRelativeTime(timestamp) {
        const diff = timestamp.getTime() - this.startTime.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `+${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `+${minutes}m ${seconds % 60}s`;
        } else {
            return `+${seconds}s`;
        }
    }
    
    overrideConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args) => {
            this.log('CONSOLE', args.join(' '), args);
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.log('ERROR', args.join(' '), args);
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.log('WARNING', args.join(' '), args);
            originalWarn.apply(console, args);
        };
    }
    
    setupPageEventLogging() {
        // Log page load
        window.addEventListener('load', () => {
            this.log('PAGE', 'Page fully loaded');
        });
        
        // Log before page unload
        window.addEventListener('beforeunload', () => {
            this.log('PAGE', 'Page unloading');
        });
        
        // Log visibility changes
        document.addEventListener('visibilitychange', () => {
            this.log('PAGE', `Page visibility: ${document.hidden ? 'hidden' : 'visible'}`);
        });
        
        // Log network status
        window.addEventListener('online', () => {
            this.log('NETWORK', 'Browser came online');
        });
        
        window.addEventListener('offline', () => {
            this.log('NETWORK', 'Browser went offline');
        });
    }
    
    startServerMonitoring() {
        // Initial check
        this.checkServerStatus();
        
        // Check every 30 seconds
        setInterval(() => {
            this.checkServerStatus();
        }, 30000);
    }
    
    async checkServerStatus() {
        this.connectionAttempts++;
        const attemptId = this.connectionAttempts;
        
        try {
            this.log('SERVER', `Server check attempt #${attemptId} started`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const startTime = Date.now();
            const response = await fetch('https://quiz-web-app-wpls.onrender.com/api/health', {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            });
            
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            if (response.ok) {
                const data = await response.json();
                this.serverStatus = 'online';
                this.lastServerCheck = new Date();
                this.log('SERVER', `Server online (${duration}ms)`, { 
                    status: data.status, 
                    duration: duration,
                    attempt: attemptId 
                });
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            this.serverStatus = 'offline';
            this.lastServerCheck = new Date();
            
            let errorType = 'unknown';
            if (error.name === 'AbortError') {
                errorType = 'timeout';
            } else if (error.message.includes('fetch')) {
                errorType = 'network';
            }
            
            this.log('SERVER', `Server offline - ${errorType}`, { 
                error: error.message,
                attempt: attemptId,
                errorType: errorType
            });
        }
    }
    
    logUserAction(action, details = null) {
        this.log('USER', action, details);
    }
    
    logApiCall(method, url, status, duration, data = null) {
        this.log('API', `${method} ${url} - ${status} (${duration}ms)`, data);
    }
    
    logRegistration(username, success, error = null) {
        this.log('REGISTRATION', `User: ${username} - ${success ? 'SUCCESS' : 'FAILED'}`, {
            username: username,
            success: success,
            error: error,
            serverStatus: this.serverStatus
        });
    }
    
    displayInDebugPanel(logEntry) {
        const debugLog = document.getElementById('debugLog');
        if (!debugLog) return;
        
        const logDiv = document.createElement('div');
        logDiv.className = `debug-entry ${logEntry.category.toLowerCase()}`;
        
        const statusIcon = this.getStatusIcon(logEntry.category);
        const timeStr = logEntry.relativeTime;
        
        logDiv.innerHTML = `
            <span class="debug-time">${timeStr}</span>
            <span class="debug-icon">${statusIcon}</span>
            <span class="debug-category">[${logEntry.category}]</span>
            <span class="debug-message">${logEntry.message}</span>
            ${logEntry.data ? `<span class="debug-data">${JSON.stringify(logEntry.data)}</span>` : ''}
        `;
        
        debugLog.appendChild(logDiv);
        
        // Auto-scroll if enabled
        const autoScroll = document.getElementById('autoScrollDebug');
        if (autoScroll && autoScroll.checked) {
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        // Limit displayed logs
        const entries = debugLog.querySelectorAll('.debug-entry');
        if (entries.length > 200) {
            entries[0].remove();
        }
    }
    
    getStatusIcon(category) {
        const icons = {
            'SYSTEM': '🔧',
            'USER': '👤',
            'API': '🌐',
            'SERVER': '🖥️',
            'REGISTRATION': '📝',
            'ERROR': '❌',
            'WARNING': '⚠️',
            'CONSOLE': '💬',
            'PAGE': '📄',
            'NETWORK': '📡'
        };
        return icons[category] || '📋';
    }
    
    downloadLogs() {
        const logData = {
            sessionInfo: {
                sessionId: this.sessionId,
                startTime: this.startTime.toISOString(),
                downloadTime: new Date().toISOString(),
                duration: this.getRelativeTime(new Date()),
                currentUrl: window.location.href,
                userAgent: navigator.userAgent,
                totalLogs: this.logs.length,
                serverStatus: this.serverStatus,
                lastServerCheck: this.lastServerCheck?.toISOString()
            },
            logs: this.logs
        };
        
        const jsonString = JSON.stringify(logData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-app-log-${this.sessionId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.log('SYSTEM', 'Logs downloaded', { filename: a.download });
    }
    
    clearLogs() {
        this.logs = [];
        const debugLog = document.getElementById('debugLog');
        if (debugLog) {
            debugLog.innerHTML = '<div class="debug-entry system">Debug log vymazán</div>';
        }
        this.log('SYSTEM', 'Logs cleared');
    }
    
    getLogSummary() {
        const categories = {};
        this.logs.forEach(log => {
            categories[log.category] = (categories[log.category] || 0) + 1;
        });
        
        return {
            totalLogs: this.logs.length,
            categories: categories,
            sessionDuration: this.getRelativeTime(new Date()),
            serverStatus: this.serverStatus,
            connectionAttempts: this.connectionAttempts
        };
    }
}

// Create global logger instance
window.enhancedLogger = new EnhancedLogger();

// Helper functions for global access
function logUserAction(action, details) {
    if (window.enhancedLogger) {
        window.enhancedLogger.logUserAction(action, details);
    }
}

function logApiCall(method, url, status, duration, data) {
    if (window.enhancedLogger) {
        window.enhancedLogger.logApiCall(method, url, status, duration, data);
    }
}

function downloadLogs() {
    if (window.enhancedLogger) {
        window.enhancedLogger.downloadLogs();
    }
}

function clearDebugLog() {
    if (window.enhancedLogger) {
        window.enhancedLogger.clearLogs();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedLogger, logUserAction, logApiCall };
}

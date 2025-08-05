/**
 * Enhanced Integration
 * Rozšíření pro komunikaci s enhanced backendem
 */

class EnhancedQuizIntegration {
    constructor(quizApp) {
        this.app = quizApp;
        this.backendUrl = 'http://localhost:5000';
        this.useServerAuth = false;
        this.backendAvailable = false;
        this.authToken = null;
        this.checkInterval = null;
        
        this.init();
    }
    
    async init() {
        console.log('🔧 Initializing Enhanced Quiz Integration...');
        
        // Kontrola, jestli uživatel již vybral preferenci
        const preference = localStorage.getItem('authPreference');
        console.log('📋 Auth preference from localStorage:', preference);
        
        if (preference === 'server') {
            this.useServerAuth = true;
            console.log('🌐 Using server auth, checking backend...');
            await this.checkBackendAvailability();
        } else if (preference === 'local') {
            this.useServerAuth = false;
            console.log('💾 Using local auth mode');
        } else {
            console.log('❓ No auth preference set - will show dialog in 2 seconds...');
            // Uživatel ještě nevybral, zobrazit dialog s delším zpožděním
            setTimeout(() => {
                console.log('⏰ Timeout reached, showing auth preference dialog...');
                this.showAuthPreferenceDialog();
            }, 2000); // Zvýšené zpoždění na 2 sekundy
        }
    }
    
    showAuthPreferenceDialog() {
        console.log('🔒 Showing auth preference dialog...');
        
        // Zkontrolovat, jestli už dialog neexistuje
        const existingDialog = document.querySelector('.auth-preference-dialog');
        if (existingDialog) {
            console.log('⚠️ Dialog already exists, removing old one...');
            existingDialog.remove();
        }
        
        // Zkontrolovat, jestli je document ready
        if (document.readyState !== 'complete') {
            console.log('⏳ Document not ready, waiting...');
            setTimeout(() => this.showAuthPreferenceDialog(), 500);
            return;
        }
        
        try {
            const dialog = document.createElement('div');
            dialog.className = 'auth-preference-dialog';
            dialog.innerHTML = `
            <div class="dialog-content">
                <h3>🔒 Zvolte způsob přihlášení</h3>
                <p>Jak chcete používat kvízovou aplikaci?</p>
                
                <div class="auth-options">
                    <button class="auth-option server-auth" onclick="enhancedIntegration.selectAuthMethod('server')">
                        <div class="auth-icon">🌐</div>
                        <div class="auth-title">Server režim</div>
                        <div class="auth-desc">Připojit k lokálnímu serveru pro uložení dat</div>
                    </button>
                    
                    <button class="auth-option local-auth" onclick="enhancedIntegration.selectAuthMethod('local')">
                        <div class="auth-icon">💾</div>
                        <div class="auth-title">Lokální režim</div>
                        <div class="auth-desc">Použít pouze prohlížeč (bez serveru)</div>
                    </button>
                </div>
                
                <div class="dialog-footer">
                    <small>💡 Můžete změnit později v nastavení</small>
                </div>
            </div>
        `;
        
        // Přidat styles
        if (!document.querySelector('#auth-dialog-styles')) {
            const styles = document.createElement('style');
            styles.id = 'auth-dialog-styles';
            styles.textContent = `
                .auth-preference-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                .dialog-content {
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                .auth-options {
                    display: flex;
                    gap: 20px;
                    margin: 20px 0;
                }
                .auth-option {
                    flex: 1;
                    padding: 20px;
                    border: 2px solid #ddd;
                    border-radius: 10px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .auth-option:hover {
                    border-color: #007bff;
                    transform: translateY(-2px);
                }
                .auth-icon {
                    font-size: 2em;
                    margin-bottom: 10px;
                }
                .auth-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .auth-desc {
                    font-size: 0.9em;
                    color: #666;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(dialog);
        console.log('✅ Auth preference dialog added to DOM');
        
        } catch (error) {
            console.error('❌ Error showing auth preference dialog:', error);
        }
    }
    
    async selectAuthMethod(method) {
        console.log('🎯 Selected auth method:', method);
        
        try {
            localStorage.setItem('authPreference', method);
            console.log('💾 Auth preference saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving auth preference:', error);
        }
        
        // Odstranit dialog
        const dialog = document.querySelector('.auth-preference-dialog');
        if (dialog) {
            dialog.remove();
            console.log('🗑️ Auth dialog removed');
        }
        
        if (method === 'server') {
            this.useServerAuth = true;
            this.showBackendWaitingDialog();
            await this.checkBackendAvailability();
        } else {
            this.useServerAuth = false;
            this.app.showNotification('✅ Používáte lokální režim bez serveru.', 'success');
        }
    }
    
    showBackendWaitingDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'backend-waiting-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>🔄 Připojování k serveru...</h3>
                <div class="spinner"></div>
                <p>Čekám na spuštění lokálního serveru na <strong>localhost:5000</strong></p>
                
                <div class="backend-instructions">
                    <h4>📋 Pro spuštění serveru:</h4>
                    <ol>
                        <li>Otevřete složku <code>backend_local</code></li>
                        <li>Spusťte <code>start_gui.bat</code></li>
                        <li>Nebo ručně: <code>enhanced_gui.py</code></li>
                    </ol>
                </div>
                
                <div class="backend-status" id="backend-status">
                    ⏳ Kontroluji dostupnost serveru...
                </div>
                
                <div class="dialog-actions">
                    <button onclick="enhancedIntegration.switchToLocal()" class="btn-secondary">
                        💾 Použít lokální režim
                    </button>
                </div>
            </div>
        `;
        
        // Přidat styles pro waiting dialog
        if (!document.querySelector('#waiting-dialog-styles')) {
            const styles = document.createElement('style');
            styles.id = 'waiting-dialog-styles';
            styles.textContent = `
                .backend-waiting-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .backend-instructions {
                    text-align: left;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                }
                .backend-status {
                    padding: 10px;
                    border-radius: 5px;
                    margin: 15px 0;
                    background: #fff3cd;
                    color: #856404;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(dialog);
    }
    
    async checkBackendAvailability() {
        try {
            console.log('Checking backend availability...');
            const response = await fetch(`${this.backendUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.backendAvailable = true;
                this.updateBackendStatus(true, data.message || 'Server je připojen');
                this.startBackendMonitoring();
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('Backend not available:', error.message);
            this.backendAvailable = false;
            this.updateBackendStatus(false, `Server nedostupný: ${error.message}`);
            this.startIntensiveMonitoring();
            return false;
        }
    }
    
    updateBackendStatus(available, message = '') {
        this.backendAvailable = available;
        
        const statusElement = document.getElementById('backend-status');
        if (statusElement) {
            if (available) {
                statusElement.innerHTML = `✅ ${message}`;
                statusElement.style.background = '#d4edda';
                statusElement.style.color = '#155724';
                
                // Zavřít waiting dialog po úspěšném připojení
                setTimeout(() => {
                    const dialog = document.querySelector('.backend-waiting-dialog');
                    if (dialog) dialog.remove();
                }, 2000);
            } else {
                statusElement.innerHTML = `❌ ${message}`;
                statusElement.style.background = '#f8d7da';
                statusElement.style.color = '#721c24';
            }
        }
    }
    
    startBackendMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Kontrola každých 30 sekund
        this.checkInterval = setInterval(() => {
            this.checkBackendAvailability();
        }, 30000);
    }
    
    startIntensiveMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Intenzivní kontrola každé 3 sekundy
        this.checkInterval = setInterval(async () => {
            const available = await this.checkBackendAvailability();
            if (available) {
                // Přepnout na běžné monitorování
                this.startBackendMonitoring();
            }
        }, 3000);
    }
    
    async registerUser(username, password) {
        console.log('Register user called with server auth:', this.useServerAuth);
        
        if (this.useServerAuth && this.backendAvailable) {
            try {
                const response = await fetch(`${this.backendUrl}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    this.authToken = data.access_token;
                    this.app.showNotification('✅ Registrace úspěšná!', 'success');
                    
                    // Trigger event for GUI monitoring (v4.0)
                    this.notifyServerEvent('user_registered', { username });
                    
                    return { success: true, message: data.message };
                } else {
                    this.app.showNotification(`❌ Chyba registrace: ${data.message}`, 'error');
                    return { success: false, message: data.message };
                }
            } catch (error) {
                console.error('Network error during registration:', error);
                this.app.showNotification('❌ Chyba sítě při registraci', 'error');
                return { success: false, message: 'Chyba sítě' };
            }
        } else {
            console.log('Using local registration');
            // Přesměrování na lokální registraci
            return await this.app.registerUserLocal(username, password);
        }
    }
    
    async loginUser(username, password) {
        console.log('Login user called with server auth:', this.useServerAuth);
        
        if (this.useServerAuth && this.backendAvailable) {
            try {
                const response = await fetch(`${this.backendUrl}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    this.authToken = data.access_token;
                    this.app.showNotification('✅ Přihlášení úspěšné!', 'success');
                    
                    // Aktualizovat UI pro přihlášeného uživatele
                    this.app.currentUser = { username };
                    this.app.updateUserInterface();
                    
                    // Trigger event for GUI monitoring (v4.0)
                    this.notifyServerEvent('user_login', { username });
                    
                    return { success: true, user: { username } };
                } else {
                    this.app.showNotification(`❌ Chyba přihlášení: ${data.message}`, 'error');
                    return { success: false, message: data.message };
                }
            } catch (error) {
                console.error('Network error during login:', error);
                this.app.showNotification('❌ Chyba sítě při přihlášení', 'error');
                return { success: false, message: 'Chyba sítě' };
            }
        } else {
            console.log('Using local login');
            // Přesměrování na lokální přihlášení
            return await this.app.loginUserLocal(username, password);
        }
    }
    
    switchToLocal() {
        console.log('Switching to local mode');
        localStorage.setItem('authPreference', 'local');
        this.useServerAuth = false;
        
        // Zastavit monitoring
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        // Zavřít všechny dialogy
        const dialogs = document.querySelectorAll('.backend-waiting-dialog, .auth-preference-dialog');
        dialogs.forEach(dialog => dialog.remove());
        
        this.app.showNotification('✅ Přepnuto na lokální režim.', 'success');
    }
    
    showSettings() {
        // Implementovat pokročilé nastavení
        this.app.showNotification('⚙️ Pokročilé nastavení bude implementováno později.', 'info');
    }
    
    // Debug function to reset preferences
    resetAuthPreference() {
        localStorage.removeItem('authPreference');
        console.log('Auth preference reset');
        location.reload();
    }
    
    // Event notification methods (v4.0)
    async notifyServerEvent(eventType, data = {}) {
        // Notify server about frontend events for GUI monitoring
        if (!this.useServerAuth || !this.backendAvailable) {
            return; // Only notify if using server auth
        }
        
        try {
            console.log('🎯 Notifying server of event:', eventType, data);
            // Events are automatically captured by the backend endpoints
            // This method is here for future custom event notifications
        } catch (error) {
            console.log('⚠️ Event notification failed:', error);
        }
    }
    
    async completeQuiz(quizData) {
        // Notify server when quiz is completed
        if (!this.useServerAuth || !this.backendAvailable || !this.authToken) {
            console.log('📝 Quiz completed locally:', quizData);
            return;
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/api/quiz/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                },
                body: JSON.stringify(quizData),
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Quiz completion reported to server:', data);
                this.app.showNotification('📊 Výsledky uloženy na server!', 'success');
            } else {
                console.log('❌ Failed to report quiz completion to server');
            }
        } catch (error) {
            console.log('⚠️ Quiz completion notification failed:', error);
        }
    }
}

// Global reference for enhanced integration
// Will be initialized from quiz_app.js after QuizApp is ready
// Note: enhancedIntegration variable is declared in quiz_app.js

// Global debug functions accessible from console
window.resetAuthPreference = function() {
    localStorage.removeItem('authPreference');
    console.log('🔄 Auth preference reset');
    location.reload();
};

window.forceShowAuthDialog = function() {
    // Use only window reference
    const ei = window.enhancedIntegration;
    if (ei) {
        ei.showAuthPreferenceDialog();
    } else {
        console.log('❌ Enhanced integration not available');
    }
};

window.debugEnhancedIntegration = function() {
    console.log('🔧 Enhanced Integration Debug Info:');
    // Use only window reference
    const ei = window.enhancedIntegration;
    console.log('- enhancedIntegration exists:', !!ei);
    console.log('- authPreference:', localStorage.getItem('authPreference'));
    console.log('- useServerAuth:', ei?.useServerAuth);
    console.log('- backendAvailable:', ei?.backendAvailable);
};

// Debug logging enhancement
if (typeof window !== 'undefined') {
    // Override console methods to also log to debug panel if available
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = function(...args) {
        originalLog.apply(console, args);
        if (window.debugLogger) {
            window.debugLogger.log(args.join(' '), 'info');
        }
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        if (window.debugLogger) {
            window.debugLogger.log(args.join(' '), 'error');
        }
    };
    
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        if (window.debugLogger) {
            window.debugLogger.log(args.join(' '), 'warning');
        }
    };
}

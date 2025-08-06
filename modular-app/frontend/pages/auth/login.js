/**
 * AUTH MODULE - LOGIN LOGIC
 * Čerpá z existující logiky v quiz_app.js s vylepšeními
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.serverStatus = 'checking';
        this.demoUsers = {
            'admin': { password: 'admin123', role: 'admin' },
            'test': { password: 'test', role: 'user' },
            'demo': { password: 'demo', role: 'user' }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.checkServerStatus();
        this.loadSavedCredentials();
        
        Logger.system('AuthManager initialized');
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });
        
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e);
        });
        
        document.getElementById('resetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset(e);
        });
        
        // Demo account buttons
        document.querySelectorAll('.demo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username;
                const password = e.target.dataset.password;
                this.fillDemoCredentials(username, password);
            });
        });
        
        // Real-time validation
        this.setupRealTimeValidation();
    }
    
    setupFormValidation() {
        // Password confirmation validation
        const confirmPassword = document.getElementById('registerPasswordConfirm');
        const password = document.getElementById('registerPassword');
        
        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.value !== password.value) {
                confirmPassword.setCustomValidity('Hesla se neshodují');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
        
        // Username format validation
        const username = document.getElementById('registerUsername');
        username.addEventListener('input', () => {
            const value = username.value;
            if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
                username.setCustomValidity('Pouze písmena, číslice a podtržítka');
            } else {
                username.setCustomValidity('');
            }
        });
    }
    
    setupRealTimeValidation() {
        // Add visual feedback for form validation
        document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                // Clear previous error state
                this.clearFieldError(input);
            });
        });
    }
    
    validateField(input) {
        const formGroup = input.closest('.form-group');
        
        if (!input.checkValidity()) {
            this.showFieldError(formGroup, input.validationMessage);
            return false;
        } else {
            this.showFieldSuccess(formGroup);
            return true;
        }
    }
    
    showFieldError(formGroup, message) {
        formGroup.classList.add('has-error');
        formGroup.classList.remove('has-success');
        
        let errorElement = formGroup.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
    
    showFieldSuccess(formGroup) {
        formGroup.classList.add('has-success');
        formGroup.classList.remove('has-error');
        
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    clearFieldError(input) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.remove('has-error', 'has-success');
        
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}-form`).classList.add('active');
        
        Logger.action(`Switched to ${tabName} tab`);
    }
    
    async handleLogin(event) {
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('loginUsername') || document.getElementById('loginUsername').value;
        const password = formData.get('loginPassword') || document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        Logger.action('Login attempt', { username, rememberMe });
        
        if (!this.validateLoginForm(username, password)) {
            return;
        }
        
        this.setFormLoading(form, true);
        
        try {
            // Try server login first
            let success = false;
            
            if (this.serverStatus === 'online' && window.APIClient) {
                Logger.info('Attempting server login');
                const response = await window.APIClient.login(username, password);
                
                if (response.success) {
                    success = true;
                    this.currentUser = {
                        username: username,
                        role: response.data.role || 'user',
                        source: 'server'
                    };
                    
                    this.showNotification('Přihlášení úspěšné (server)', 'success');
                } else {
                    Logger.warning('Server login failed', response.error);
                }
            }
            
            // Fallback to local login
            if (!success) {
                Logger.info('Attempting local login');
                success = this.loginUserLocal(username, password);
                
                if (success) {
                    this.currentUser = {
                        username: username,
                        role: this.demoUsers[username]?.role || 'user',
                        source: 'local'
                    };
                    
                    this.showNotification('Přihlášení úspěšné (lokální)', 'success');
                }
            }
            
            if (success) {
                // Save credentials if remember me is checked
                if (rememberMe) {
                    this.saveCredentials(username, password);
                }
                
                // Redirect to quiz
                setTimeout(() => {
                    this.redirectAfterLogin();
                }, 1500);
                
            } else {
                this.showNotification('Neplatné přihlašovací údaje', 'error');
            }
            
        } catch (error) {
            Logger.error('Login error', error);
            this.showNotification(`Chyba při přihlašování: ${error.message}`, 'error');
        } finally {
            this.setFormLoading(form, false);
        }
    }
    
    async handleRegister(event) {
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('registerUsername') || document.getElementById('registerUsername').value;
        const email = formData.get('registerEmail') || document.getElementById('registerEmail').value;
        const password = formData.get('registerPassword') || document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        Logger.action('Registration attempt', { username, email });
        
        if (!this.validateRegisterForm(username, email, password, passwordConfirm)) {
            return;
        }
        
        this.setFormLoading(form, true);
        
        try {
            // Try server registration if APIClient is available
            if (window.APIClient) {
                Logger.info('Attempting server registration');
                const response = await window.APIClient.register(username, password, email);
                
                if (response.success) {
                    this.showNotification('Registrace úspěšná! Můžete se nyní přihlásit.', 'success');
                    
                    // Switch to login tab and prefill username
                    this.switchTab('login');
                    document.getElementById('loginUsername').value = username;
                    document.getElementById('loginPassword').focus();
                    
                } else {
                    Logger.error('Server registration failed', response.error);
                    this.showNotification(`Registrace se nezdařila: ${response.error}`, 'error');
                }
            } else {
                this.showNotification('Server není dostupný, registrace momentálně není možná.', 'warning');
            }
            
        } catch (error) {
            Logger.error('Registration error', error);
            this.showNotification(`Chyba při registraci: ${error.message}`, 'error');
        } finally {
            this.setFormLoading(form, false);
        }
    }
    
    async handlePasswordReset(event) {
        const form = event.target;
        const emailOrUsername = document.getElementById('resetEmail').value;
        
        Logger.action('Password reset attempt', { emailOrUsername });
        
        if (!emailOrUsername) {
            this.showNotification('Zadejte email nebo uživatelské jméno', 'error');
            return;
        }
        
        this.setFormLoading(form, true);
        
        try {
            const response = await APIClient.resetPassword(emailOrUsername);
            
            if (response.success) {
                this.showNotification('Reset link byl odeslán na váš email', 'success');
                form.reset();
            } else {
                this.showNotification(`Reset se nezdařil: ${response.error}`, 'error');
            }
            
        } catch (error) {
            Logger.error('Password reset error', error);
            this.showNotification(`Chyba při resetu hesla: ${error.message}`, 'error');
        } finally {
            this.setFormLoading(form, false);
        }
    }
    
    validateLoginForm(username, password) {
        if (!username || username.length < 3) {
            this.showNotification('Uživatelské jméno musí mít alespoň 3 znaky', 'error');
            return false;
        }
        
        if (!password || password.length < 6) {
            this.showNotification('Heslo musí mít alespoň 6 znaků', 'error');
            return false;
        }
        
        return true;
    }
    
    validateRegisterForm(username, email, password, passwordConfirm) {
        if (!username || username.length < 3 || username.length > 20) {
            this.showNotification('Uživatelské jméno musí mít 3-20 znaků', 'error');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showNotification('Uživatelské jméno může obsahovat pouze písmena, číslice a podtržítka', 'error');
            return false;
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showNotification('Neplatný formát emailu', 'error');
            return false;
        }
        
        if (!password || password.length < 6) {
            this.showNotification('Heslo musí mít alespoň 6 znaků', 'error');
            return false;
        }
        
        if (password !== passwordConfirm) {
            this.showNotification('Hesla se neshodují', 'error');
            return false;
        }
        
        return true;
    }
    
    loginUserLocal(username, password) {
        // Check demo users
        if (this.demoUsers[username] && this.demoUsers[username].password === password) {
            Logger.success('Local demo login successful', { username });
            return true;
        }
        
        // Check stored users (from existing app)
        const users = this.loadFromStorage('users') || {};
        if (users[username] && this.verifyPassword(password, users[username].password)) {
            Logger.success('Local stored login successful', { username });
            return true;
        }
        
        return false;
    }
    
    verifyPassword(password, storedPassword) {
        // Simple password verification (in real app, this would be properly hashed)
        return password === storedPassword;
    }
    
    fillDemoCredentials(username, password) {
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = password;
        document.getElementById('rememberMe').checked = false;
        
        this.showNotification(`Demo údaje vyplněny: ${username}`, 'info');
        Logger.action('Demo credentials filled', { username });
    }
    
    saveCredentials(username, password) {
        try {
            const credentials = { username, password, timestamp: Date.now() };
            localStorage.setItem('modular_quiz_credentials', JSON.stringify(credentials));
            Logger.debug('Credentials saved');
        } catch (error) {
            Logger.warning('Failed to save credentials', error);
        }
    }
    
    loadSavedCredentials() {
        try {
            const saved = localStorage.getItem('modular_quiz_credentials');
            if (saved) {
                const credentials = JSON.parse(saved);
                const age = Date.now() - credentials.timestamp;
                
                // Auto-fill if credentials are less than 7 days old
                if (age < 7 * 24 * 60 * 60 * 1000) {
                    document.getElementById('loginUsername').value = credentials.username;
                    document.getElementById('rememberMe').checked = true;
                    Logger.info('Saved credentials loaded');
                }
            }
        } catch (error) {
            Logger.warning('Failed to load saved credentials', error);
        }
    }
    
    async checkServerStatus() {
        Logger.info('Checking server status...');
        this.updateServerStatus('checking', '🟡 Kontroluji...');
        
        // Ensure APIClient is available
        if (!window.APIClient) {
            console.warn('APIClient not yet available, falling back to offline mode');
            this.serverStatus = 'offline';
            this.updateServerStatus('offline', '🔴 Offline Mode');
            return;
        }
        
        const isOnline = await window.APIClient.healthCheck();
        
        if (isOnline) {
            this.serverStatus = 'online';
            this.updateServerStatus('online', '🟢 Server Online');
        } else {
            this.serverStatus = 'offline';
            this.updateServerStatus('offline', '🔴 Offline Mode');
        }
    }
    
    updateServerStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (indicator && statusText) {
            statusText.textContent = text;
            
            const statusElement = document.getElementById('serverStatus');
            statusElement.className = `server-status ${status}`;
        }
    }
    
    setFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        } else {
            form.classList.remove('loading');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        notification.innerHTML = `
            ${message}
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        Logger.info(`Notification: ${type}`, { message });
    }
    
    redirectAfterLogin() {
        // Redirect to quiz module
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '../quiz/quiz.html';
        Logger.info('Redirecting after login', { redirectUrl });
        window.location.href = redirectUrl;
    }
    
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            Logger.warning(`Failed to load from storage: ${key}`, error);
            return null;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const authManager = new AuthManager();
    window.authManager = authManager; // Make globally available
    
    Logger.success('Auth module loaded successfully');
});

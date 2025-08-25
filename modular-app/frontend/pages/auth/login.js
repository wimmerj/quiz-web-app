/**
 * Login Page Logic
 * Modular Quiz App - Authentication Module
 */

class LoginManager {
    constructor() {
        this.apiClient = window.apiClient;
        this.logger = window.Logger; // Opraveno: Logger s velkým L
        this.navigationManager = window.navigationManager;
        
        // Kontrola, jestli jsou všechny potřebné objekty dostupné
        if (!this.apiClient) {
            console.warn('API Client not available yet');
        }
        
        this.init();
    }

    init() {
        // Bezpečné logování - kontrola existence loggeru
        this.safeLog('info', 'Login page initializing...');
        this.setupEventListeners();
        this.setupFormValidation();
        this.checkExistingAuth();
    }

    // Pomocná metoda pro bezpečné logování
    safeLog(level, message, data = null) {
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](message, data);
        } else {
            console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Tabs switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Demo account buttons
        document.querySelectorAll('.demo-btn').forEach(btn => {
            btn.addEventListener('click', () => this.fillDemoAndLogin(btn));
        });

        // Terms modal and links
        const termsLink = document.querySelector('a[data-navigate="terms"]');
        const termsModal = document.getElementById('termsModal');
        const closeTerms = document.getElementById('closeTermsModal');
        const acceptTerms = document.getElementById('acceptTerms');
        const declineTerms = document.getElementById('declineTerms');
        if (termsLink) termsLink.addEventListener('click', (e)=>{ e.preventDefault(); if (termsModal) termsModal.style.display = 'flex'; });
        if (closeTerms) closeTerms.addEventListener('click', ()=> termsModal && (termsModal.style.display='none'));
        if (declineTerms) declineTerms.addEventListener('click', ()=> termsModal && (termsModal.style.display='none'));
        if (acceptTerms) acceptTerms.addEventListener('click', ()=> { if (termsModal) termsModal.style.display='none'; const agree=document.getElementById('agreeTerms'); if (agree) agree.checked = true; });

        // Reset type toggles
        document.querySelectorAll('input[name="resetType"]').forEach(r=> {
            r.addEventListener('change', ()=> this.updateResetType());
        });

        // API test button
        const testBtn = document.getElementById('testAuthBtn');
        if (testBtn) testBtn.addEventListener('click', ()=> this.runApiTest());

        // Password visibility toggles
        this.setupPasswordToggles();
    }

    setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group').querySelector('input');
                const icon = e.target.closest('.password-toggle').querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    setupFormValidation() {
    // Real-time validation (IDs according to login.html)
    const usernameInput = document.getElementById('registerUsername') || document.getElementById('regUsername');
    const emailInput = document.getElementById('registerEmail') || document.getElementById('regEmail');
    const passwordInput = document.getElementById('registerPassword') || document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('registerPasswordConfirm') || document.getElementById('regConfirmPassword');

        if (usernameInput) {
            usernameInput.addEventListener('input', () => this.validateUsername());
        }

        if (emailInput) {
            emailInput.addEventListener('input', () => this.validateEmail());
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.validatePassword());
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordConfirm());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (!this.apiClient) {
            this.showError('API klient není dostupný');
            return;
        }
        
    const username = (document.getElementById('loginUsername') || document.getElementById('username'))?.value.trim();
    const password = (document.getElementById('loginPassword') || document.getElementById('password'))?.value;

        if (!username || !password) {
            this.showError('Prosím vyplňte všechny povinné údaje');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiClient.login(username, password);
            
            if (response.success) {
                this.safeLog('success', 'Login successful', response.data);
                this.showSuccess('Přihlášení úspěšné! Přesměrování...');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 1500);
            } else {
                this.showError(response.error || 'Přihlášení se nezdařilo');
            }
        } catch (error) {
            this.safeLog('error', 'Login error:', error);
            this.showError('Chyba připojení k serveru');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        if (!this.validateRegisterForm()) {
            return;
        }

        if (!this.apiClient || typeof this.apiClient.register !== 'function') {
            this.safeLog('error', 'API client not available for registration');
            this.showError('Systém není připraven. Zkuste to za chvíli.');
            return;
        }

        const formData = {
            username: (document.getElementById('registerUsername') || document.getElementById('regUsername'))?.value.trim(),
            email: (document.getElementById('registerEmail') || document.getElementById('regEmail'))?.value.trim(),
            password: (document.getElementById('registerPassword') || document.getElementById('regPassword'))?.value,
            avatar: (document.getElementById('avatar') ? document.getElementById('avatar').value : '') || '👤'
        };

        this.showLoading(true);

        try {
            const response = await this.apiClient.register(formData);
            
            if (response.success) {
                this.safeLog('success', 'Registration successful', response.data);
                this.showSuccess('Registrace úspěšná! Přesměrování...');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 1500);
            } else {
                this.showError(response.error || 'Registrace se nezdařila');
            }
        } catch (error) {
            this.safeLog('error', 'Registration error:', error);
            this.showError('Chyba připojení k serveru');
        } finally {
            this.showLoading(false);
        }
    }

    validateRegisterForm() {
    const username = (document.getElementById('registerUsername') || document.getElementById('regUsername'))?.value.trim();
    const email = (document.getElementById('registerEmail') || document.getElementById('regEmail'))?.value.trim();
    const password = (document.getElementById('registerPassword') || document.getElementById('regPassword'))?.value;
    const confirmPassword = (document.getElementById('registerPasswordConfirm') || document.getElementById('regConfirmPassword'))?.value;

        if (!username) {
            this.showError('Uživatelské jméno je povinné');
            return false;
        }

        if (username.length < 3) {
            this.showError('Uživatelské jméno musí mít alespoň 3 znaky');
            return false;
        }

        if (email && !this.isValidEmail(email)) {
            this.showError('Neplatný email');
            return false;
        }

        if (!password) {
            this.showError('Heslo je povinné');
            return false;
        }

        if (password.length < 6) {
            this.showError('Heslo musí mít alespoň 6 znaků');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('Hesla se neshodují');
            return false;
        }

        return true;
    }

    validateUsername() {
    const input = document.getElementById('registerUsername') || document.getElementById('regUsername');
        const value = input.value.trim();
        
        if (value.length >= 3) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validateEmail() {
    const input = document.getElementById('registerEmail') || document.getElementById('regEmail');
        const value = input.value.trim();
        
        if (!value || this.isValidEmail(value)) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validatePassword() {
    const input = document.getElementById('registerPassword') || document.getElementById('regPassword');
        const value = input.value;
        
        if (value.length >= 6) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validatePasswordConfirm() {
    const passwordInput = document.getElementById('registerPassword') || document.getElementById('regPassword');
    const confirmInput = document.getElementById('registerPasswordConfirm') || document.getElementById('regConfirmPassword');
        
        if (passwordInput.value === confirmInput.value) {
            this.setInputValid(confirmInput);
        } else {
            this.setInputInvalid(confirmInput);
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    setInputValid(input) {
        input.classList.remove('invalid');
        input.classList.add('valid');
    }

    setInputInvalid(input) {
        input.classList.remove('valid');
        input.classList.add('invalid');
    }

    switchTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const btn = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
        const form = document.getElementById(`${tab}-form`);
        if (btn) btn.classList.add('active');
        if (form) form.classList.add('active');
    }

    checkExistingAuth() {
        if (this.apiClient && typeof this.apiClient.isAuthenticated === 'function' && this.apiClient.isAuthenticated()) {
            this.safeLog('info', 'User already authenticated, redirecting...');
            window.location.href = '../../index.html';
        }
    }

    showLoading(show) {
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        
        if (show) {
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.textContent = 'Přihlašování...';
            }
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.textContent = 'Registrování...';
            }
        } else {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Přihlásit se';
            }
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Zaregistrovat se';
            }
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Try to use notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        const container = document.getElementById('notifications') || (()=>{
            const c = document.createElement('div');
            c.id = 'notifications';
            c.className = 'notifications-container';
            document.body.appendChild(c);
            return c;
        })();
        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.textContent = message;
        container.appendChild(div);
        setTimeout(()=> div.remove(), 3000);
    }

    updateResetType() {
        const type = document.querySelector('input[name="resetType"]:checked')?.value;
        const forgot = document.getElementById('forgot-password-form');
        const change = document.getElementById('change-password-form');
        if (!type || !forgot || !change) return;
        if (type === 'forgot') { forgot.style.display = ''; change.style.display = 'none'; }
        else { forgot.style.display = 'none'; change.style.display = ''; }
    }

    fillDemoAndLogin(btn) {
        const u = btn.getAttribute('data-username');
        const p = btn.getAttribute('data-password');
        const uInput = document.getElementById('loginUsername');
        const pInput = document.getElementById('loginPassword');
        if (uInput && pInput) {
            uInput.value = u;
            pInput.value = p;
            const form = document.getElementById('loginForm');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    }

    async runApiTest() {
        const panel = document.getElementById('testAuthResults');
        const indicator = document.getElementById('loginStatusIndicator');
        if (!panel) return;
        panel.style.display = 'block';
        panel.innerText = 'Testing /api/health...';
        try {
            const health = await fetch((this.apiClient?.baseURL || '') + '/api/health').then(r=> r.json());
            panel.innerText = JSON.stringify(health, null, 2);
            if (indicator) indicator.textContent = '✅ API OK';
        } catch (e) {
            panel.innerText = 'API health failed: ' + e.message;
            if (indicator) indicator.textContent = '❌ API Down';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Normalize API client alias
    if (!window.apiClient && window.APIClient) window.apiClient = window.APIClient;
    new LoginManager();
});

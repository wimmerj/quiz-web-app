/**
 * Login Page Logic
 * Modular Quiz App - Authentication Module
 */

class LoginManager {
    constructor() {
        this.apiClient = window.apiClient;
        this.logger = window.logger;
        this.navigationManager = window.navigationManager;
        
        this.init();
    }

    init() {
        this.logger.info('Login page  initializing...');
        this.setupEventListeners();
        this.setupFormValidation();
        this.checkExistingAuth();
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

        // Toggle between login and register
        const showRegisterBtn = document.getElementById('showRegister');
        const showLoginBtn = document.getElementById('showLogin');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => this.showLoginForm());
        }

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
        // Real-time validation
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

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
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showError('Prosím vyplňte všechny povinné údaje');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiClient.login(username, password);
            
            if (response.success) {
                this.logger.success('Login successful', response.data);
                this.showSuccess('Přihlášení úspěšné! Přesměrování...');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 1500);
            } else {
                this.showError(response.error || 'Přihlášení se nezdařilo');
            }
        } catch (error) {
            this.logger.error('Login error:', error);
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

        const formData = {
            username: document.getElementById('regUsername').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            avatar: document.getElementById('avatar').value || '👤'
        };

        this.showLoading(true);

        try {
            const response = await this.apiClient.register(formData);
            
            if (response.success) {
                this.logger.success('Registration successful', response.data);
                this.showSuccess('Registrace úspěšná! Přesměrování...');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 1500);
            } else {
                this.showError(response.error || 'Registrace se nezdařila');
            }
        } catch (error) {
            this.logger.error('Registration error:', error);
            this.showError('Chyba připojení k serveru');
        } finally {
            this.showLoading(false);
        }
    }

    validateRegisterForm() {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

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
        const input = document.getElementById('regUsername');
        const value = input.value.trim();
        
        if (value.length >= 3) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validateEmail() {
        const input = document.getElementById('regEmail');
        const value = input.value.trim();
        
        if (!value || this.isValidEmail(value)) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validatePassword() {
        const input = document.getElementById('regPassword');
        const value = input.value;
        
        if (value.length >= 6) {
            this.setInputValid(input);
        } else {
            this.setInputInvalid(input);
        }
    }

    validatePasswordConfirm() {
        const passwordInput = document.getElementById('regPassword');
        const confirmInput = document.getElementById('regConfirmPassword');
        
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

    showLoginForm() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('registerSection').style.display = 'none';
        document.querySelector('.auth-toggle-login').classList.add('active');
        document.querySelector('.auth-toggle-register').classList.remove('active');
    }

    showRegisterForm() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'block';
        document.querySelector('.auth-toggle-register').classList.add('active');
        document.querySelector('.auth-toggle-login').classList.remove('active');
    }

    checkExistingAuth() {
        if (this.apiClient.isAuthenticated()) {
            this.logger.info('User already authenticated, redirecting...');
            window.location.href = '../../index.html';
        }
    }

    showLoading(show) {
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        
        if (show) {
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Přihlašování...';
            }
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrování...';
            }
        } else {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Přihlásit se';
            }
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrovat se';
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
        } else {
            // Fallback to alert
            alert(message);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for API client to be ready
    if (window.apiClient) {
        new LoginManager();
    } else {
        // Wait a bit for API client to load
        setTimeout(() => {
            new LoginManager();
        }, 100);
    }
});

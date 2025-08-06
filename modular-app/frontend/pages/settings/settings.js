/**
 * Settings Module - Comprehensive Configuration Management
 * Features: Multi-tab settings, Theme management, Data import/export, Account management
 */

class SettingsModule {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.currentTab = 'general';
        
        // Default settings structure
        this.defaultSettings = {
            general: {
                language: 'cs',
                defaultModule: 'dashboard',
                notificationsEnabled: true,
                autoSaveEnabled: true,
                keyboardShortcuts: true,
                rememberLogin: false
            },
            quiz: {
                shuffleAnswers: false,
                showHints: true,
                autoNextQuestion: false,
                showExplanations: true,
                questionFontSize: 16,
                answerFontSize: 14
            },
            appearance: {
                darkMode: false,
                colorTheme: 'blue',
                compactInterface: false,
                animationsEnabled: true,
                uiFontSize: 14,
                showDashboardStats: true
            },
            audio: {
                masterVolume: 50,
                soundEffects: true,
                textToSpeech: false,
                ttsVoice: 'default',
                ttsSpeed: 1.0,
                voiceControl: false,
                battleSounds: true
            },
            advanced: {
                backendMode: 'demo',
                serverUrl: 'https://quiz-web-app-wpls.onrender.com',
                apiTimeout: 30,
                developerMode: false,
                analytics: true,
                experimentalFeatures: false,
                autoUpdates: true,
                errorReporting: true
            }
        };
        
        // Current settings (loaded from localStorage)
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        
        // User account demo data
        this.accountData = {
            username: 'demo_user',
            email: 'demo@example.com',
            avatar: '👤',
            registrationDate: '2024-01-15',
            lastLogin: new Date().toLocaleDateString()
        };
        
        console.log('SettingsModule constructor completed');
    }

    async initialize() {
        try {
            console.log('Initializing Settings Module...');
            
            // Initialize user session
            await this.initializeUserSession();
            
            // Load saved settings
            this.loadSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Apply loaded settings
            this.applySettings();
            
            // Update UI with current data
            this.updateUI();
            
            this.isInitialized = true;
            console.log('Settings Module initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Settings Module:', error);
            this.showNotification('Chyba při inicializaci Settings modulu', 'error');
        }
    }

    async initializeUserSession() {
        try {
            console.log('🔍 Checking authentication for settings...');
            
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                console.log('✅ APIClient is authenticated, getting user info...');
                const user = await window.APIClient.getCurrentUser();
                console.log('✅ User info received:', user);
                
                if (user) {
                    this.currentUser = user;
                    const username = user.username || user.name || user.email || 'Unknown';
                    document.getElementById('userDisplay').textContent = `👤 ${username}`;
                    this.accountData.username = username;
                    this.accountData.email = user.email || 'demo@example.com';
                    console.log('✅ User authenticated via APIClient for settings', { user: username });
                }
            } else {
                console.log('❌ No APIClient authentication, redirecting to login...');
                window.location.href = '../auth/login.html';
                return;
            }
        } catch (error) {
            console.error('Failed to initialize user session:', error);
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            console.log('🚪 Logout button clicked in settings');
            
            // Use APIClient logout
            if (window.APIClient) {
                console.log('📡 Using APIClient logout');
                await window.APIClient.logout();
            }
            
            // Redirect to login
            console.log('🔄 Redirecting to login page');
            window.location.href = '../auth/login.html';
        });

        // 🧪 TESTOVACÍ TLAČÍTKO PRO SETTINGS
        document.getElementById('testSettingsBtn')?.addEventListener('click', () => {
            console.log('🎯 Test button event listener triggered! v2.1');
            alert('🎯 Event listener works! v2.1');
            this.runSettingsAPIClientTest();
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', this.switchTab.bind(this));
        });

        // Settings controls
        this.setupGeneralListeners();
        this.setupQuizListeners();
        this.setupAccountListeners();
        this.setupAppearanceListeners();
        this.setupAudioListeners();
        this.setupAdvancedListeners();
        this.setupDataListeners();

        // Settings actions
        document.getElementById('resetToDefaultBtn')?.addEventListener('click', this.resetToDefault.bind(this));
        document.getElementById('saveSettingsBtn')?.addEventListener('click', this.saveSettings.bind(this));
        document.getElementById('applyChangesBtn')?.addEventListener('click', this.applyChanges.bind(this));

        // Modal event listeners
        this.setupModalListeners();
    }

    setupGeneralListeners() {
        // Language selection
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            this.settings.general.language = e.target.value;
            this.showNotification('Jazyk bude změněn po příštím načtení', 'info');
        });

        // Default module
        document.getElementById('defaultModuleSelect')?.addEventListener('change', (e) => {
            this.settings.general.defaultModule = e.target.value;
        });

        // Toggle switches
        this.setupToggleListener('notificationsEnabled', 'general');
        this.setupToggleListener('autoSaveEnabled', 'general');
        this.setupToggleListener('keyboardShortcuts', 'general');
        this.setupToggleListener('rememberLogin', 'general');
    }

    setupQuizListeners() {
        // Quiz toggles
        this.setupToggleListener('shuffleAnswers', 'quiz');
        this.setupToggleListener('showHints', 'quiz');
        this.setupToggleListener('autoNextQuestion', 'quiz');
        this.setupToggleListener('showExplanations', 'quiz');

        // Font size sliders
        this.setupSliderListener('questionFontSize', 'quiz', 'px');
        this.setupSliderListener('answerFontSize', 'quiz', 'px');
    }

    setupAccountListeners() {
        // Change password
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            this.openModal('changePasswordModal');
        });

        // Change email
        document.getElementById('changeEmailBtn')?.addEventListener('click', () => {
            this.openModal('changeEmailModal');
        });

        // Change avatar
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            this.openModal('avatarModal');
        });

        // Account toggles
        this.setupToggleListener('twoFactorAuth', 'account');
        this.setupToggleListener('mobileNotifications', 'account');
    }

    setupAppearanceListeners() {
        // Dark mode toggle
        document.getElementById('darkMode')?.addEventListener('change', (e) => {
            this.settings.appearance.darkMode = e.target.checked;
            this.applyTheme();
        });

        // Color theme selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove active class from all options
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                e.currentTarget.classList.add('active');
                
                // Update setting
                this.settings.appearance.colorTheme = e.currentTarget.dataset.theme;
                this.applyColorTheme();
            });
        });

        // Other appearance toggles
        this.setupToggleListener('compactInterface', 'appearance');
        this.setupToggleListener('animationsEnabled', 'appearance');
        this.setupToggleListener('showDashboardStats', 'appearance');

        // UI font size
        this.setupSliderListener('uiFontSize', 'appearance', 'px');
    }

    setupAudioListeners() {
        // Audio sliders
        this.setupSliderListener('masterVolume', 'audio', '%');
        this.setupSliderListener('ttsSpeed', 'audio', 'x');

        // TTS voice selection
        document.getElementById('ttsVoiceSelect')?.addEventListener('change', (e) => {
            this.settings.audio.ttsVoice = e.target.value;
        });

        // Audio toggles
        this.setupToggleListener('soundEffects', 'audio');
        this.setupToggleListener('textToSpeech', 'audio');
        this.setupToggleListener('voiceControl', 'audio');
        this.setupToggleListener('battleSounds', 'audio');
    }

    setupAdvancedListeners() {
        // Backend mode
        document.getElementById('backendMode')?.addEventListener('change', (e) => {
            this.settings.advanced.backendMode = e.target.value;
            this.toggleServerUrlVisibility();
        });

        // Server URL
        document.getElementById('serverUrl')?.addEventListener('change', (e) => {
            this.settings.advanced.serverUrl = e.target.value;
        });

        // API timeout
        this.setupSliderListener('apiTimeout', 'advanced', 's');

        // Advanced toggles
        this.setupToggleListener('developerMode', 'advanced');
        this.setupToggleListener('analytics', 'advanced');
        this.setupToggleListener('experimentalFeatures', 'advanced');
        this.setupToggleListener('autoUpdates', 'advanced');
        this.setupToggleListener('errorReporting', 'advanced');
    }

    setupDataListeners() {
        // Export data
        document.getElementById('exportDataBtn')?.addEventListener('click', this.exportData.bind(this));

        // Import data
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput')?.addEventListener('change', this.importData.bind(this));

        // Clear data actions
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => this.clearData('cache'));
        document.getElementById('clearProgressBtn')?.addEventListener('click', () => this.clearData('progress'));
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => this.clearData('settings'));
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearData('all'));

        // Load storage info
        this.updateStorageInfo();
    }

    setupModalListeners() {
        // Change password form
        document.getElementById('changePasswordForm')?.addEventListener('submit', this.handlePasswordChange.bind(this));

        // Change email form
        document.getElementById('changeEmailForm')?.addEventListener('submit', this.handleEmailChange.bind(this));

        // Avatar selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });

        document.getElementById('saveAvatarBtn')?.addEventListener('click', this.handleAvatarChange.bind(this));

        // Password strength checker
        document.getElementById('newPassword')?.addEventListener('input', this.checkPasswordStrength.bind(this));
    }

    setupToggleListener(settingId, category) {
        const element = document.getElementById(settingId);
        if (element) {
            element.addEventListener('change', (e) => {
                this.settings[category][settingId] = e.target.checked;
                console.log(`Setting ${category}.${settingId} changed to:`, e.target.checked);
            });
        }
    }

    setupSliderListener(settingId, category, unit) {
        const slider = document.getElementById(settingId);
        const display = document.getElementById(settingId + 'Display');
        
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.settings[category][settingId] = value;
                display.textContent = value + unit;
                
                // Apply immediate changes for certain settings
                if (settingId === 'questionFontSize' || settingId === 'answerFontSize') {
                    this.applyFontSizes();
                } else if (settingId === 'uiFontSize') {
                    this.applyUIFontSize();
                }
            });
        }
    }

    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Activate target tab
        document.getElementById(targetTab + 'Tab').classList.add('active');
        event.target.classList.add('active');
        
        this.currentTab = targetTab;
        
        // Load tab-specific data
        if (targetTab === 'account') {
            this.updateAccountInfo();
        } else if (targetTab === 'data') {
            this.updateStorageInfo();
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Merge with defaults to ensure all settings exist
                this.settings = this.mergeSettings(this.defaultSettings, parsed);
            }
            
            // Load account data
            const savedAccount = localStorage.getItem('accountData');
            if (savedAccount) {
                Object.assign(this.accountData, JSON.parse(savedAccount));
            }
            
            console.log('Settings loaded successfully');
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        }
    }

    mergeSettings(defaults, saved) {
        const result = {};
        
        for (const category in defaults) {
            result[category] = {};
            for (const setting in defaults[category]) {
                result[category][setting] = saved[category] && saved[category][setting] !== undefined 
                    ? saved[category][setting] 
                    : defaults[category][setting];
            }
        }
        
        return result;
    }

    updateUI() {
        // Update all form controls with current settings
        this.updateGeneralUI();
        this.updateQuizUI();
        this.updateAppearanceUI();
        this.updateAudioUI();
        this.updateAdvancedUI();
        this.updateAccountInfo();
    }

    updateGeneralUI() {
        const general = this.settings.general;
        
        this.setSelectValue('languageSelect', general.language);
        this.setSelectValue('defaultModuleSelect', general.defaultModule);
        this.setToggleValue('notificationsEnabled', general.notificationsEnabled);
        this.setToggleValue('autoSaveEnabled', general.autoSaveEnabled);
        this.setToggleValue('keyboardShortcuts', general.keyboardShortcuts);
        this.setToggleValue('rememberLogin', general.rememberLogin);
    }

    updateQuizUI() {
        const quiz = this.settings.quiz;
        
        this.setToggleValue('shuffleAnswers', quiz.shuffleAnswers);
        this.setToggleValue('showHints', quiz.showHints);
        this.setToggleValue('autoNextQuestion', quiz.autoNextQuestion);
        this.setToggleValue('showExplanations', quiz.showExplanations);
        this.setSliderValue('questionFontSize', quiz.questionFontSize, 'px');
        this.setSliderValue('answerFontSize', quiz.answerFontSize, 'px');
    }

    updateAppearanceUI() {
        const appearance = this.settings.appearance;
        
        this.setToggleValue('darkMode', appearance.darkMode);
        this.setToggleValue('compactInterface', appearance.compactInterface);
        this.setToggleValue('animationsEnabled', appearance.animationsEnabled);
        this.setToggleValue('showDashboardStats', appearance.showDashboardStats);
        this.setSliderValue('uiFontSize', appearance.uiFontSize, 'px');
        
        // Update color theme selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === appearance.colorTheme);
        });
    }

    updateAudioUI() {
        const audio = this.settings.audio;
        
        this.setSliderValue('masterVolume', audio.masterVolume, '%');
        this.setSliderValue('ttsSpeed', audio.ttsSpeed, 'x');
        this.setSelectValue('ttsVoiceSelect', audio.ttsVoice);
        this.setToggleValue('soundEffects', audio.soundEffects);
        this.setToggleValue('textToSpeech', audio.textToSpeech);
        this.setToggleValue('voiceControl', audio.voiceControl);
        this.setToggleValue('battleSounds', audio.battleSounds);
    }

    updateAdvancedUI() {
        const advanced = this.settings.advanced;
        
        this.setSelectValue('backendMode', advanced.backendMode);
        this.setInputValue('serverUrl', advanced.serverUrl);
        this.setSliderValue('apiTimeout', advanced.apiTimeout, 's');
        this.setToggleValue('developerMode', advanced.developerMode);
        this.setToggleValue('analytics', advanced.analytics);
        this.setToggleValue('experimentalFeatures', advanced.experimentalFeatures);
        this.setToggleValue('autoUpdates', advanced.autoUpdates);
        this.setToggleValue('errorReporting', advanced.errorReporting);
        
        this.toggleServerUrlVisibility();
    }

    updateAccountInfo() {
        document.getElementById('usernameDisplay').textContent = this.accountData.username;
        document.getElementById('emailDisplay').textContent = this.accountData.email;
        document.getElementById('registrationDate').textContent = this.accountData.registrationDate;
        document.getElementById('lastLoginDate').textContent = this.accountData.lastLogin;
        document.getElementById('userAvatar').textContent = this.accountData.avatar;
    }

    setSelectValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    setInputValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    setToggleValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.checked = value;
        }
    }

    setSliderValue(elementId, value, unit) {
        const slider = document.getElementById(elementId);
        const display = document.getElementById(elementId + 'Display');
        
        if (slider) {
            slider.value = value;
        }
        if (display) {
            display.textContent = value + unit;
        }
    }

    applySettings() {
        this.applyTheme();
        this.applyColorTheme();
        this.applyFontSizes();
        this.applyUIFontSize();
        this.applyAnimations();
        
        // Store API client settings
        if (window.apiClient) {
            apiClient.setBaseURL(this.settings.advanced.serverUrl);
            apiClient.setTimeout(this.settings.advanced.apiTimeout * 1000);
        }
    }

    applyTheme() {
        if (this.settings.appearance.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    applyColorTheme() {
        const theme = this.settings.appearance.colorTheme;
        const colors = {
            blue: { primary: '#2563eb', light: '#3b82f6', lighter: '#60a5fa' },
            green: { primary: '#16a34a', light: '#22c55e', lighter: '#4ade80' },
            purple: { primary: '#9333ea', light: '#a855f7', lighter: '#c084fc' },
            orange: { primary: '#ea580c', light: '#f97316', lighter: '#fb923c' },
            red: { primary: '#dc2626', light: '#ef4444', lighter: '#f87171' }
        };
        
        const colorSet = colors[theme] || colors.blue;
        
        document.documentElement.style.setProperty('--settings-accent', colorSet.primary);
        document.documentElement.style.setProperty('--settings-accent-light', colorSet.light);
        document.documentElement.style.setProperty('--settings-accent-lighter', colorSet.lighter);
    }

    applyFontSizes() {
        // Apply to quiz module if available
        const questionElements = document.querySelectorAll('.question-text');
        const answerElements = document.querySelectorAll('.answer-text');
        
        questionElements.forEach(el => {
            el.style.fontSize = this.settings.quiz.questionFontSize + 'px';
        });
        
        answerElements.forEach(el => {
            el.style.fontSize = this.settings.quiz.answerFontSize + 'px';
        });
    }

    applyUIFontSize() {
        document.documentElement.style.setProperty('--ui-font-size', this.settings.appearance.uiFontSize + 'px');
    }

    applyAnimations() {
        if (this.settings.appearance.animationsEnabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
    }

    toggleServerUrlVisibility() {
        const serverUrlGroup = document.getElementById('serverUrl').closest('.setting-item');
        const mode = this.settings.advanced.backendMode;
        
        if (serverUrlGroup) {
            serverUrlGroup.style.display = (mode === 'custom' || mode === 'render') ? 'flex' : 'none';
        }
    }

    async saveSettings() {
        try {
            localStorage.setItem('appSettings', JSON.stringify(this.settings));
            localStorage.setItem('accountData', JSON.stringify(this.accountData));
            
            this.showNotification('Nastavení byla úspěšně uložena', 'success');
            console.log('Settings saved successfully');
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Chyba při ukládání nastavení', 'error');
        }
    }

    async applyChanges() {
        try {
            await this.saveSettings();
            this.applySettings();
            this.showNotification('Změny byly aplikovány', 'success');
            
        } catch (error) {
            console.error('Failed to apply changes:', error);
            this.showNotification('Chyba při aplikování změn', 'error');
        }
    }

    async resetToDefault() {
        if (confirm('Opravdu chcete obnovit všechna nastavení na výchozí hodnoty?')) {
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            this.updateUI();
            this.applySettings();
            await this.saveSettings();
            this.showNotification('Nastavení byla obnovena na výchozí hodnoty', 'info');
        }
    }

    // Modal handling
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    handlePasswordChange(event) {
        event.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            this.showNotification('Hesla se neshodují', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showNotification('Heslo musí mít alespoň 6 znaků', 'error');
            return;
        }
        
        // Simulate password change
        this.showNotification('Heslo bylo úspěšně změněno', 'success');
        this.closeModal('changePasswordModal');
        
        // Clear form
        document.getElementById('changePasswordForm').reset();
    }

    handleEmailChange(event) {
        event.preventDefault();
        
        const newEmail = document.getElementById('newEmail').value;
        const confirmEmail = document.getElementById('confirmEmail').value;
        const password = document.getElementById('passwordConfirm').value;
        
        if (newEmail !== confirmEmail) {
            this.showNotification('E-maily se neshodují', 'error');
            return;
        }
        
        // Simulate email change
        this.accountData.email = newEmail;
        this.updateAccountInfo();
        this.showNotification('E-mail byl úspěšně změněn', 'success');
        this.closeModal('changeEmailModal');
        
        // Clear form
        document.getElementById('changeEmailForm').reset();
    }

    handleAvatarChange() {
        const selectedAvatar = document.querySelector('.avatar-option.selected');
        if (selectedAvatar) {
            const newAvatar = selectedAvatar.dataset.avatar;
            this.accountData.avatar = newAvatar;
            this.updateAccountInfo();
            this.showNotification('Avatar byl změněn', 'success');
            this.closeModal('avatarModal');
        }
    }

    checkPasswordStrength(event) {
        const password = event.target.value;
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        let strength = 0;
        let text = '';
        
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        
        switch (strength) {
            case 0:
            case 1:
                strengthFill.className = 'strength-fill weak';
                text = 'Slabé heslo';
                break;
            case 2:
                strengthFill.className = 'strength-fill fair';
                text = 'Průměrné heslo';
                break;
            case 3:
                strengthFill.className = 'strength-fill good';
                text = 'Dobré heslo';
                break;
            case 4:
                strengthFill.className = 'strength-fill strong';
                text = 'Silné heslo';
                break;
        }
        
        strengthText.textContent = text;
    }

    // Data management functions
    exportData() {
        try {
            const exportData = {
                settings: this.settings,
                account: this.accountData,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            // Check what to export
            const includeSettings = document.getElementById('exportSettings').checked;
            const includeProgress = document.getElementById('exportProgress').checked;
            const includeStats = document.getElementById('exportStats').checked;
            const includeBattleHistory = document.getElementById('exportBattleHistory').checked;
            
            if (includeProgress) {
                exportData.quizProgress = JSON.parse(localStorage.getItem('quizProgress') || '{}');
            }
            
            if (includeStats) {
                exportData.statistics = JSON.parse(localStorage.getItem('statistics') || '{}');
            }
            
            if (includeBattleHistory) {
                exportData.battleHistory = JSON.parse(localStorage.getItem('battleUserStats') || '{}');
            }
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-app-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Data byla exportována', 'success');
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showNotification('Chyba při exportu dat', 'error');
        }
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.settings) {
                    this.settings = this.mergeSettings(this.defaultSettings, importedData.settings);
                    this.updateUI();
                    this.applySettings();
                }
                
                if (importedData.account) {
                    Object.assign(this.accountData, importedData.account);
                    this.updateAccountInfo();
                }
                
                if (importedData.quizProgress) {
                    localStorage.setItem('quizProgress', JSON.stringify(importedData.quizProgress));
                }
                
                if (importedData.statistics) {
                    localStorage.setItem('statistics', JSON.stringify(importedData.statistics));
                }
                
                if (importedData.battleHistory) {
                    localStorage.setItem('battleUserStats', JSON.stringify(importedData.battleHistory));
                }
                
                this.saveSettings();
                this.showNotification('Data byla úspěšně importována', 'success');
                
                const importStatus = document.getElementById('importStatus');
                importStatus.className = 'import-status success';
                importStatus.textContent = 'Import dokončen úspěšně';
                
            } catch (error) {
                console.error('Failed to import data:', error);
                this.showNotification('Chyba při importu dat - neplatný formát', 'error');
                
                const importStatus = document.getElementById('importStatus');
                importStatus.className = 'import-status error';
                importStatus.textContent = 'Chyba importu - neplatný soubor';
            }
        };
        
        reader.readAsText(file);
    }

    clearData(type) {
        let message = '';
        let action = null;
        
        switch (type) {
            case 'cache':
                message = 'Vymazat všechna dočasná data a cache?';
                action = () => {
                    // Clear various cache items
                    const cacheKeys = Object.keys(localStorage).filter(key => 
                        key.includes('cache') || key.includes('temp')
                    );
                    cacheKeys.forEach(key => localStorage.removeItem(key));
                };
                break;
                
            case 'progress':
                message = 'Vymazat všechen pokrok v kvízech? Tuto akci nelze vrátit zpět!';
                action = () => {
                    localStorage.removeItem('quizProgress');
                    localStorage.removeItem('statistics');
                };
                break;
                
            case 'settings':
                message = 'Obnovit všechna nastavení na výchozí hodnoty?';
                action = () => {
                    this.resetToDefault();
                };
                break;
                
            case 'all':
                message = 'VAROVÁNÍ: Vymazat všechna data včetně nastavení, pokroku a statistik? Tuto akci nelze vrátit zpět!';
                action = () => {
                    localStorage.clear();
                    this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
                    this.updateUI();
                    this.applySettings();
                };
                break;
        }
        
        if (confirm(message) && action) {
            action();
            this.updateStorageInfo();
            this.showNotification(`${type === 'all' ? 'Všechna data' : 'Vybraná data'} byla vymazána`, 'info');
        }
    }

    updateStorageInfo() {
        try {
            const sizes = {
                settings: this.getStorageSize('appSettings'),
                progress: this.getStorageSize('quizProgress') + this.getStorageSize('statistics'),
                battleStats: this.getStorageSize('battleUserStats'),
                cache: 0
            };
            
            // Calculate cache size
            Object.keys(localStorage).forEach(key => {
                if (key.includes('cache') || key.includes('temp')) {
                    sizes.cache += this.getStorageSize(key);
                }
            });
            
            // Update UI
            document.getElementById('settingsSize').textContent = this.formatSize(sizes.settings);
            document.getElementById('progressSize').textContent = this.formatSize(sizes.progress);
            document.getElementById('battleStatsSize').textContent = this.formatSize(sizes.battleStats);
            document.getElementById('cacheSize').textContent = this.formatSize(sizes.cache);
            
            const total = Object.values(sizes).reduce((sum, size) => sum + size, 0);
            document.getElementById('totalSize').textContent = this.formatSize(total);
            
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    getStorageSize(key) {
        const item = localStorage.getItem(key);
        return item ? new Blob([item]).size : 0;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notifications');
        if (container) {
            container.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    container.removeChild(notification);
                }, 300);
            }, 3000);
        }
    }

    // Public methods for other modules
    getSetting(category, setting) {
        return this.settings[category] && this.settings[category][setting];
    }

    setSetting(category, setting, value) {
        if (this.settings[category]) {
            this.settings[category][setting] = value;
            this.saveSettings();
        }
    }

    getTheme() {
        return {
            darkMode: this.settings.appearance.darkMode,
            colorTheme: this.settings.appearance.colorTheme
        };
    }

    async runSettingsAPIClientTest() {
        console.log('🧪 SETTINGS TEST BUTTON CLICKED! (v2.0)'); // Debug
        alert('🧪 TEST FUNCTION REACHED! - Settings v2.0'); // Immediate feedback
        
        const testResults = document.getElementById('testSettingsResults');
        const testOutput = document.getElementById('testSettingsOutput');
        
        if (!testResults || !testOutput) {
            console.error('❌ Settings test elements not found!');
            alert('❌ Settings test elements not found!');
            return;
        }
        
        testResults.style.display = 'block';
        
        let output = '';
        
        try {
            // Test 1: APIClient existence
            output += `<div>✅ APIClient exists: ${!!window.APIClient}</div>`;
            
            if (window.APIClient) {
                // Test 2: APIClient methods
                output += `<div>🔍 APIClient methods:</div>`;
                output += `<div>- isAuthenticated: ${typeof window.APIClient.isAuthenticated}</div>`;
                output += `<div>- getCurrentUser: ${typeof window.APIClient.getCurrentUser}</div>`;
                output += `<div>- get: ${typeof window.APIClient.get}</div>`;
                
                // Test 3: Authentication status
                try {
                    const isAuth = window.APIClient.isAuthenticated();
                    output += `<div>🔐 Is Authenticated: ${isAuth}</div>`;
                    
                    if (isAuth) {
                        // Test 4: Get current user
                        try {
                            const user = await window.APIClient.getCurrentUser();
                            output += `<div>👤 Current User Full Object:</div>`;
                            output += `<div style="margin-left: 20px; font-family: monospace; font-size: 12px;">${JSON.stringify(user, null, 2)}</div>`;
                            
                            // Extract username properly
                            const username = user.username || user.name || user.email || 'Unknown';
                            output += `<div>👤 Extracted Username: ${username}</div>`;
                            
                        } catch (userError) {
                            output += `<div>❌ Failed to get current user: ${userError.message}</div>`;
                        }
                        
                        // Test 5: API health check
                        try {
                            const health = await window.APIClient.get('/api/health');
                            output += `<div>💚 API Health Check: ${health.healthy ? 'OK' : 'FAILED'}</div>`;
                            output += `<div>📡 Response Time: ${health.responseTime}ms</div>`;
                        } catch (healthError) {
                            output += `<div>❌ API Health Check Failed: ${healthError.message}</div>`;
                        }
                        
                    } else {
                        output += `<div>🔓 User not authenticated</div>`;
                    }
                } catch (authError) {
                    output += `<div>❌ Authentication check failed: ${authError.message}</div>`;
                }
            } else {
                output += `<div>❌ APIClient not available</div>`;
            }
            
        } catch (error) {
            output += `<div>❌ Test failed: ${error.message}</div>`;
        }
        
        testOutput.innerHTML = output;
        console.log('🧪 Settings APIClient test completed');
    }
}

// Global modal functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize module when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.settingsModule = new SettingsModule();
        await window.settingsModule.initialize();
        console.log('Settings Module ready');
    } catch (error) {
        console.error('Failed to initialize Settings Module:', error);
    }
});

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
}

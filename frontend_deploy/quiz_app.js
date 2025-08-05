// Quiz Application JavaScript

// Lightweight logging system - integrated directly
const SimpleLogger = {
    logs: [],
    maxLogs: 1000,
    
    log(type, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            data: data
        };
        
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        this.updateDebugPanel(entry);
        console.log(`[${type.toUpperCase()}] ${message}`, data || '');
    },
    
    updateDebugPanel(entry) {
        const debugLog = document.getElementById('debugLog');
        const debugStats = document.getElementById('debugStats');
        
        if (debugLog) {
            const logEntry = document.createElement('div');
            logEntry.className = `debug-entry ${entry.type}`;
            
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            timestamp.textContent = `[${new Date(entry.timestamp).toLocaleTimeString()}]`;
            
            const type = document.createElement('span');
            type.className = 'type';
            type.textContent = entry.type.toUpperCase();
            
            const message = document.createElement('span');
            message.className = 'message';
            message.textContent = entry.message;
            
            logEntry.appendChild(timestamp);
            logEntry.appendChild(type);
            logEntry.appendChild(message);
            
            debugLog.appendChild(logEntry);
            debugLog.scrollTop = debugLog.scrollHeight;
            
            // Limit visible entries
            if (debugLog.children.length > 100) {
                debugLog.removeChild(debugLog.firstChild);
            }
        }
        
        if (debugStats) {
            debugStats.textContent = `Logů: ${this.logs.length}`;
        }
    },
    
    downloadLogs() {
        const data = {
            session_id: Date.now(),
            timestamp: new Date().toISOString(),
            logs: this.logs,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-debug-log-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.log('system', 'Debug log stažen');
        } catch (error) {
            console.error('Error downloading log:', error);
            this.log('error', `Chyba při stahování logu: ${error.message}`);
        }
    },
    
    clear() {
        this.logs = [];
        const debugLog = document.getElementById('debugLog');
        if (debugLog) {
            debugLog.innerHTML = '';
        }
        this.log('system', 'Debug log vymazán');
    }
};

// Debug panel functions
function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            SimpleLogger.log('system', 'Debug panel otevřen');
        } else {
            panel.style.display = 'none';
            SimpleLogger.log('system', 'Debug panel zavřen');
        }
    }
}

function clearDebugLog() {
    SimpleLogger.clear();
}

function downloadDebugLog() {
    SimpleLogger.downloadLogs();
}

class QuizApp {
    constructor() {
        SimpleLogger.log('system', 'QuizApp inicializace začíná');
        
        this.currentUser = null;
        this.questions = [];
        this.currentQuestionIndex = -1;
        this.answeredCurrent = false;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.wrongAnswers = new Set();
        this.showOnlyWrong = false;
        this.tables = [];
        this.currentTable = null;
        this.isImageMode = false;
        this.settings = this.loadSettings();
        
        // Battle-related properties
        this.isBattleMode = false;
        this.battleTimer = null;
        this.battleTimeLimit = 0;
        this.battleStartTime = null;
        
        // Multiplayer detection
        this.clientId = this.generateClientId();
        this.isHost = false;
        this.battlePlayers = [];
        
        this.init();
        this.createDemoUsers();
        
        SimpleLogger.log('success', 'QuizApp základní inicializace dokončena');
        
        // Initialize additional systems
        try {
            this.notifications = new NotificationSystem();
            this.accessibility = new AccessibilityManager();
            this.statistics = new StatisticsManager();
            SimpleLogger.log('success', 'Pomocné systémy inicializovány');
        } catch (error) {
            SimpleLogger.log('warning', `Některé pomocné systémy se nepodařilo načíst: ${error.message}`);
        }
        
        // Initialize oral exam system after a short delay to avoid circular dependency
        setTimeout(() => {
            try {
                if (typeof OralExamSystem !== 'undefined') {
                    this.oralExamSystem = new OralExamSystem();
                    SimpleLogger.log('success', 'Oral exam system initialized successfully');
                } else {
                    SimpleLogger.log('warning', 'OralExamSystem class not found - oral exam will be initialized on demand');
                    this.oralExamSystem = null;
                }
            } catch (error) {
                SimpleLogger.log('error', `Failed to initialize oral exam system: ${error.message}`);
                this.oralExamSystem = null;
            }
        }, 500); // Prodloužené zpoždění
    }

    // Notification system
    showNotification(message, type = 'info') {
        if (this.notifications) {
            this.notifications.show(message, type);
        } else {
            // Fallback to alert if notification system not initialized
            alert(message);
        }
    }

    // Screen reader support
    announceToScreenReader(message) {
        if (this.accessibility) {
            this.accessibility.announceToScreenReader(message);
        }
    }

    // Oral exam functionality
    showOralExam() {
        if (!this.currentUser) {
            this.showNotification('Pro ústní zkoušení se musíte přihlásit.', 'warning');
            return;
        }
        
        console.log('Attempting to show oral exam...');
        
        // Zkusit najít OralExamSystem třídu
        if (typeof OralExamSystem === 'undefined') {
            console.warn('OralExamSystem class not found, trying to load dynamically...');
            this.showNotification('Systém ústního zkoušení se načítá...', 'info');
            
            // Dynamicky načíst script pokud není dostupný
            const script = document.createElement('script');
            script.src = 'oral_exam_system.js';
            script.onload = () => {
                console.log('OralExamSystem script loaded');
                if (typeof OralExamSystem !== 'undefined') {
                    try {
                        this.oralExamSystem = new OralExamSystem();
                        this.oralExamSystem.showModal();
                        console.log('OralExamSystem initialized and modal shown');
                    } catch (error) {
                        console.error('Failed to initialize oral exam system:', error);
                        this.showNotification('Chyba při inicializaci systému ústního zkoušení: ' + error.message, 'error');
                    }
                } else {
                    this.showNotification('Systém ústního zkoušení nelze načíst', 'error');
                }
            };
            script.onerror = () => {
                console.error('Failed to load OralExamSystem script');
                this.showNotification('Chyba při načítání systému ústního zkoušení', 'error');
            };
            document.head.appendChild(script);
            return;
        }
        
        // Zkontrolovat, jestli už máme instanci
        if (!this.oralExamSystem) {
            try {
                this.oralExamSystem = new OralExamSystem();
                console.log('Oral exam system initialized successfully');
            } catch (error) {
                console.error('Failed to initialize oral exam system:', error);
                this.showNotification('Chyba při inicializaci systému ústního zkoušení: ' + error.message, 'error');
                return;
            }
        }
        
        // Zobrazit modal
        try {
            this.oralExamSystem.showModal();
        } catch (error) {
            console.error('Failed to show oral exam modal:', error);
            this.showNotification('Chyba při zobrazení ústního zkoušení: ' + error.message, 'error');
        }
    }

    createDemoUsers() {
        // Create demo users for easy testing
        const demoUsers = {
            'test': { password: 'test', totalCorrect: 45, totalWrong: 12, answeredQuestions: {} },
            'admin': { password: 'admin', totalCorrect: 120, totalWrong: 8, answeredQuestions: {} },
            'demo': { password: 'demo', totalCorrect: 78, totalWrong: 25, answeredQuestions: {} }
        };
        
        const existingUsers = this.loadFromStorage('users') || {};
        
        // Only add demo users if they don't exist
        Object.keys(demoUsers).forEach(username => {
            if (!existingUsers[username]) {
                existingUsers[username] = {
                    ...demoUsers[username],
                    registrationDate: new Date().toISOString()
                };
            }
        });
        
        this.saveToStorage('users', existingUsers);
    }

    init() {
        this.loadTables();
        this.setupEventListeners();
        this.updateUI();
        this.loadLeaderboard();
        
        // Check for existing battle session
        this.checkForExistingBattle();
        
        // Auto-login last user if available
        this.tryAutoLogin();
        
        // Initialize main status bar
        this.updateMainStatusBar();
        
        // Zkontroluj dostupnost serveru při startu (s malým zpožděním aby se UI stihlo načíst)
        setTimeout(() => {
            if (this.settings.backendMode === 'server') {
                this.checkServerAvailability();
            } else {
                this.updateMainStatusBar('local');
            }
        }, 1000);
    }

    generateClientId() {
        // Generate unique client ID based on browser fingerprint
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Client fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36) + Date.now().toString(36);
    }

    // Local Storage Management with better error handling
    saveToStorage(key, data) {
        try {
            // Check storage quota
            const testKey = `quiz_app_${key}_test`;
            const testValue = JSON.stringify(data);
            localStorage.setItem(testKey, testValue);
            localStorage.removeItem(testKey);
            
            // Save actual data
            localStorage.setItem(`quiz_app_${key}`, testValue);
            return true;
        } catch (e) {
            console.error('Error saving to storage:', e);
            if (e.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
            return false;
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(`quiz_app_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from storage:', e);
            // Try to recover corrupted data
            try {
                localStorage.removeItem(`quiz_app_${key}`);
            } catch (removeError) {
                console.error('Error removing corrupted data:', removeError);
            }
            return null;
        }
    }

    removeFromStorage(key) {
        try {
            localStorage.removeItem(`quiz_app_${key}`);
            return true;
        } catch (e) {
            console.error('Error removing from storage:', e);
            return false;
        }
    }

    handleStorageQuotaExceeded() {
        if (confirm('Úložiště je plné. Chcete vymazat stará data pro uvolnění místa?')) {
            this.cleanupOldData();
        }
    }

    cleanupOldData() {
        // Remove old session data and temporary data
        const keysToCheck = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('quiz_app_')) {
                keysToCheck.push(key);
            }
        }
        
        // Remove temporary and old battle data
        keysToCheck.forEach(key => {
            if (key.includes('_temp_') || key.includes('_old_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Settings Management
    loadSettings() {
        const defaults = {
            maxQuestionFontSize: 28,
            maxAnswerFontSize: 26,
            showOnlyUnanswered: false,
            useTestDb: false,
            backendMode: 'server', // 'local' nebo 'server' - změněno na server pro produkci
            serverUrl: 'https://quiz-web-app-wpls.onrender.com', // URL backend serveru na Render.com
            shuffleAnswers: true, // míchání odpovědí A, B, C
            randomOrder: false // náhodné pořadí otázek
        };
        
        // Použij API_CONFIG pokud je dostupný pro automatickou detekci prostředí
        if (window.API_CONFIG) {
            const apiDefaults = window.API_CONFIG.getDefaultSettings();
            defaults.backendMode = apiDefaults.backendMode;
            defaults.serverUrl = apiDefaults.serverUrl;
        }
        
        return this.loadFromStorage('settings') || defaults;
    }

    saveSettings() {
        this.saveToStorage('settings', this.settings);
    }

    // User Management
    tryAutoLogin() {
        const lastUser = this.loadFromStorage('last_user');
        if (lastUser && lastUser.username && lastUser.password) {
            if (this.verifyUserCredentials(lastUser.username, lastUser.password)) {
                this.loginUser(lastUser.username, lastUser.password, false);
            }
        }
    }

    verifyUserCredentials(username, password) {
        const users = this.loadFromStorage('users') || {};
        return users[username] && users[username].password === password;
    }

    saveUserCredentials(username, password) {
        const users = this.loadFromStorage('users') || {};
        if (!users[username]) {
            users[username] = {
                password: password,
                totalCorrect: 0,
                totalWrong: 0,
                answeredQuestions: {},
                registrationDate: new Date().toISOString()
            };
        } else {
            users[username].password = password;
        }
        this.saveToStorage('users', users);
    }

    updateUserTotalAnswers() {
        if (!this.currentUser) return;
        
        const users = this.loadFromStorage('users') || {};
        if (users[this.currentUser]) {
            users[this.currentUser].totalCorrect = (users[this.currentUser].totalCorrect || 0) + this.scoreCorrect;
            users[this.currentUser].totalWrong = (users[this.currentUser].totalWrong || 0) + this.scoreWrong;
            this.saveToStorage('users', users);
        }
        this.loadLeaderboard();
    }

    saveAnsweredQuestion(username, tableName, questionId, isCorrect) {
        const users = this.loadFromStorage('users') || {};
        if (users[username]) {
            if (!users[username].answeredQuestions) {
                users[username].answeredQuestions = {};
            }
            if (!users[username].answeredQuestions[tableName]) {
                users[username].answeredQuestions[tableName] = {};
            }
            if (isCorrect) {
                users[username].answeredQuestions[tableName][questionId] = true;
            }
            this.saveToStorage('users', users);
        }
    }

    getUnansweredQuestions(username, tableName, allQuestions) {
        const users = this.loadFromStorage('users') || {};
        if (users[username] && users[username].answeredQuestions && users[username].answeredQuestions[tableName]) {
            const answered = users[username].answeredQuestions[tableName];
            return allQuestions.filter(q => !answered[q.id]);
        }
        return allQuestions;
    }

    // Table and Question Management
    loadTables() {
        // Load tables from converted database data
        if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA.tables) {
            this.tables = Object.keys(QUIZ_DATA.tables);
        } else {
            // Fallback to sample data if quiz_data.js is not loaded
            this.tables = [
                '_00_Official_2203__2015_',
                '_00_Official_4343__2015_',
                '_00_Official_4700__2015_',
                '_00_SŽ_Změny___ok',
                '_01_ČSN_34_2600_ed_2___ok',
                '_02_ČSN_EN_50125_3___ok',
                'ČSN_34_2613_ed3___ok',
                'ČSN_34_2650___ok',
                'ČSN_37_5711___ok',
                'SŽ_T1___ok',
                'SŽ_T31___ok',
                'TNŽ_34_2620___ok',
                '03_UTZ_RTEZ_DUCR'
            ];
        }
        
        const tableCombo = document.getElementById('tableCombo');
        const battleTable = document.getElementById('battleTable');
        
        tableCombo.innerHTML = '<option value="">Vyberte tabulku...</option>';
        battleTable.innerHTML = '<option value="">Vyberte tabulku...</option>';
        
        this.tables.forEach(table => {
            const option1 = document.createElement('option');
            option1.value = table;
            option1.textContent = table;
            tableCombo.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = table;
            option2.textContent = table;
            battleTable.appendChild(option2);
        });
    }

    // New table selection handler - only loads questions, doesn't start quiz
    onTableSelected(tableName) {
        if (!tableName) {
            this.disableQuizButtons();
            return;
        }
        
        this.currentTable = tableName;
        this.loadQuestionsForTable(tableName);
        
        // Enable start quiz button if user is logged in
        const startBtn = document.getElementById('startQuizBtn');
        if (startBtn && this.currentUser) {
            startBtn.disabled = false;
        }
        
        // Update status
        document.getElementById('questionText').textContent = 
            `Tabulka "${tableName}" načtena (${this.questions.length} otázek). Klikněte na "Spustit kvíz" pro zahájení testu.`;
        
        if (window.debugLogger) {
            debugLogger.log(`Tabulka ${tableName} vybrána (${this.questions.length} otázek)`, 'info');
        }
    }
    
    // Load questions without starting the quiz
    loadQuestionsForTable(tableName) {
        if (!tableName) return;
        
        // Load questions from converted database data
        if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA.tables && QUIZ_DATA.tables[tableName]) {
            this.questions = QUIZ_DATA.tables[tableName].questions.map(q => ({
                id: q.id,
                question: q.otazka,
                answer_a: q.odpoved_a,
                answer_b: q.odpoved_b,
                answer_c: q.odpoved_c,
                correct_answer: q.spravna_odpoved,
                explanation: q.vysvetleni || '(Bez vysvětlení)'
            }));
        } else {
            // Fallback to sample data
            this.questions = this.generateSampleQuestions(tableName);
        }
        
        // Filter questions if needed
        this.applyQuestionFilters();
        
        // Reset quiz state
        this.currentQuestionIndex = -1;
        this.answeredCurrent = false;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.wrongAnswers.clear();
        
        // Update question count display
        document.getElementById('questionCount').textContent = `Otázky připraveny: ${this.questions.length}`;
    }
    
    // Start the quiz after table is selected
    startQuiz() {
        if (!this.currentUser) {
            this.showNotification('Pro spuštění kvízu se musíte přihlásit.', 'warning');
            return;
        }
        
        if (!this.currentTable || this.questions.length === 0) {
            this.showNotification('Nejprve vyberte tabulku s otázkami.', 'warning');
            return;
        }
        
        // Enable all quiz controls
        this.enableQuizButtons();
        
        // Disable start button and enable end button
        const startBtn = document.getElementById('startQuizBtn');
        const endBtn = document.getElementById('endTestBtn');
        if (startBtn) startBtn.disabled = true;
        if (endBtn) endBtn.disabled = false;
        
        // Start with first question or random
        this.currentQuestionIndex = this.settings.randomOrder ? 
            Math.floor(Math.random() * this.questions.length) : 0;
        
        // Shuffle answers if enabled
        if (this.settings.shuffleAnswers) {
            this.shuffleCurrentQuestionAnswers();
        }
        
        this.displayQuestion();
        this.updateStatus();
        
        if (window.debugLogger) {
            debugLogger.log(`Kvíz spuštěn - tabulka: ${this.currentTable}`, 'success');
        }
        
        // Send event to server if connected
        if (window.enhancedIntegration && window.serverStatusManager?.isOnline) {
            enhancedIntegration.notifyServerEvent('quiz_started', {
                user: this.currentUser,
                table: this.currentTable,
                question_count: this.questions.length,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Shuffle answers for current question to prevent pattern learning
    shuffleCurrentQuestionAnswers() {
        if (!this.questions[this.currentQuestionIndex]) return;
        
        const question = this.questions[this.currentQuestionIndex];
        const answers = [
            { letter: 'A', text: question.answer_a },
            { letter: 'B', text: question.answer_b },
            { letter: 'C', text: question.answer_c }
        ];
        
        // Fisher-Yates shuffle
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        
        // Store the mapping for answer checking
        question._shuffledAnswers = answers;
        question._originalCorrect = question.correct_answer;
        
        // Find new correct answer position
        const correctAnswer = answers.find(a => 
            (question.correct_answer === 'A' && a.text === question.answer_a) ||
            (question.correct_answer === 'B' && a.text === question.answer_b) ||
            (question.correct_answer === 'C' && a.text === question.answer_c)
        );
        
        if (correctAnswer) {
            question.correct_answer = correctAnswer.letter;
        }
    }
    
    // Enable quiz navigation and answer buttons
    enableQuizButtons() {
        const buttonIds = ['backBtn', 'forwardBtn', 'randomBtn', 'hardBtn', 'incorrectBtn'];
        buttonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
        
        // Enable answer clicking
        const answerOptions = document.querySelectorAll('.answer-option');
        answerOptions.forEach(option => {
            option.style.pointerEvents = 'auto';
            option.style.opacity = '1';
        });
        
        // Enable hint checkbox
        const hintCheckbox = document.getElementById('hintCheckbox');
        if (hintCheckbox) hintCheckbox.disabled = false;
    }
    
    // Disable quiz navigation and answer buttons
    disableQuizButtons() {
        const buttonIds = ['backBtn', 'forwardBtn', 'randomBtn', 'hardBtn', 'incorrectBtn', 'endTestBtn'];
        buttonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
        
        // Disable answer clicking
        const answerOptions = document.querySelectorAll('.answer-option');
        answerOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.5';
        });
        
        // Disable hint checkbox
        const hintCheckbox = document.getElementById('hintCheckbox');
        if (hintCheckbox) hintCheckbox.disabled = true;
    }

    loadTableQuestions(tableName) {
        if (!tableName) return;
        
        this.currentTable = tableName;
        
        // Load questions from converted database data
        if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA.tables && QUIZ_DATA.tables[tableName]) {
            this.questions = QUIZ_DATA.tables[tableName].questions.map(q => ({
                id: q.id,
                question: q.otazka,
                answer_a: q.odpoved_a,
                answer_b: q.odpoved_b,
                answer_c: q.odpoved_c,
                correct_answer: q.spravna_odpoved,
                explanation: q.vysvetleni || '(Bez vysvětlení)'
            }));
        } else {
            // Fallback to sample data
            this.questions = this.generateSampleQuestions(tableName);
        }
        
        // Filter questions if needed
        if (this.settings.showOnlyUnanswered && this.currentUser) {
            this.questions = this.getUnansweredQuestions(this.currentUser, tableName, this.questions);
        }
        
        // Reset quiz state
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.wrongAnswers.clear();
        this.currentQuestionIndex = -1;
        
        this.updateScore();
        this.nextQuestion();
    }

    generateSampleQuestions(tableName) {
        // This is sample data - in a real implementation, you'd load from your database
        const sampleQuestions = [
            {
                id: 1,
                question: "01) Souprava hlavních klíčů obsahuje:",
                answer_a: "A) Hlavni klíče od zámků výhybek, výkolejek, od uzamykatelných přenosných výměnových zámků a uzamykatelných podložek.",
                answer_b: "B) hlavni a náhradní klíče od zámků výhybek a výkolejek.",
                answer_c: "C) hlavni a náhradní klíče od uzamykatelných přenosných výměnových zámků a uzamykatelných podložek.",
                correct_answer: "A) Hlavni klíče od zámků výhybek, výkolejek, od uzamykatelných přenosných výměnových zámků a uzamykatelných podložek.",
                explanation: "()"
            },
            {
                id: 2,
                question: "02) Kdy a koho musí zpravit zaměstnanec, který zjistil, že na světelném návěstidle výhybky se samovratným přestavníkem není návěst JÍZDA ZAJIŠTĚNA?",
                answer_a: "A) Neprodlené dirigujícího dispečera a strojvedoucí všech vlaků v dopravně D3.",
                answer_b: "B) Neprodleně pouze výpravčího přilehlé stanice.",
                answer_c: "C) Neprodleně pouze udržujícího zaměstnance SSZT.",
                correct_answer: "A) Neprodlené dirigujícího dispečera a strojvedoucí všech vlaků v dopravně D3.",
                explanation: "()"
            },
            {
                id: 3,
                question: "03) Jaký tvar mají v soupravě hlavních klíčů štítky od výhybek a výkolejek?",
                answer_a: "A) Kruhový.",
                answer_b: "B) Obdélníkový.",
                answer_c: "C) Čtvercový.",
                correct_answer: "A) Kruhový.",
                explanation: "()"
            }
        ];
        
        // Generate more questions for demonstration
        const questions = [];
        for (let i = 0; i < 20; i++) {
            const base = sampleQuestions[i % sampleQuestions.length];
            questions.push({
                ...base,
                id: i + 1,
                question: `${String(i + 1).padStart(2, '0')}) ${base.question.substring(4)}`
            });
        }
        
        return questions;
    }

    // Question Display and Navigation
    displayQuestion() {
        if (!this.questions || this.currentQuestionIndex < 0) return;
        
        const question = this.questions[this.currentQuestionIndex];
        
        // Update question text
        document.getElementById('questionText').textContent = question.question;
        
        // Use shuffled answers if available, otherwise original order
        let answers;
        if (question._shuffledAnswers) {
            // Use pre-shuffled answers
            answers = question._shuffledAnswers;
        } else {
            // Use original order
            answers = [
                { letter: 'A', text: question.answer_a },
                { letter: 'B', text: question.answer_b },
                { letter: 'C', text: question.answer_c }
            ];
        }
        
        // Update answer options with potentially shuffled content
        const answerElements = ['answerA', 'answerB', 'answerC'];
        answerElements.forEach((elementId, index) => {
            const element = document.getElementById(elementId);
            const answerText = element.querySelector('.answer-text');
            const answerLetter = element.querySelector('.answer-letter');
            
            // Set the answer text from shuffled or original answers
            answerText.textContent = answers[index].text;
            
            // Keep the visual letter (A, B, C) but store the actual answer mapping
            answerLetter.textContent = String.fromCharCode(65 + index) + ')';
            
            // Store the original letter for answer checking
            element.dataset.originalLetter = answers[index].letter;
            
            // Reset styles
            element.className = 'answer-option';
            element.removeAttribute('aria-disabled');
            element.onclick = () => this.checkAnswer(String.fromCharCode(65 + index));
        });
        
        // Update correct answer hint
        const hintElement = document.getElementById('correctAnswerHint');
        hintElement.textContent = `Správná odpověď: ${question.correct_answer}`;
        hintElement.classList.toggle('hidden', !document.getElementById('hintCheckbox').checked);
        
        // Hide explanation
        document.getElementById('explanation').classList.add('hidden');
        
        this.answeredCurrent = false;
        this.updateQuestionCount();
        this.updateFontSizes();
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            if (this.isBattleMode) {
                this.endBattleMode();
                alert("Všechny otázky byly zodpovězeny! Bitva skončila.");
            } else {
                // Quiz completed - notify server (v4.0)
                this.onQuizCompleted();
                alert("Všechny otázky byly zodpovězeny!");
            }
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    randomQuestion() {
        if (this.questions.length > 0) {
            this.currentQuestionIndex = Math.floor(Math.random() * this.questions.length);
            this.displayQuestion();
        }
    }

    // Answer Checking with better validation
    checkAnswer(selectedLetter) {
        if (this.answeredCurrent || !this.questions || this.currentQuestionIndex < 0) return;
        
        const question = this.questions[this.currentQuestionIndex];
        if (!question) {
            console.error('No question found at current index');
            return;
        }
        
        const selectedElement = document.getElementById(`answer${selectedLetter}`);
        if (!selectedElement) {
            console.error('Answer element not found:', selectedLetter);
            return;
        }
        
        const selectedTextElement = selectedElement.querySelector('.answer-text');
        if (!selectedTextElement) {
            console.error('Answer text element not found');
            return;
        }
        
        const selectedText = selectedTextElement.textContent;
        
        // Disable all answer options
        ['answerA', 'answerB', 'answerC'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('disabled');
                element.setAttribute('aria-disabled', 'true');
            }
        });
        
        // Check if answer is correct - use original letter mapping if shuffled
        let isCorrect;
        if (question._shuffledAnswers) {
            // Find the original letter for the selected visual position
            const originalLetter = selectedElement.dataset.originalLetter;
            isCorrect = originalLetter === question._originalCorrect;
        } else {
            // Standard check for non-shuffled answers
            isCorrect = selectedText === question.correct_answer;
        }
        
        if (isCorrect) {
            selectedElement.classList.add('correct');
            selectedElement.setAttribute('aria-label', `Správně! ${selectedText}`);
            this.scoreCorrect++;
            
            // Save correct answer
            if (this.currentUser) {
                this.saveAnsweredQuestion(this.currentUser, this.currentTable, question.id, true);
            }
        } else {
            selectedElement.classList.add('wrong');
            selectedElement.setAttribute('aria-label', `Špatně! ${selectedText}`);
            
            // Find and highlight correct answer - need to find by original answer content
            let correctAnswerText;
            if (question._originalCorrect === 'A') {
                correctAnswerText = question.answer_a;
            } else if (question._originalCorrect === 'B') {
                correctAnswerText = question.answer_b;
            } else if (question._originalCorrect === 'C') {
                correctAnswerText = question.answer_c;
            }
            
            ['answerA', 'answerB', 'answerC'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    const answerText = element.querySelector('.answer-text');
                    if (answerText && answerText.textContent === correctAnswerText) {
                        element.classList.add('correct');
                        element.setAttribute('aria-label', `Správná odpověď: ${answerText.textContent}`);
                    }
                }
            });
            
            this.scoreWrong++;
            this.wrongAnswers.add(this.currentQuestionIndex);
            this.saveToGlobalWrongQuestions(question);
        }
        
        this.answeredCurrent = true;
        
        // Show explanation with validation
        const explanationElement = document.getElementById('explanation');
        const explanationText = document.getElementById('explanationText');
        if (explanationElement && explanationText) {
            const explanation = question.explanation || 'Žádné vysvětlení není k dispozici.';
            explanationText.textContent = explanation;
            explanationElement.classList.remove('hidden');
            explanationElement.setAttribute('aria-live', 'polite');
        }
        
        this.updateScore();
        this.updateWindowTitle();
        
        // Update battle score if in battle mode
        if (this.isBattleMode) {
            this.updateBattleScore();
        }
        
        // Check if all questions answered
        const totalAnswers = this.scoreCorrect + this.scoreWrong;
        if (totalAnswers >= this.questions.length) {
            setTimeout(() => {
                if (this.isBattleMode) {
                    this.endBattleMode();
                    this.showNotification("Všechny otázky byly zodpovězeny! Bitva skončila.", 'success');
                } else {
                    this.showNotification("Všechny otázky byly zodpovězeny!", 'success');
                }
            }, 1000);
        }
        
        // Announce result to screen readers
        const message = isCorrect ? 
            `Správná odpověď! Skóre: ${this.scoreCorrect} správně, ${this.scoreWrong} špatně.` :
            `Špatná odpověď. Správná odpověď je: ${question.correct_answer}. Skóre: ${this.scoreCorrect} správně, ${this.scoreWrong} špatně.`;
        
        this.announceToScreenReader(message);
    }

    // UI Updates
    updateScore() {
        document.getElementById('score').textContent = `Správně: ${this.scoreCorrect} Špatně: ${this.scoreWrong}`;
        
        const totalAnswers = this.scoreCorrect + this.scoreWrong;
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = this.questions.length > 0 ? (totalAnswers / this.questions.length) * 100 : 0;
        progressFill.style.width = `${progressPercentage}%`;
    }

    updateQuestionCount() {
        const total = this.questions.length;
        const current = this.currentQuestionIndex + 1;
        document.getElementById('questionCount').textContent = `Otázka: ${current}/${total}`;
    }

    updateWindowTitle() {
        const totalAnswers = this.scoreCorrect + this.scoreWrong;
        const userData = this.getUserTotalAnswers();
        const statusText = `Quiz Application - ${this.currentUser || 'Nepřihlášený uživatel'} (${totalAnswers} odpovědí, celkem správně ${userData.totalCorrect}, celkem špatně ${userData.totalWrong})`;
        document.getElementById('statusText').textContent = statusText;
    }

    getUserTotalAnswers() {
        if (!this.currentUser) return { totalCorrect: 0, totalWrong: 0 };
        
        const users = this.loadFromStorage('users') || {};
        if (users[this.currentUser]) {
            return {
                totalCorrect: users[this.currentUser].totalCorrect || 0,
                totalWrong: users[this.currentUser].totalWrong || 0
            };
        }
        return { totalCorrect: 0, totalWrong: 0 };
    }

    updateFontSizes() {
        const questionElement = document.getElementById('questionText');
        const questionText = questionElement.textContent;
        
        if (questionText && !questionElement.hasAttribute('disabled')) {
            const textLength = questionText.length;
            let fontSize = this.settings.maxQuestionFontSize;
            
            if (textLength > 100) {
                fontSize = Math.max(10, this.settings.maxQuestionFontSize - Math.floor((textLength - 100) / 30));
            }
            
            questionElement.style.fontSize = `${fontSize}px`;
        }
        
        // Update answer font sizes
        ['answerA', 'answerB', 'answerC'].forEach(id => {
            const element = document.getElementById(id);
            const answerText = element.querySelector('.answer-text');
            const text = answerText.textContent;
            
            let fontSize = this.settings.maxAnswerFontSize;
            if (text.length > 50) {
                fontSize = Math.max(12, this.settings.maxAnswerFontSize - Math.floor((text.length - 50) / 20));
            }
            
            answerText.style.fontSize = `${fontSize}px`;
        });
    }

    // User Authentication with better validation
    async loginUser(username, password, showMessages = true) {
        SimpleLogger.log('action', `Pokus o přihlášení uživatele: ${username}`);
        
        try {
            // Pokud je dostupná enhanced integrace, použij ji
            if (typeof enhancedIntegration !== 'undefined' && enhancedIntegration) {
                const result = await enhancedIntegration.loginUser(username, password);
                SimpleLogger.log('success', `Úspěšné přihlášení uživatele: ${username}`);
                return result;
            }
            
            // Jinak použij původní lokální přihlášení
            const result = this.loginUserLocal(username, password, showMessages);
            if (result) {
                SimpleLogger.log('success', `Lokální přihlášení úspěšné: ${username}`);
            } else {
                SimpleLogger.log('warning', `Lokální přihlášení neúspěšné: ${username}`);
            }
            return result;
        } catch (error) {
            SimpleLogger.log('error', `Chyba při přihlášení: ${error.message}`, error);
            if (showMessages) {
                this.showNotification(`Chyba při přihlášení: ${error.message}`, 'error');
            }
            throw error;
        }
    }
    
    loginUserLocal(username, password, showMessages = true) {
        // Input validation
        if (!username || !password) {
            if (showMessages) {
                this.showNotification("Uživatelské jméno a heslo jsou povinné.", 'error');
            }
            return false;
        }

        if (username.length < 3 || username.length > 20) {
            if (showMessages) {
                this.showNotification("Uživatelské jméno musí mít 3-20 znaků.", 'error');
            }
            return false;
        }

        if (this.verifyUserCredentials(username, password)) {
            this.currentUser = username;
            this.saveToStorage('last_user', { username, password });
            
            // Reset scores and reload questions
            this.scoreCorrect = 0;
            this.scoreWrong = 0;
            this.wrongAnswers.clear();
            
            if (this.currentTable) {
                this.loadTableQuestions(this.currentTable);
            }
            
            this.updateScore();
            this.updateWindowTitle();
            this.updateUI();
            
            if (showMessages) {
                this.showNotification(`Úspěšně přihlášen jako ${username}`, 'success');
            }
            return true;
        } else {
            if (showMessages) {
                this.showNotification("Nesprávné uživatelské jméno nebo heslo.", 'error');
            }
            return false;
        }
    }

    logout() {
        if (this.currentUser) {
            const currentUsername = this.currentUser;
            this.currentUser = null;
            
            // Clear any active sessions
            this.scoreCorrect = 0;
            this.scoreWrong = 0;
            this.wrongAnswers.clear();
            this.questions = [];
            this.currentQuestionIndex = -1;
            this.currentTable = null;
            
            // Remove saved credentials
            this.removeFromStorage('last_user');
            
            // Update UI
            this.updateScore();
            this.updateWindowTitle();
            this.updateUI();
            
            // Clear question display
            const questionText = document.getElementById('questionText');
            questionText.textContent = "Vyberte tabulku a přihlaste se pro začátek kvízu.";
            
            // Reset table combo
            const tableCombo = document.getElementById('tableCombo');
            tableCombo.selectedIndex = 0;
            
            this.showNotification(`Uživatel ${currentUsername} byl odhlášen`, 'info');
        }
    }

    async registerUser(username, password, email = '') {
        SimpleLogger.log('action', `Pokus o registraci uživatele: ${username} (${email})`);
        
        try {
            // Always try server registration first, regardless of current mode
            SimpleLogger.log('info', 'Vynucená serverová registrace - přepínání na server');
            
            const originalMode = this.settings.backendMode;
            
            // Temporarily switch to server mode for registration
            this.settings.backendMode = 'server';
            
            if (typeof enhancedIntegration !== 'undefined' && enhancedIntegration) {
                await enhancedIntegration.updateBackendUrl(this.settings.serverUrl);
                SimpleLogger.log('info', `Backend URL aktualizována na: ${this.settings.serverUrl}`);
                
                const result = await enhancedIntegration.registerUser(username, password, email);
                SimpleLogger.log('success', `Server registrace úspěšná pro uživatele: ${username}`);
                
                // Show success message
                this.showNotification(`Registrace proběhla úspěšně!\nUživatel: ${username}\nEmail: ${email}\nÚdaje byly uloženy na server.`, 'success');
                
                return result;
            } else {
                throw new Error('Enhanced integration není dostupná');
            }
            
        } catch (error) {
            SimpleLogger.log('error', `Chyba při serverové registraci: ${error.message}`, error);
            
            // Show error message
            this.showNotification(`Registrace se nezdařila!\nChyba: ${error.message}\n\nZkontrolujte internetové připojení a zkuste to znovu.`, 'error');
            
            throw error;
        }
    }
    
    registerUserLocal(username, password, email = '') {
        // Input validation
        if (!username || !password) {
            this.showNotification("Uživatelské jméno a heslo jsou povinné.", 'error');
            return false;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showNotification("Neplatný formát emailu.", 'error');
            return false;
        }

        if (username.length < 3 || username.length > 20) {
            this.showNotification("Uživatelské jméno musí mít 3-20 znaků.", 'error');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showNotification("Uživatelské jméno může obsahovat pouze písmena, číslice a podtržítka.", 'error');
            return false;
        }

        if (password.length < 6) {
            this.showNotification("Heslo musí mít alespoň 6 znaků.", 'error');
            return false;
        }

        const users = this.loadFromStorage('users') || {};
        if (users[username]) {
            this.showNotification("Uživatel již existuje. Pokud chcete změnit heslo, použijte možnost 'Změnit heslo'.", 'warning');
            return false;
        }
        
        this.saveUserCredentials(username, password);
        const loginSuccess = this.loginUser(username, password, false);
        
        if (loginSuccess) {
            this.showNotification(`Uživatel ${username} byl úspěšně zaregistrován a přihlášen.`, 'success');
            return true;
        } else {
            this.showNotification("Chyba při registraci uživatele.", 'error');
            return false;
        }
    }

    changePassword(username, currentPassword, newPassword) {
        // Input validation
        if (!newPassword || newPassword.length < 6) {
            this.showNotification("Nové heslo musí mít alespoň 6 znaků.", 'error');
            return false;
        }

        if (!this.verifyUserCredentials(username, currentPassword)) {
            this.showNotification("Nesprávné současné heslo.", 'error');
            return false;
        }
        
        this.saveUserCredentials(username, newPassword);
        this.showNotification("Heslo bylo úspěšně změněno.", 'success');
        return true;
    }

    // UI State Management
    updateUI() {
        const isLoggedIn = !!this.currentUser;
        const hasTable = !!this.currentTable;
        const hasQuestions = this.questions.length > 0 && isLoggedIn && hasTable;
        
        // Update auth buttons visibility
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userStatus = document.getElementById('userStatus');
        
        if (isLoggedIn) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            userStatus.style.display = 'block';
            userStatus.textContent = `👤 ${this.currentUser}`;
        } else {
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            userStatus.style.display = 'none';
        }
        
        // Enable/disable table combo - allow selection when logged in
        const tableCombo = document.getElementById('tableCombo');
        if (tableCombo) tableCombo.disabled = !isLoggedIn;
        
        // Enable/disable quiz navigation controls - only when quiz is active
        const quizControls = ['backBtn', 'forwardBtn', 'randomBtn', 'hardBtn', 'loadBtn', 'incorrectBtn'];
        quizControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.disabled = !hasQuestions || this.currentQuestionIndex === -1;
        });
        
        // Enable/disable quiz start/end buttons
        const startBtn = document.getElementById('startQuizBtn');
        const endBtn = document.getElementById('endTestBtn');
        
        if (startBtn) {
            startBtn.disabled = !isLoggedIn || !hasTable; // Enable when logged in AND has table
        }
        if (endBtn) {
            endBtn.disabled = true; // Initially disabled, enabled when quiz starts
        }
        
        // Enable/disable menu items
        document.getElementById('changePasswordBtn').disabled = !isLoggedIn;
        document.getElementById('resultsBtn').disabled = !isLoggedIn;
        
        // Enable hint checkbox only for admin or regular users differently
        const hintCheckbox = document.getElementById('hintCheckbox');
        if (this.currentUser === 'root') {
            hintCheckbox.disabled = false;
        } else {
            hintCheckbox.disabled = !isLoggedIn;
        }
        
        // Update question display
        const questionText = document.getElementById('questionText');
        if (!isLoggedIn) {
            questionText.textContent = "Přihlaste se pro začátek kvízu.";
            questionText.setAttribute('disabled', '');
        } else if (!hasTable) {
            questionText.textContent = "Vyberte tabulku pro začátek kvízu.";
            questionText.setAttribute('disabled', '');
        } else if (!hasQuestions) {
            questionText.textContent = "Načítání otázek...";
            questionText.setAttribute('disabled', '');
        } else {
            questionText.removeAttribute('disabled');
        }
        
        // Update main status bar
        this.updateMainStatusBar();
    }

    // Hard Mode (Wrong Questions)
    toggleHardMode() {
        this.showOnlyWrong = !this.showOnlyWrong;
        const hardBtn = document.getElementById('hardBtn');
        
        if (this.showOnlyWrong) {
            const wrongQuestions = this.loadGlobalWrongQuestions();
            if (wrongQuestions && wrongQuestions.length > 0) {
                this.originalQuestions = this.questions;
                this.questions = wrongQuestions;
                this.currentQuestionIndex = -1;
                this.nextQuestion();
                hardBtn.style.backgroundColor = 'yellow';
                hardBtn.style.color = 'black';
                alert(`Načteno ${wrongQuestions.length} problematických otázek.`);
            } else {
                alert("Zatím nejsou k dispozici žádné problematické otázky.");
                this.showOnlyWrong = false;
            }
        } else {
            if (this.originalQuestions) {
                this.questions = this.originalQuestions;
                this.currentQuestionIndex = -1;
                this.nextQuestion();
            }
            hardBtn.style.backgroundColor = '';
            hardBtn.style.color = '';
        }
    }

    saveToGlobalWrongQuestions(question) {
        const wrongQuestions = this.loadFromStorage('global_wrong_questions') || [];
        
        // Check if question already exists
        const exists = wrongQuestions.some(q => q.id === question.id);
        if (!exists) {
            wrongQuestions.push(question);
            this.saveToStorage('global_wrong_questions', wrongQuestions);
        }
    }

    loadGlobalWrongQuestions() {
        return this.loadFromStorage('global_wrong_questions') || [];
    }

    // Hint functionality
    toggleHint(checked) {
        const hintElement = document.getElementById('correctAnswerHint');
        hintElement.classList.toggle('hidden', !checked);
    }

    // Leaderboard
    loadLeaderboard() {
        const users = this.loadFromStorage('users') || {};
        const userArray = Object.entries(users).map(([username, data]) => ({
            username,
            correct: data.totalCorrect || 0,
            wrong: data.totalWrong || 0
        }));
        
        userArray.sort((a, b) => b.correct - a.correct);
        
        const medals = ['🥇', '🥈', '🥉'];
        const leaderboardList = document.getElementById('leaderboard-list');
        const items = leaderboardList.querySelectorAll('.leaderboard-item');
        
        items.forEach((item, index) => {
            if (index < userArray.length) {
                const user = userArray[index];
                item.textContent = `${medals[index]} ${user.username} (${user.correct}/${user.wrong})`;
            } else {
                item.textContent = index < 3 ? medals[index] : '';
            }
        });
    }

    // Battle Mode
    startBattle() {
        this.showModal('battleSetupModal');
    }

    joinBattle() {
        // Check for existing battles
        const existingBattle = this.loadFromStorage('current_battle');
        if (existingBattle && existingBattle.players.length < existingBattle.maxPlayers) {
            this.joinExistingBattle(existingBattle);
        } else {
            alert('Žádná dostupná bitva nenalezena.');
        }
    }

    createBattle(tableName, questionCount, timeLimit, playerCount) {
        const battleId = this.generateBattleId();
        const battle = {
            id: battleId,
            table: tableName,
            questionCount: parseInt(questionCount),
            timeLimit: parseInt(timeLimit),
            maxPlayers: parseInt(playerCount),
            players: [{
                id: this.clientId,
                username: this.currentUser,
                score: { correct: 0, wrong: 0 }
            }],
            questions: this.generateBattleQuestions(tableName, questionCount),
            startTime: null,
            status: 'waiting'
        };
        
        this.saveToStorage('current_battle', battle);
        this.isHost = true;
        this.waitForPlayers(battle);
    }

    generateBattleId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateBattleQuestions(tableName, count) {
        // Use real data if available, otherwise fallback to sample data
        let allQuestions;
        if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA.tables && QUIZ_DATA.tables[tableName]) {
            allQuestions = QUIZ_DATA.tables[tableName].questions.map(q => ({
                id: q.id,
                question: q.otazka,
                answer_a: q.odpoved_a,
                answer_b: q.odpoved_b,
                answer_c: q.odpoved_c,
                correct_answer: q.spravna_odpoved,
                explanation: q.vysvetleni || '(Bez vysvětlení)'
            }));
        } else {
            allQuestions = this.generateSampleQuestions(tableName);
        }
        
        const shuffled = this.shuffleArray([...allQuestions]);
        return shuffled.slice(0, count);
    }

    waitForPlayers(battle) {
        // Simulate waiting for players (in real implementation, this would use WebSockets or polling)
        if (battle.players.length >= battle.maxPlayers) {
            this.startBattleMode(battle);
        } else {
            alert(`Čekání na připojení hráčů (${battle.players.length}/${battle.maxPlayers})`);
            // In a real implementation, you would poll for new players here
        }
    }

    joinExistingBattle(battle) {
        battle.players.push({
            id: this.clientId,
            username: this.currentUser,
            score: { correct: 0, wrong: 0 }
        });
        
        this.saveToStorage('current_battle', battle);
        this.isHost = false;
        
        if (battle.players.length >= battle.maxPlayers) {
            this.startBattleMode(battle);
        } else {
            this.waitForPlayers(battle);
        }
    }

    startBattleMode(battle) {
        this.isBattleMode = true;
        this.battleTimeLimit = battle.timeLimit * 60; // Convert to seconds
        this.battleStartTime = Date.now();
        this.questions = battle.questions;
        this.currentQuestionIndex = -1;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        
        // Update UI for battle mode
        document.getElementById('battleScoreWidget').classList.remove('hidden');
        this.updateBattleUI();
        
        // Start timer
        this.startBattleTimer();
        
        // Start quiz
        this.nextQuestion();
        
        alert('Bitva začala!');
    }

    startBattleTimer() {
        this.battleTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.battleStartTime) / 1000);
            const remaining = Math.max(0, this.battleTimeLimit - elapsed);
            
            this.updateBattleTime(remaining);
            
            if (remaining <= 0) {
                this.endBattleMode();
            }
        }, 1000);
    }

    updateBattleTime(remaining) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('battleTimeText').textContent = `Čas: ${timeText}`;
        
        const progressPercentage = (remaining / this.battleTimeLimit) * 100;
        document.getElementById('timeProgressFill').style.width = `${progressPercentage}%`;
    }

    updateBattleScore() {
        const battle = this.loadFromStorage('current_battle');
        if (battle) {
            const playerIndex = battle.players.findIndex(p => p.id === this.clientId);
            if (playerIndex >= 0) {
                battle.players[playerIndex].score = {
                    correct: this.scoreCorrect,
                    wrong: this.scoreWrong
                };
                this.saveToStorage('current_battle', battle);
            }
        }
        
        this.updateBattleUI();
    }

    updateBattleUI() {
        const battle = this.loadFromStorage('current_battle');
        if (!battle) return;
        
        const scoresElement = document.getElementById('battleScores');
        scoresElement.innerHTML = '';
        
        battle.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'battle-player-score';
            playerDiv.innerHTML = `
                <strong>${player.username}:</strong> 
                Správně: ${player.score.correct} | 
                Špatně: ${player.score.wrong}
            `;
            scoresElement.appendChild(playerDiv);
        });
    }

    endBattleMode() {
        this.isBattleMode = false;
        
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        // Hide battle UI
        document.getElementById('battleScoreWidget').classList.add('hidden');
        
        // Save results and show final scores
        this.saveBattleResults();
        this.showBattleResults();
        
        // Battle completed - notify server (v4.0)
        this.onBattleCompleted();
        
        // Clean up
        this.saveToStorage('current_battle', null);
    }

    saveBattleResults() {
        const battle = this.loadFromStorage('current_battle');
        if (!battle) return;
        
        const battleResults = this.loadFromStorage('battle_history') || [];
        battleResults.push({
            id: battle.id,
            date: new Date().toISOString(),
            table: battle.table,
            players: battle.players,
            winner: this.getBattleWinner(battle.players)
        });
        
        this.saveToStorage('battle_history', battleResults);
    }

    getBattleWinner(players) {
        return players.reduce((winner, player) => {
            if (player.score.correct > winner.score.correct) {
                return player;
            } else if (player.score.correct === winner.score.correct && player.score.wrong < winner.score.wrong) {
                return player;
            }
            return winner;
        });
    }

    showBattleResults() {
        const battle = this.loadFromStorage('current_battle');
        if (!battle) return;
        
        const winner = this.getBattleWinner(battle.players);
        let resultText = `Bitva skončena!\n\nVítěz: ${winner.username}\n\nVýsledky:\n`;
        
        battle.players.forEach(player => {
            resultText += `${player.username}: ${player.score.correct} správně, ${player.score.wrong} špatně\n`;
        });
        
        alert(resultText);
    }

    checkForExistingBattle() {
        const battle = this.loadFromStorage('current_battle');
        if (battle && battle.status === 'active') {
            // Resume battle if it was interrupted
            this.startBattleMode(battle);
        }
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    // Settings
    showSettings() {
        const form = document.getElementById('settingsForm');
        form.maxQuestionFontSize.value = this.settings.maxQuestionFontSize;
        form.maxAnswerFontSize.value = this.settings.maxAnswerFontSize;
        form.showOnlyUnanswered.checked = this.settings.showOnlyUnanswered;
        form.useTestDb.checked = this.settings.useTestDb;
        form.shuffleAnswers.checked = this.settings.shuffleAnswers;
        form.randomOrder.checked = this.settings.randomOrder;
        form.backendMode.value = this.settings.backendMode;
        form.serverUrl.value = this.settings.serverUrl;
        
        this.showModal('settingsModal');
        
        // Zkontroluj dostupnost serveru při otevření nastavení
        this.checkServerAvailability();
    }

    saveSettingsFromForm() {
        const form = document.getElementById('settingsForm');
        this.settings.maxQuestionFontSize = parseInt(form.maxQuestionFontSize.value);
        this.settings.maxAnswerFontSize = parseInt(form.maxAnswerFontSize.value);
        this.settings.showOnlyUnanswered = form.showOnlyUnanswered.checked;
        this.settings.useTestDb = form.useTestDb.checked;
        this.settings.shuffleAnswers = form.shuffleAnswers.checked;
        this.settings.randomOrder = form.randomOrder.checked;
        this.settings.backendMode = form.backendMode.value;
        this.settings.serverUrl = form.serverUrl.value.trim() || 'https://quiz-web-app-wpls.onrender.com';
        
        this.saveSettings();
        this.updateFontSizes();
        
        // Aktualizuj backend URL v enhanced integration
        if (window.enhancedIntegration) {
            window.enhancedIntegration.updateBackendUrl(this.settings.serverUrl);
        }
        
        // Reload questions if the unanswered filter changed
        if (this.currentTable) {
            this.loadTableQuestions(this.currentTable);
        }
        
        // Zkontroluj dostupnost serveru po uložení
        this.checkServerAvailability();
        
        // Aktualizuj status bar
        this.updateMainStatusBar();
    }

    // Image Mode
    toggleImageMode() {
        this.isImageMode = !this.isImageMode;
        // Image mode implementation would go here
        alert(`Režim obrázků ${this.isImageMode ? 'zapnut' : 'vypnut'}`);
    }

    // Other functionality
    markIncorrect() {
        if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
            const question = this.questions[this.currentQuestionIndex];
            const incorrectQuestions = this.loadFromStorage('incorrect_questions') || [];
            incorrectQuestions.push(question.question);
            this.saveToStorage('incorrect_questions', incorrectQuestions);
            alert('Otázka byla označena jako chybná.');
        }
    }

    loadQuestionsFile() {
        // File upload functionality would be implemented here
        alert('Funkce načítání souboru bude implementována v budoucí verzi.');
    }

    showResults() {
        if (!this.currentUser) {
            alert('Nejprve se přihlaste.');
            return;
        }
        
        // Results visualization would be implemented here
        const userData = this.getUserTotalAnswers();
        alert(`Výsledky pro ${this.currentUser}:\nCelkem správně: ${userData.totalCorrect}\nCelkem špatně: ${userData.totalWrong}`);
    }

    showLoginDialog() {
        this.showModal('loginModal');
    }

    showRegisterDialog() {
        this.showModal('registerModal');
    }

    showChangePasswordDialog() {
        if (!this.currentUser) {
            alert('Nejprve se přihlaste.');
            return;
        }
        this.showModal('changePasswordModal');
    }

    // Utility functions
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            this.loginUser(username, password);
            this.closeModal('loginModal');
            e.target.reset();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            SimpleLogger.log('action', 'Register form submitted');
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            SimpleLogger.log('info', `Form data: username=${username}, email=${email}`);
            
            try {
                await this.registerUser(username, password, email);
                SimpleLogger.log('success', 'Registration completed successfully');
                this.closeModal('registerModal');
                e.target.reset();
            } catch (error) {
                SimpleLogger.log('error', `Registration failed: ${error.message}`);
                // Don't close modal on error, let user try again
            }
        });

        // Change password form
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            this.changePassword(this.currentUser, currentPassword, newPassword);
            this.closeModal('changePasswordModal');
            e.target.reset();
        });

        // Settings form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettingsFromForm();
            this.closeModal('settingsModal');
        });

        // Battle setup form
        document.getElementById('battleSetupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            this.createBattle(
                form.battleTable.value,
                form.battleQuestionCount.value,
                form.battleTimeLimit.value,
                form.battlePlayerCount.value
            );
            this.closeModal('battleSetupModal');
            form.reset();
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Zakázat klávesové zkratky během ústního zkoušení
            if (this.oralExamSystem && this.oralExamSystem.isActive) {
                console.log('Klávesové zkratky kvízu zakázány - probíhá ústní zkoušení');
                return;
            }
            
            if (!this.questions || this.currentQuestionIndex < 0) return;
            
            switch (e.key.toLowerCase()) {
                case 'a':
                    if (!this.answeredCurrent) this.checkAnswer('A');
                    break;
                case 'b':
                    if (!this.answeredCurrent) this.checkAnswer('B');
                    break;
                case 'c':
                    if (!this.answeredCurrent) this.checkAnswer('C');
                    break;
                case 'arrowleft':
                    this.prevQuestion();
                    break;
                case 'arrowright':
                case ' ':
                    this.nextQuestion();
                    break;
                case 'r':
                    this.randomQuestion();
                    break;
            }
        });
    }

    // Server Connectivity
    async checkServerAvailability() {
        const statusElement = document.getElementById('serverStatus');
        const statusText = document.getElementById('serverStatusText');
        const refreshBtn = document.getElementById('refreshServerBtn');
        const serverUrlInput = document.getElementById('serverUrl');
        const backendModeSelect = document.getElementById('backendMode');
        
        // Aktualizuj URL serveru z formuláře před testem
        if (serverUrlInput && serverUrlInput.value.trim()) {
            this.settings.serverUrl = serverUrlInput.value.trim();
            
            // Synchronizovat URL s enhanced integration
            if (typeof enhancedIntegration !== 'undefined' && enhancedIntegration) {
                enhancedIntegration.updateBackendUrl(this.settings.serverUrl);
            }
        }
        
        // Aktualizuj backend mode z formuláře před testem
        if (backendModeSelect) {
            this.settings.backendMode = backendModeSelect.value;
            this.saveSettings(); // Uložit nastavení
            
            // Synchronizovat s enhanced integration
            if (typeof enhancedIntegration !== 'undefined' && enhancedIntegration) {
                enhancedIntegration.updateBackendUrl(this.settings.serverUrl);
                
                // Aktualizovat režim enhanced integration
                if (this.settings.backendMode === 'server') {
                    enhancedIntegration.useServerAuth = true;
                    localStorage.setItem('authPreference', 'server');
                } else {
                    enhancedIntegration.useServerAuth = false;
                    enhancedIntegration.stopBackendMonitoring();
                    localStorage.setItem('authPreference', 'local');
                }
            }
        }
        
        // Aktualizuj status bar okamžitě podle režimu
        this.updateMainStatusBar();
        
        if (!statusElement || !statusText || !refreshBtn) {
            return; // Elementy nejsou v DOM (např. modal není otevřený)
        }
        
        // Nastavit stav "kontroluji"
        statusElement.className = 'server-status checking';
        statusText.className = 'checking';
        statusText.textContent = 'Kontroluji dostupnost serveru...';
        refreshBtn.disabled = true;
        
        if (this.settings.backendMode === 'local') {
            // Pro lokální režim zobrazit info o lokálním režimu
            statusElement.className = 'server-status online';
            statusText.className = 'online';
            statusText.textContent = 'Lokální režim - server se nekontroluje';
            refreshBtn.disabled = false;
            return;
        }
        
        try {
            // Pokus o připojení k serveru s timeoutem
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sekund timeout
            
            const response = await fetch(`${this.settings.serverUrl}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                statusElement.className = 'server-status online';
                statusText.className = 'online';
                statusText.textContent = `Server dostupný (${data.status || 'OK'})`;
                this.showNotification('Server je dostupný', 'success');
                
                // Aktualizuj hlavní status bar na online
                this.updateMainStatusBar('online');
            } else {
                throw new Error(`Server odpověděl s kódem: ${response.status}`);
            }
        } catch (error) {
            statusElement.className = 'server-status offline';
            statusText.className = 'offline';
            
            if (error.name === 'AbortError') {
                statusText.textContent = 'Server nedostupný (timeout)';
            } else {
                statusText.textContent = `Server nedostupný (${error.message})`;
            }
            
            this.showNotification('Server není dostupný - používá se lokální režim', 'warning');
            
            // Aktualizuj hlavní status bar na offline
            this.updateMainStatusBar('offline');
        } finally {
            refreshBtn.disabled = false;
        }
    }

    // Update main status bar in the header
    updateMainStatusBar(forceStatus = null) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusIndicatorText = document.getElementById('statusIndicatorText');
        const statusMode = document.getElementById('statusMode');
        
        if (!statusIndicator || !statusIndicatorText || !statusMode) {
            return;
        }
        
        let status = forceStatus;
        if (!status) {
            // Určit status podle nastavení
            if (this.settings.backendMode === 'local') {
                status = 'local';
            } else {
                status = 'offline'; // defaultní pro server mode
            }
        }
        
        switch (status) {
            case 'online':
                statusIndicator.textContent = '🟢';
                statusIndicatorText.textContent = 'Online';
                statusMode.textContent = 'Server Mode';
                break;
            case 'offline':
                statusIndicator.textContent = '🔴';
                statusIndicatorText.textContent = 'Offline';
                statusMode.textContent = 'Local Mode';
                break;
            case 'local':
                statusIndicator.textContent = '🟡';
                statusIndicatorText.textContent = 'Local';
                statusMode.textContent = 'Local Mode';
                break;
            default:
                statusIndicator.textContent = '🔴';
                statusIndicatorText.textContent = 'Offline';
                statusMode.textContent = 'Local Mode';
        }
    }

    // Get current backend URL based on settings
    getBackendUrl() {
        if (this.settings.backendMode === 'server') {
            return this.settings.serverUrl;
        }
        return null; // pro lokální režim
    }

    // Check if server mode is available
    isServerModeAvailable() {
        return this.settings.backendMode === 'server' && this.getBackendUrl();
    }
    
    // Event handlers for quiz completion (v4.0)
    onQuizCompleted() {
        if (!this.currentUser || !this.questions) return;
        
        // Calculate quiz results
        const userData = this.getUserTotalAnswers();
        const totalQuestions = this.questions.length;
        const correctAnswers = userData.totalCorrect;
        
        const quizData = {
            session_id: this.generateSessionId(),
            table_name: this.currentTable || 'unknown',
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            time_taken_seconds: this.calculateQuizTime(),
            quiz_type: 'normal'
        };
        
        // Notify server via enhanced integration
        if (window.enhancedIntegration) {
            window.enhancedIntegration.completeQuiz(quizData);
        }
        
        console.log('📝 Quiz completed:', quizData);
    }
    
    onBattleCompleted() {
        const battle = this.loadFromStorage('current_battle');
        if (!battle || !this.currentUser) return;
        
        const player = battle.players.find(p => p.name === this.currentUser);
        if (!player) return;
        
        const quizData = {
            session_id: battle.id,
            table_name: battle.table || 'unknown',
            total_questions: player.score.correct + player.score.wrong,
            correct_answers: player.score.correct,
            time_taken_seconds: this.calculateQuizTime(),
            quiz_type: 'battle'
        };
        
        // Notify server via enhanced integration
        if (window.enhancedIntegration) {
            window.enhancedIntegration.completeQuiz(quizData);
        }
        
        console.log('⚔️ Battle completed:', quizData);
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    calculateQuizTime() {
        // Simple time calculation - could be improved with actual start time tracking
        return Math.floor(Date.now() / 1000) % 10000; // Basic time estimate
    }
}

// ===========================================
// DEBUG PANEL AND SERVER STATUS MANAGEMENT
// ===========================================

class ServerStatusManager {
    constructor() {
        this.isOnline = false;
        this.lastPing = null;
        this.pingInterval = null;
        this.statusElement = document.getElementById('serverStatus');
        this.indicatorElement = document.getElementById('statusIndicator');
        this.textElement = document.getElementById('statusIndicatorText');
        this.modeElement = document.getElementById('statusMode');
        
        this.init();
    }
    
    init() {
        this.updateStatus('offline', 'Offline', 'Local Mode');
        this.startPingMonitoring();
    }
    
    startPingMonitoring() {
        // Ping server every 5 seconds
        this.pingInterval = setInterval(() => {
            this.pingServer();
        }, 5000);
        
        // Initial ping
        this.pingServer();
    }
    
    async pingServer() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            // Use the app's backend URL setting
            const backendUrl = app && app.settings && app.settings.backendMode === 'server' 
                ? app.settings.serverUrl 
                : 'https://quiz-web-app-wpls.onrender.com';
            
            const response = await fetch(`${backendUrl}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.updateStatus('online', 'Online', 'Server Mode');
                this.lastPing = new Date();
                if (window.debugLogger) debugLogger.log('Server ping successful', 'success');
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            this.updateStatus('offline', 'Offline', 'Local Mode');
            if (window.debugLogger) debugLogger.log(`Server ping failed: ${error.message}`, 'warning');
        }
    }
    
    updateStatus(status, text, mode) {
        if (!this.statusElement) return;
        
        this.isOnline = (status === 'online');
        
        // Update classes
        this.statusElement.className = `server-status ${status}`;
        
        // Update indicator
        if (this.indicatorElement) {
            switch(status) {
                case 'online':
                    this.indicatorElement.textContent = '🟢';
                    break;
                case 'connecting':
                    this.indicatorElement.textContent = '🟡';
                    break;
                default:
                    this.indicatorElement.textContent = '🔴';
            }
        }
        
        // Update text
        if (this.textElement) {
            this.textElement.textContent = text;
        }
        
        // Update mode
        if (this.modeElement) {
            this.modeElement.textContent = mode;
        }
    }
    
    setConnecting() {
        this.updateStatus('connecting', 'Connecting...', 'Connecting');
        debugLogger.log('Attempting server connection...', 'info');
    }
    
    destroy() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
    }
}

class DebugLogger {
    constructor() {
        this.logElement = document.getElementById('debugLog');
        this.autoScrollElement = document.getElementById('autoScrollDebug');
        this.maxEntries = 100;
        this.entries = [];
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            timestamp,
            message,
            type,
            id: Date.now() + Math.random()
        };
        
        this.entries.push(entry);
        
        // Limit entries
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
        
        this.renderEntry(entry);
        
        // Auto scroll if enabled
        if (this.autoScrollElement && this.autoScrollElement.checked) {
            this.scrollToBottom();
        }
        
        // Also log to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    renderEntry(entry) {
        if (!this.logElement) return;
        
        const entryDiv = document.createElement('div');
        entryDiv.className = `debug-entry ${entry.type}`;
        entryDiv.innerHTML = `
            <span class="timestamp">[${entry.timestamp}]</span>
            ${entry.message}
        `;
        
        this.logElement.appendChild(entryDiv);
        
        // Remove old entries from DOM
        while (this.logElement.children.length > this.maxEntries) {
            this.logElement.removeChild(this.logElement.firstChild);
        }
    }
    
    clear() {
        this.entries = [];
        if (this.logElement) {
            this.logElement.innerHTML = '<div class="debug-entry system">Debug log vymazán</div>';
        }
    }
    
    scrollToBottom() {
        if (this.logElement) {
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }
}

// Global debug functions
function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            debugLogger.log('Debug panel otevřen', 'system');
        } else {
            panel.style.display = 'none';
        }
    }
}

function clearDebugLog() {
    if (window.enhancedLogger) {
        enhancedLogger.clearLogs();
    } else if (window.debugLogger) {
        debugLogger.clear();
    }
}

function downloadDebugLog() {
    if (window.enhancedLogger) {
        enhancedLogger.downloadLogs();
    } else {
        console.warn('Enhanced logger not available for download');
    }
}

// End test confirmation and functionality
function endTestConfirm() {
    const confirmed = confirm('Opravdu chcete ukončit aktuální test? Všechny neuložené odpovědi budou ztraceny.');
    if (confirmed) {
        endTest();
    }
}

function endTest() {
    try {
        debugLogger.log('Ukončování testu...', 'info');
        
        // Stop any running timers
        if (app.battleTimer) {
            clearInterval(app.battleTimer);
            app.battleTimer = null;
        }
        
        // Reset battle mode
        app.isBattleMode = false;
        app.battleStartTime = null;
        
        // Clear current question
        app.currentQuestionIndex = -1;
        app.answeredCurrent = false;
        
        // Reset UI
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = 'Test byl ukončen. Vyberte tabulku a klikněte na "Spustit kvíz" pro nový test.';
        }
        
        // Clear answers
        const answerElements = ['answerA', 'answerB', 'answerC'];
        answerElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const answerText = element.querySelector('.answer-text');
                if (answerText) answerText.textContent = '';
                element.className = 'answer-option';
                element.style.pointerEvents = 'none';
                element.style.opacity = '0.5';
            }
        });
        
        // Enable start quiz button and disable end button
        const startBtn = document.getElementById('startQuizBtn');
        const endBtn = document.getElementById('endTestBtn');
        if (startBtn && app.currentTable) startBtn.disabled = false;
        if (endBtn) endBtn.disabled = true;
        
        // Disable navigation buttons
        const buttons = ['backBtn', 'forwardBtn', 'randomBtn', 'hardBtn', 'incorrectBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.disabled = true;
        });
        
        // Update status
        app.updateStatus();
        
        // Send event to server if connected
        if (window.enhancedIntegration && serverStatusManager.isOnline) {
            enhancedIntegration.notifyServerEvent('test_ended', {
                user: app.currentUser,
                score_correct: app.scoreCorrect,
                score_wrong: app.scoreWrong,
                timestamp: new Date().toISOString()
            });
        }
        
        debugLogger.log('Test úspěšně ukončen', 'success');
        
        // Show notification
        if (app.showNotification) {
            app.showNotification('Test byl ukončen', 'info');
        }
        
    } catch (error) {
        debugLogger.log(`Chyba při ukončování testu: ${error.message}`, 'error');
        console.error('Error ending test:', error);
    }
}

// Initialize managers when DOM is ready
let serverStatusManager = null;
let debugLogger = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize SimpleLogger
    SimpleLogger.log('system', 'Quiz Application DOMContentLoaded - SimpleLogger ready');
    SimpleLogger.log('info', 'Inicializace aplikace začíná...');
    
    // Make SimpleLogger globally available for compatibility
    window.debugLogger = SimpleLogger;
    window.enhancedLogger = SimpleLogger;
    
    // Initialize server status manager if available
    try {
        if (typeof ServerStatusManager !== 'undefined') {
            serverStatusManager = new ServerStatusManager();
            window.serverStatusManager = serverStatusManager;
            SimpleLogger.log('success', 'ServerStatusManager inicializován');
        } else {
            SimpleLogger.log('warning', 'ServerStatusManager není dostupný');
        }
    } catch (error) {
        SimpleLogger.log('error', `Chyba při inicializaci ServerStatusManager: ${error.message}`);
    }
    
    // Log workflow info
    SimpleLogger.log('info', 'Quiz workflow: Vyberte tabulku → Spustit kvíz → Odpovídejte na otázky → Ukončit test');
    
    // Override enhanced integration if available
    if (window.enhancedIntegration) {
        SimpleLogger.log('success', 'Enhanced integration detected - setting up logging override');
        const originalNotifyServer = enhancedIntegration.notifyServerEvent;
        enhancedIntegration.notifyServerEvent = function(eventType, data) {
            SimpleLogger.log('info', `Odesílání události: ${eventType}`);
            
            if (window.serverStatusManager) {
                serverStatusManager.setConnecting();
            }
            
            const result = originalNotifyServer.call(this, eventType, data);
            
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    SimpleLogger.log('success', `Událost ${eventType} úspěšně odeslána`);
                }).catch((error) => {
                    SimpleLogger.log('error', `Chyba při odesílání události ${eventType}: ${error.message}`);
                });
            }
            
            return result;
        };
    } else {
        SimpleLogger.log('warning', 'Enhanced integration not available yet');
    }
    
    // Initialize the application after DOM is ready
    SimpleLogger.log('system', 'Inicializuji QuizApp...');
    app = new QuizApp();
    window.app = app; // Make it globally accessible
    
    // Initialize enhanced integration if available
    if (typeof EnhancedQuizIntegration !== 'undefined') {
        enhancedIntegration = new EnhancedQuizIntegration(app);
        window.enhancedIntegration = enhancedIntegration; // Make it globally accessible
        SimpleLogger.log('success', 'Enhanced integration initialized');
    } else {
        SimpleLogger.log('warning', 'Enhanced integration not available - using local mode only');
    }
    
    SimpleLogger.log('success', 'Aplikace úspěšně inicializována!');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (serverStatusManager) {
        serverStatusManager.destroy();
    }
});

// Global variables
let app = null;
let enhancedIntegration = null;

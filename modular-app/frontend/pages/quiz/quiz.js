/**
 * QUIZ MODULE - MAIN LOGIC
 * Modularized version of the original quiz_app.js
 * Maintains compatibility while improving architecture
 */

class QuizModule {
    constructor() {
        this.currentUser = null;
        this.currentTable = null;
        this.questions = [];
        this.currentQuestionIndex = -1;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.wrongAnswers = new Set();
        this.answeredCurrent = false;
        this.showOnlyWrong = false;
        this.originalQuestions = null;
        this.isQuizActive = false;
        
        // Settings from original app
        this.settings = {
            maxQuestionFontSize: 18,
            maxAnswerFontSize: 16,
            showOnlyUnanswered: false,
            shuffleAnswers: true,
            randomOrder: false,
            showHints: false,
            autoNext: false,
            backendMode: 'local',
            serverUrl: 'https://quiz-web-app-wpls.onrender.com'
        };
        
        // Demo data (from original generateSampleQuestions)
        this.demoQuestions = {
            'Tabulka1': [
                {
                    id: 1,
                    question: 'Jaký je hlavní cíl objektově orientovaného programování?',
                    answer_a: 'Zrychlení výpočtů',
                    answer_b: 'Zapouzdření dat a funkcí do objektů',
                    answer_c: 'Snížení spotřeby paměti',
                    correct_answer: 'B',
                    explanation: 'OOP umožňuje zapouzdření dat a funkcí do objektů, což zvyšuje modularitu a znovupoužitelnost kódu.'
                },
                {
                    id: 2,
                    question: 'Co je to polymorfismus?',
                    answer_a: 'Možnost objektu mít více podob',
                    answer_b: 'Dědičnost mezi třídami',
                    answer_c: 'Skrývání implementačních detailů',
                    correct_answer: 'A',
                    explanation: 'Polymorfismus umožňuje objektům různých tříd být používány stejným způsobem prostřednictvím společného rozhraní.'
                },
                {
                    id: 3,
                    question: 'Jaký je rozdíl mezi třídou a objektem?',
                    answer_a: 'Žádný rozdíl',
                    answer_b: 'Třída je šablona, objekt je instance',
                    answer_c: 'Objekt je rychlejší než třída',
                    correct_answer: 'B',
                    explanation: 'Třída definuje vlastnosti a metody, zatímco objekt je konkrétní instance této třídy s konkrétními hodnotami.'
                }
            ],
            'Databáze': [
                {
                    id: 4,
                    question: 'Co znamená SQL?',
                    answer_a: 'Structured Query Language',
                    answer_b: 'Simple Query Language',
                    answer_c: 'Standard Query Language',
                    correct_answer: 'A',
                    explanation: 'SQL je zkratka pro Structured Query Language - strukturovaný dotazovací jazyk pro práci s databázemi.'
                },
                {
                    id: 5,
                    question: 'Co je to primární klíč?',
                    answer_a: 'Nejdůležitější sloupec',
                    answer_b: 'Unikátní identifikátor záznamu',
                    answer_c: 'První sloupec v tabulce',
                    correct_answer: 'B',
                    explanation: 'Primární klíč jednoznačně identifikuje každý záznam v tabulce a nemůže obsahovat duplicitní nebo prázdné hodnoty.'
                }
            ]
        };
        
        this.init();
    }
    
    async init() {
        Logger.system('QuizModule initializing...');
        
        // Check authentication
        await this.checkAuthentication();
        
        // Load settings
        this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load available tables
        this.loadAvailableTables();
        
        // Update UI
        this.updateUI();
        
        Logger.success('QuizModule initialized successfully');
    }
    
    async checkAuthentication() {
        // Check if user is logged in (from auth module or previous session)
        const currentUser = this.getCurrentUser();
        
        if (currentUser) {
            this.currentUser = currentUser;
            Logger.info('User authenticated', { user: currentUser });
        } else {
            // Redirect to auth module if not authenticated
            Logger.warning('User not authenticated, redirecting to auth');
            const shouldRedirect = confirm('Pro použití kvízu se musíte přihlásit. Chcete přejít na přihlášení?');
            if (shouldRedirect) {
                window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                return;
            }
        }
        
        this.updateUserDisplay();
    }
    
    getCurrentUser() {
        // Try to get current user from various sources
        
        // 1. URL parameter (from auth redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const userFromUrl = urlParams.get('user');
        if (userFromUrl) {
            return userFromUrl;
        }
        
        // 2. Session storage
        const userFromSession = sessionStorage.getItem('currentUser');
        if (userFromSession) {
            return userFromSession;
        }
        
        // 3. Local storage (remember me)
        const savedCredentials = localStorage.getItem('modular_quiz_credentials');
        if (savedCredentials) {
            try {
                const credentials = JSON.parse(savedCredentials);
                return credentials.username;
            } catch (e) {
                Logger.warning('Failed to parse saved credentials', e);
            }
        }
        
        // 4. Legacy quiz app storage
        const lastUser = this.loadFromStorage('last_user');
        if (lastUser && lastUser.username) {
            return lastUser.username;
        }
        
        return null;
    }
    
    updateUserDisplay() {
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            if (this.currentUser) {
                userDisplay.textContent = `👤 ${this.currentUser}`;
            } else {
                userDisplay.textContent = '👤 Nepřihlášen';
            }
        }
    }
    
    loadSettings() {
        const saved = this.loadFromStorage('quiz_settings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
        }
    }
    
    saveSettings() {
        this.saveToStorage('quiz_settings', this.settings);
    }
    
    loadAvailableTables() {
        const tableSelect = document.getElementById('tableSelect');
        if (!tableSelect) return;
        
        // Clear existing options except the first one
        while (tableSelect.children.length > 1) {
            tableSelect.removeChild(tableSelect.lastChild);
        }
        
        // Add demo tables
        Object.keys(this.demoQuestions).forEach(tableName => {
            const option = document.createElement('option');
            option.value = tableName;
            option.textContent = `📚 ${tableName} (${this.demoQuestions[tableName].length} otázek)`;
            tableSelect.appendChild(option);
        });
        
        // Try to load from server if available
        if (this.settings.backendMode === 'server') {
            this.loadServerTables();
        }
        
        Logger.info('Available tables loaded', { 
            demoTables: Object.keys(this.demoQuestions).length 
        });
    }
    
    async loadServerTables() {
        try {
            const response = await APIClient.get('/api/tables');
            if (response.success && response.data) {
                const tableSelect = document.getElementById('tableSelect');
                
                response.data.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table.name;
                    option.textContent = `🌐 ${table.name} (${table.question_count || 0} otázek)`;
                    tableSelect.appendChild(option);
                });
                
                Logger.success('Server tables loaded', { count: response.data.length });
            }
        } catch (error) {
            Logger.warning('Failed to load server tables', error);
        }
    }
    
    setupEventListeners() {
        // Table selection
        const tableSelect = document.getElementById('tableSelect');
        tableSelect?.addEventListener('change', (e) => {
            this.selectTable(e.target.value);
        });
        
        // Quiz controls
        document.getElementById('startQuizBtn')?.addEventListener('click', () => {
            this.startQuiz();
        });
        
        document.getElementById('endQuizBtn')?.addEventListener('click', () => {
            this.endQuiz();
        });
        
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showSettings();
        });
        
        // Navigation
        document.getElementById('prevBtn')?.addEventListener('click', () => {
            this.prevQuestion();
        });
        
        document.getElementById('nextBtn')?.addEventListener('click', () => {
            this.nextQuestion();
        });
        
        document.getElementById('randomBtn')?.addEventListener('click', () => {
            this.randomQuestion();
        });
        
        // Answer buttons
        ['A', 'B', 'C'].forEach(letter => {
            const btn = document.getElementById(`answer${letter}`);
            btn?.addEventListener('click', () => {
                this.checkAnswer(letter);
            });
        });
        
        // Other controls
        document.getElementById('hintToggle')?.addEventListener('click', () => {
            this.toggleHint();
        });
        
        document.getElementById('markIncorrectBtn')?.addEventListener('click', () => {
            this.markIncorrect();
        });
        
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        
        // Settings form
        document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettingsFromForm();
        });
        
        // Results actions
        document.getElementById('restartQuizBtn')?.addEventListener('click', () => {
            this.restartQuiz();
        });
        
        document.getElementById('newQuizBtn')?.addEventListener('click', () => {
            this.newQuiz();
        });
        
        document.getElementById('viewStatsBtn')?.addEventListener('click', () => {
            this.showDetailedStats();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Font size ranges
        document.getElementById('questionFontSize')?.addEventListener('input', (e) => {
            this.updateFontSizeDisplay('question', e.target.value);
        });
        
        document.getElementById('answerFontSize')?.addEventListener('input', (e) => {
            this.updateFontSizeDisplay('answer', e.target.value);
        });
        
        Logger.debug('Event listeners setup complete');
    }
    
    selectTable(tableName) {
        if (!tableName) {
            this.currentTable = null;
            this.updateUI();
            return;
        }
        
        this.currentTable = tableName;
        Logger.action('Table selected', { table: tableName });
        
        // Update UI
        this.updateUI();
        
        this.showNotification(`Vybrána tabulka: ${tableName}`, 'info');
    }
    
    async startQuiz() {
        if (!this.currentTable || !this.currentUser) {
            this.showNotification('Vyberte tabulku a přihlaste se', 'error');
            return;
        }
        
        Logger.action('Starting quiz', { 
            table: this.currentTable,
            user: this.currentUser 
        });
        
        // Load questions
        try {
            await this.loadQuestions();
            
            if (this.questions.length === 0) {
                this.showNotification('Žádné otázky nenalezeny', 'error');
                return;
            }
            
            // Reset quiz state
            this.resetQuizState();
            
            // Start quiz
            this.isQuizActive = true;
            this.currentQuestionIndex = -1;
            this.nextQuestion();
            
            // Update UI
            this.updateUI();
            
            this.showNotification(`Kvíz spuštěn: ${this.questions.length} otázek`, 'success');
            
        } catch (error) {
            Logger.error('Failed to start quiz', error);
            this.showNotification(`Chyba při spouštění kvízu: ${error.message}`, 'error');
        }
    }
    
    async loadQuestions() {
        this.questions = [];
        
        // Try server first if available
        if (this.settings.backendMode === 'server') {
            try {
                const response = await APIClient.get(`/api/questions/${this.currentTable}`);
                if (response.success && response.data) {
                    this.questions = response.data.map(q => ({
                        id: q.id,
                        question: q.otazka || q.question,
                        answer_a: q.odpoved_a || q.answer_a,
                        answer_b: q.odpoved_b || q.answer_b,
                        answer_c: q.odpoved_c || q.answer_c,
                        correct_answer: q.spravna_odpoved || q.correct_answer,
                        explanation: q.vysvetleni || q.explanation || 'Bez vysvětlení'
                    }));
                    
                    Logger.success('Questions loaded from server', { count: this.questions.length });
                    return;
                }
            } catch (error) {
                Logger.warning('Server questions failed, using demo data', error);
            }
        }
        
        // Fallback to demo data
        if (this.demoQuestions[this.currentTable]) {
            this.questions = [...this.demoQuestions[this.currentTable]];
            Logger.info('Questions loaded from demo data', { count: this.questions.length });
        }
        
        // Apply filters and shuffling
        this.applyQuestionFilters();
    }
    
    applyQuestionFilters() {
        let filteredQuestions = [...this.questions];
        
        // Filter by mode
        const mode = document.getElementById('questionMode')?.value || 'normal';
        
        switch (mode) {
            case 'unanswered':
                // Filter out answered questions (from user history)
                const answeredIds = this.getAnsweredQuestionIds();
                filteredQuestions = filteredQuestions.filter(q => !answeredIds.includes(q.id));
                break;
                
            case 'wrong':
                // Show only previously wrong answers
                const wrongIds = this.getWrongQuestionIds();
                filteredQuestions = filteredQuestions.filter(q => wrongIds.includes(q.id));
                break;
                
            case 'random':
                // Random subset (50% of questions)
                const count = Math.max(1, Math.floor(filteredQuestions.length * 0.5));
                filteredQuestions = this.shuffleArray(filteredQuestions).slice(0, count);
                break;
        }
        
        // Shuffle if enabled
        if (this.settings.randomOrder) {
            filteredQuestions = this.shuffleArray(filteredQuestions);
        }
        
        this.questions = filteredQuestions;
        Logger.info('Question filters applied', { 
            mode, 
            finalCount: this.questions.length 
        });
    }
    
    resetQuizState() {
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.wrongAnswers.clear();
        this.answeredCurrent = false;
        this.currentQuestionIndex = -1;
    }
    
    displayQuestion() {
        if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
            this.endQuiz();
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;
        
        // Reset answer state
        this.answeredCurrent = false;
        
        // Display question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question;
        }
        
        // Display answers
        const answers = ['A', 'B', 'C'];
        const answerKeys = ['answer_a', 'answer_b', 'answer_c'];
        
        answers.forEach((letter, index) => {
            const answerBtn = document.getElementById(`answer${letter}`);
            const answerText = answerBtn?.querySelector('.answer-text');
            
            if (answerBtn && answerText) {
                answerText.textContent = question[answerKeys[index]] || '';
                answerBtn.disabled = false;
                answerBtn.className = 'answer-option';
            }
        });
        
        // Shuffle answers if enabled
        if (this.settings.shuffleAnswers) {
            this.shuffleCurrentQuestionAnswers();
        }
        
        // Hide explanation
        this.hideExplanation();
        
        // Update counters
        this.updateQuestionCounter();
        
        // Update font sizes
        this.updateFontSizes();
        
        Logger.debug('Question displayed', { 
            index: this.currentQuestionIndex,
            question: question.question.substring(0, 50) + '...'
        });
    }
    
    shuffleCurrentQuestionAnswers() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question || question._shuffled) return;
        
        const answers = [
            { letter: 'A', text: question.answer_a, isCorrect: question.correct_answer === 'A' },
            { letter: 'B', text: question.answer_b, isCorrect: question.correct_answer === 'B' },
            { letter: 'C', text: question.answer_c, isCorrect: question.correct_answer === 'C' }
        ];
        
        const shuffled = this.shuffleArray(answers);
        
        // Update display and store mapping
        shuffled.forEach((answer, index) => {
            const letter = ['A', 'B', 'C'][index];
            const answerBtn = document.getElementById(`answer${letter}`);
            const answerText = answerBtn?.querySelector('.answer-text');
            
            if (answerText) {
                answerText.textContent = answer.text;
            }
            
            if (answer.isCorrect) {
                question._correctShuffledAnswer = letter;
            }
        });
        
        question._shuffled = true;
        question._shuffledAnswers = shuffled;
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            this.showNotification('Jste na poslední otázce', 'info');
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        } else {
            this.showNotification('Jste na první otázce', 'info');
        }
    }
    
    randomQuestion() {
        if (this.questions.length > 0) {
            this.currentQuestionIndex = Math.floor(Math.random() * this.questions.length);
            this.displayQuestion();
        }
    }
    
    checkAnswer(selectedLetter) {
        if (this.answeredCurrent || !this.questions || this.currentQuestionIndex < 0) {
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;
        
        // Determine correct answer (considering shuffling)
        let correctLetter;
        if (question._shuffled && question._correctShuffledAnswer) {
            correctLetter = question._correctShuffledAnswer;
        } else {
            correctLetter = question.correct_answer;
        }
        
        const isCorrect = selectedLetter === correctLetter;
        
        // Update answer buttons
        this.updateAnswerButtons(selectedLetter, correctLetter, isCorrect);
        
        // Update scores
        if (isCorrect) {
            this.scoreCorrect++;
            this.showNotification('Správná odpověď! 🎉', 'success');
        } else {
            this.scoreWrong++;
            this.wrongAnswers.add(question.id);
            this.showNotification(`Špatná odpověď. Správně: ${correctLetter}`, 'error');
        }
        
        this.answeredCurrent = true;
        
        // Save answer to user history
        this.saveAnswerToHistory(question.id, selectedLetter, isCorrect);
        
        // Show explanation
        this.showExplanation(question.explanation);
        
        // Update UI
        this.updateScore();
        this.updateProgress();
        
        // Auto-next if enabled
        if (this.settings.autoNext) {
            setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        }
        
        Logger.action('Answer checked', {
            question: question.id,
            selected: selectedLetter,
            correct: correctLetter,
            isCorrect
        });
    }
    
    updateAnswerButtons(selectedLetter, correctLetter, isCorrect) {
        ['A', 'B', 'C'].forEach(letter => {
            const btn = document.getElementById(`answer${letter}`);
            if (!btn) return;
            
            btn.disabled = true;
            
            if (letter === selectedLetter) {
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
            } else if (letter === correctLetter) {
                btn.classList.add('correct');
            }
        });
    }
    
    showExplanation(explanation) {
        const panel = document.getElementById('explanationPanel');
        const text = document.getElementById('explanationText');
        
        if (panel && text) {
            text.textContent = explanation || 'Bez vysvětlení';
            panel.style.display = 'block';
        }
    }
    
    hideExplanation() {
        const panel = document.getElementById('explanationPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
    
    updateScore() {
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Správně: ${this.scoreCorrect} | Špatně: ${this.scoreWrong}`;
        }
    }
    
    updateQuestionCounter() {
        const counter = document.getElementById('questionCounter');
        if (counter) {
            const current = this.currentQuestionIndex + 1;
            const total = this.questions.length;
            counter.textContent = `Otázka: ${current}/${total}`;
        }
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill && this.questions.length > 0) {
            const totalAnswered = this.scoreCorrect + this.scoreWrong;
            const percentage = (totalAnswered / this.questions.length) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    endQuiz() {
        if (!this.isQuizActive) return;
        
        this.isQuizActive = false;
        
        Logger.action('Quiz ended', {
            table: this.currentTable,
            correct: this.scoreCorrect,
            wrong: this.scoreWrong,
            total: this.questions.length
        });
        
        // Save final results
        this.saveFinalResults();
        
        // Show results
        this.showResults();
        
        // Update UI
        this.updateUI();
        
        this.showNotification('Kvíz ukončen', 'info');
    }
    
    showResults() {
        const setupSection = document.getElementById('quizSetup');
        const interfaceSection = document.getElementById('quizInterface');
        const resultsSection = document.getElementById('resultsSummary');
        
        if (setupSection) setupSection.style.display = 'none';
        if (interfaceSection) interfaceSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
        
        // Update results display
        const finalCorrect = document.getElementById('finalCorrect');
        const finalWrong = document.getElementById('finalWrong');
        const finalAccuracy = document.getElementById('finalAccuracy');
        
        if (finalCorrect) finalCorrect.textContent = this.scoreCorrect;
        if (finalWrong) finalWrong.textContent = this.scoreWrong;
        
        if (finalAccuracy) {
            const total = this.scoreCorrect + this.scoreWrong;
            const accuracy = total > 0 ? Math.round((this.scoreCorrect / total) * 100) : 0;
            finalAccuracy.textContent = `${accuracy}%`;
        }
    }
    
    restartQuiz() {
        Logger.action('Restarting quiz');
        this.resetQuizState();
        this.startQuiz();
    }
    
    newQuiz() {
        Logger.action('Starting new quiz');
        this.resetQuizState();
        this.currentTable = null;
        this.updateUI();
        
        // Show setup section
        const setupSection = document.getElementById('quizSetup');
        const interfaceSection = document.getElementById('quizInterface');
        const resultsSection = document.getElementById('resultsSummary');
        
        if (setupSection) setupSection.style.display = 'block';
        if (interfaceSection) interfaceSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        
        // Reset table selection
        const tableSelect = document.getElementById('tableSelect');
        if (tableSelect) tableSelect.selectedIndex = 0;
    }
    
    showDetailedStats() {
        // Show detailed statistics (to be implemented)
        const stats = this.getUserStats();
        alert(`Detailní statistiky:\n\nCelkem správně: ${stats.totalCorrect}\nCelkem špatně: ${stats.totalWrong}\nÚspěšnost: ${stats.accuracy}%`);
    }
    
    updateUI() {
        const hasTable = !!this.currentTable;
        const isLoggedIn = !!this.currentUser;
        
        // Update button states
        const startBtn = document.getElementById('startQuizBtn');
        const endBtn = document.getElementById('endQuizBtn');
        
        if (startBtn) {
            startBtn.disabled = !hasTable || !isLoggedIn || this.isQuizActive;
        }
        
        if (endBtn) {
            endBtn.disabled = !this.isQuizActive;
        }
        
        // Show/hide sections based on quiz state
        const setupSection = document.getElementById('quizSetup');
        const interfaceSection = document.getElementById('quizInterface');
        
        if (this.isQuizActive) {
            if (setupSection) setupSection.style.display = 'none';
            if (interfaceSection) interfaceSection.style.display = 'block';
        } else {
            if (setupSection) setupSection.style.display = 'block';
            if (interfaceSection) interfaceSection.style.display = 'none';
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const randomBtn = document.getElementById('randomBtn');
        
        const hasQuestions = this.questions.length > 0 && this.isQuizActive;
        
        if (prevBtn) prevBtn.disabled = !hasQuestions || this.currentQuestionIndex <= 0;
        if (nextBtn) nextBtn.disabled = !hasQuestions || this.currentQuestionIndex >= this.questions.length - 1;
        if (randomBtn) randomBtn.disabled = !hasQuestions;
    }
    
    // Settings and preferences
    showSettings() {
        this.loadSettingsToForm();
        this.showModal('settingsModal');
    }
    
    loadSettingsToForm() {
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        // Font sizes
        const questionFontSize = form.querySelector('#questionFontSize');
        const answerFontSize = form.querySelector('#answerFontSize');
        
        if (questionFontSize) {
            questionFontSize.value = this.settings.maxQuestionFontSize;
            this.updateFontSizeDisplay('question', this.settings.maxQuestionFontSize);
        }
        
        if (answerFontSize) {
            answerFontSize.value = this.settings.maxAnswerFontSize;
            this.updateFontSizeDisplay('answer', this.settings.maxAnswerFontSize);
        }
        
        // Checkboxes
        const checkboxes = ['shuffleAnswers', 'showHints', 'autoNext'];
        checkboxes.forEach(id => {
            const checkbox = form.querySelector(`#${id}`);
            if (checkbox) {
                checkbox.checked = this.settings[id];
            }
        });
        
        // Select boxes
        const backendMode = form.querySelector('#backendMode');
        const serverUrl = form.querySelector('#serverUrl');
        
        if (backendMode) backendMode.value = this.settings.backendMode;
        if (serverUrl) serverUrl.value = this.settings.serverUrl;
    }
    
    saveSettingsFromForm() {
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        // Font sizes
        const questionFontSize = form.querySelector('#questionFontSize');
        const answerFontSize = form.querySelector('#answerFontSize');
        
        if (questionFontSize) this.settings.maxQuestionFontSize = parseInt(questionFontSize.value);
        if (answerFontSize) this.settings.maxAnswerFontSize = parseInt(answerFontSize.value);
        
        // Checkboxes
        const checkboxes = ['shuffleAnswers', 'showHints', 'autoNext'];
        checkboxes.forEach(id => {
            const checkbox = form.querySelector(`#${id}`);
            if (checkbox) {
                this.settings[id] = checkbox.checked;
            }
        });
        
        // Select boxes
        const backendMode = form.querySelector('#backendMode');
        const serverUrl = form.querySelector('#serverUrl');
        
        if (backendMode) this.settings.backendMode = backendMode.value;
        if (serverUrl) this.settings.serverUrl = serverUrl.value.trim();
        
        // Save settings
        this.saveSettings();
        
        // Update API client if needed
        if (this.settings.backendMode === 'server') {
            APIClient.updateBaseUrl(this.settings.serverUrl);
        }
        
        // Apply font sizes
        this.updateFontSizes();
        
        // Close modal
        this.closeModal('settingsModal');
        
        this.showNotification('Nastavení uloženo', 'success');
        
        Logger.action('Settings saved', this.settings);
    }
    
    updateFontSizeDisplay(type, value) {
        const display = document.getElementById(`${type}FontDisplay`);
        if (display) {
            display.textContent = `${value}px`;
        }
    }
    
    updateFontSizes() {
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.style.fontSize = `${this.settings.maxQuestionFontSize}px`;
        }
        
        document.querySelectorAll('.answer-text').forEach(el => {
            el.style.fontSize = `${this.settings.maxAnswerFontSize}px`;
        });
    }
    
    // Hint functionality
    toggleHint() {
        const hintDisplay = document.getElementById('hintDisplay');
        const hintToggle = document.getElementById('hintToggle');
        
        if (!hintDisplay || !this.settings.showHints) {
            this.showNotification('Nápovědy jsou zakázané v nastavení', 'warning');
            return;
        }
        
        const isVisible = hintDisplay.style.display !== 'none';
        hintDisplay.style.display = isVisible ? 'none' : 'block';
        
        if (hintToggle) {
            hintToggle.textContent = isVisible ? '💡 Nápověda' : '💡 Skrýt nápovědu';
        }
    }
    
    markIncorrect() {
        if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
            const question = this.questions[this.currentQuestionIndex];
            
            // Save to incorrect questions list
            const incorrectQuestions = this.loadFromStorage('incorrect_questions') || [];
            incorrectQuestions.push({
                id: question.id,
                question: question.question,
                table: this.currentTable,
                timestamp: new Date().toISOString(),
                user: this.currentUser
            });
            
            this.saveToStorage('incorrect_questions', incorrectQuestions);
            
            this.showNotification('Otázka označena jako chybná', 'info');
            Logger.action('Question marked incorrect', { questionId: question.id });
        }
    }
    
    // Keyboard handling
    handleKeyboard(e) {
        if (!this.isQuizActive || this.answeredCurrent) return;
        
        switch (e.key.toLowerCase()) {
            case 'a':
                this.checkAnswer('A');
                break;
            case 'b':
                this.checkAnswer('B');
                break;
            case 'c':
                this.checkAnswer('C');
                break;
            case 'arrowleft':
                e.preventDefault();
                this.prevQuestion();
                break;
            case 'arrowright':
            case ' ':
                e.preventDefault();
                this.nextQuestion();
                break;
            case 'r':
                e.preventDefault();
                this.randomQuestion();
                break;
        }
    }
    
    // User management
    logout() {
        const confirmed = confirm('Opravdu se chcete odhlásit?');
        if (!confirmed) return;
        
        Logger.action('User logout', { user: this.currentUser });
        
        // Clear user data
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        
        // End current quiz
        if (this.isQuizActive) {
            this.endQuiz();
        }
        
        // Redirect to auth
        window.location.href = '../auth/login.html';
    }
    
    // Data persistence
    saveAnswerToHistory(questionId, selectedAnswer, isCorrect) {
        if (!this.currentUser) return;
        
        const history = this.loadFromStorage('user_answer_history') || {};
        if (!history[this.currentUser]) {
            history[this.currentUser] = [];
        }
        
        history[this.currentUser].push({
            questionId,
            table: this.currentTable,
            selectedAnswer,
            isCorrect,
            timestamp: new Date().toISOString()
        });
        
        this.saveToStorage('user_answer_history', history);
    }
    
    saveFinalResults() {
        if (!this.currentUser) return;
        
        const results = this.loadFromStorage('quiz_results') || {};
        if (!results[this.currentUser]) {
            results[this.currentUser] = [];
        }
        
        results[this.currentUser].push({
            table: this.currentTable,
            scoreCorrect: this.scoreCorrect,
            scoreWrong: this.scoreWrong,
            totalQuestions: this.questions.length,
            accuracy: this.scoreCorrect / (this.scoreCorrect + this.scoreWrong) * 100,
            timestamp: new Date().toISOString(),
            duration: this.getQuizDuration()
        });
        
        this.saveToStorage('quiz_results', results);
        
        // Also update user totals (for compatibility)
        this.updateUserTotals();
    }
    
    updateUserTotals() {
        const users = this.loadFromStorage('users') || {};
        if (!users[this.currentUser]) {
            users[this.currentUser] = {
                totalCorrect: 0,
                totalWrong: 0
            };
        }
        
        users[this.currentUser].totalCorrect += this.scoreCorrect;
        users[this.currentUser].totalWrong += this.scoreWrong;
        
        this.saveToStorage('users', users);
    }
    
    getUserStats() {
        if (!this.currentUser) {
            return { totalCorrect: 0, totalWrong: 0, accuracy: 0 };
        }
        
        const users = this.loadFromStorage('users') || {};
        const user = users[this.currentUser] || { totalCorrect: 0, totalWrong: 0 };
        
        const total = user.totalCorrect + user.totalWrong;
        const accuracy = total > 0 ? Math.round((user.totalCorrect / total) * 100) : 0;
        
        return {
            totalCorrect: user.totalCorrect,
            totalWrong: user.totalWrong,
            accuracy
        };
    }
    
    getAnsweredQuestionIds() {
        if (!this.currentUser) return [];
        
        const history = this.loadFromStorage('user_answer_history') || {};
        const userHistory = history[this.currentUser] || [];
        
        return userHistory
            .filter(entry => entry.table === this.currentTable)
            .map(entry => entry.questionId);
    }
    
    getWrongQuestionIds() {
        if (!this.currentUser) return [];
        
        const history = this.loadFromStorage('user_answer_history') || {};
        const userHistory = history[this.currentUser] || [];
        
        return userHistory
            .filter(entry => entry.table === this.currentTable && !entry.isCorrect)
            .map(entry => entry.questionId);
    }
    
    getQuizDuration() {
        // Simple duration calculation - could be improved with actual start time tracking
        return Math.floor(Math.random() * 300) + 60; // Random 1-5 minutes for now
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
    
    showModal(modalId) {
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
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
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
    
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            Logger.warning(`Failed to load from storage: ${key}`, error);
            return null;
        }
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            Logger.warning(`Failed to save to storage: ${key}`, error);
        }
    }
}

// Global modal close function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const quizModule = new QuizModule();
    window.quizModule = quizModule; // Make globally available
    
    Logger.success('Quiz module loaded successfully');
});

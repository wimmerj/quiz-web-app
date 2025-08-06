/**
 * Oral Exam Module - Advanced Voice-Based Quiz System
 * Features: Speech Recognition, Text-to-Speech, Voice Analysis, Real-time Feedback
 */

class OralExamModule {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.examState = {
            isActive: false,
            isPaused: false,
            currentQuestion: 0,
            questions: [],
            answers: [],
            startTime: null,
            endTime: null,
            timeLimit: 15, // minutes
            timer: null
        };
        
        // Speech Recognition & Synthesis
        this.speechRecognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.voices = [];
        this.isRecording = false;
        this.isProcessing = false;
        
        // Voice Analysis
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.canvas = null;
        this.canvasContext = null;
        
        // Settings
        this.settings = {
            speech: {
                language: 'cs-CZ',
                rate: 1,
                pitch: 1,
                volume: 0.8,
                voice: null,
                autoRead: true,
                readFeedback: true,
                pauseBetween: 2
            },
            recognition: {
                language: 'cs-CZ',
                continuous: true,
                interimResults: true,
                maxAlternatives: 3,
                confidenceThreshold: 0.7
            },
            evaluation: {
                mode: 'fuzzy', // strict, fuzzy, semantic
                similarityThreshold: 0.8,
                ignoreCase: true,
                ignorePunctuation: true,
                allowPartialCredit: true
            },
            interface: {
                showWaveform: true,
                showConfidence: true,
                feedbackDetail: 'detailed',
                animationSpeed: 'normal'
            }
        };
        
        // Demo data for offline mode
        this.demoQuestions = [
            {
                id: 1,
                question: "Co je JavaScript?",
                correctAnswer: "JavaScript je programovací jazyk používaný pro vývoj webových aplikací",
                explanation: "JavaScript je vysokoúrovňový, interpretovaný programovací jazyk, který se používá pro vytváření interaktivních webových stránek.",
                difficulty: "easy",
                category: "Základy"
            },
            {
                id: 2,
                question: "Vysvětlete rozdíl mezi var, let a const v JavaScriptu.",
                correctAnswer: "var má function scope, let a const mají block scope, const je konstantní",
                explanation: "var má funkční dosah, let a const mají blokový dosah. const navíc neumožňuje změnu hodnoty po inicializaci.",
                difficulty: "medium",
                category: "Proměnné"
            },
            {
                id: 3,
                question: "Co je to closure v JavaScriptu a jak funguje?",
                correctAnswer: "Closure je funkce která má přístup k proměnným z vnějšího dosahu i po skončení této funkce",
                explanation: "Closure umožňuje funkcím přistupovat k proměnným ze svého lexikálního dosahu i poté, co se vnější funkce ukončí.",
                difficulty: "hard",
                category: "Pokročilé"
            }
        ];
        
        console.log('✅ OralExamModule constructor completed');
        
        // 🧪 DEBUG: Log that changes are loaded
        console.log('🧪 ORAL EXAM MODULE v2.0 - JavaScript changes loaded successfully!');
    }

    async initialize() {
        try {
            console.log('🔧 Initializing Oral Exam Module...');
            
            // Initialize user session
            await this.initializeUserSession();
            
            // Setup speech capabilities
            await this.initializeSpeechCapabilities();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load settings
            this.loadSettings();
            
            // Initialize voice visualization
            this.initializeVoiceVisualization();
            
            // Load available tables
            await this.loadAvailableTables();
            
            this.isInitialized = true;
            console.log('✅ Oral Exam Module initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Oral Exam Module:', error);
            this.showNotification('Chyba při inicializaci ústní zkoušky', 'error');
        }
    }

    async initializeUserSession() {
        try {
            // Check authentication using APIClient first
            console.log('🔍 Checking authentication for oral exam...');
            
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                try {
                    console.log('✅ APIClient is authenticated, getting user info...');
                    const userInfo = await window.APIClient.getCurrentUser();
                    console.log('✅ User info received:', userInfo);
                    
                    // Extract username properly from the response
                    if (userInfo && userInfo.username) {
                        this.currentUser = { username: userInfo.username };
                    } else if (userInfo && userInfo.user && userInfo.user.username) {
                        this.currentUser = { username: userInfo.user.username };
                    } else {
                        this.currentUser = { username: 'authenticated_user' }; // fallback
                    }
                    
                    document.getElementById('userDisplay').textContent = `👤 ${this.currentUser.username}`;
                    console.log('✅ User authenticated via APIClient for oral exam', { user: this.currentUser.username });
                    return;
                } catch (error) {
                    console.error('❌ APIClient user info failed in oral exam:', error);
                    console.log('⚠️ APIClient user info failed, trying fallback', error);
                }
            }
            
            // Fallback to old navigation method
            this.currentUser = navigation.getCurrentUser();
            if (this.currentUser) {
                document.getElementById('userDisplay').textContent = `👤 ${this.currentUser.username}`;
            } else {
                // Redirect to auth if not authenticated
                console.log('⚠️ User not authenticated, redirecting to auth');
                const shouldRedirect = confirm('Pro použití ústní zkoušky se musíte přihlásit. Chcete přejít na přihlášení?');
                if (shouldRedirect) {
                    window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.href);
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Failed to initialize user session:', error);
        }
    }

    async initializeSpeechCapabilities() {
        try {
            // Initialize Speech Recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.speechRecognition = new SpeechRecognition();
                
                this.speechRecognition.continuous = this.settings.recognition.continuous;
                this.speechRecognition.interimResults = this.settings.recognition.interimResults;
                this.speechRecognition.lang = this.settings.recognition.language;
                this.speechRecognition.maxAlternatives = this.settings.recognition.maxAlternatives;
                
                this.setupSpeechRecognitionEvents();
                console.log('✅ Speech Recognition initialized');
            } else {
                console.log('⚠️ Speech Recognition not supported');
                this.showNotification('Rozpoznávání řeči není v tomto prohlížeči podporováno', 'warning');
            }
            
            // Initialize Speech Synthesis
            if ('speechSynthesis' in window) {
                this.loadVoices();
                // Voices might load asynchronously
                if (speechSynthesis.onvoiceschanged !== undefined) {
                    speechSynthesis.onvoiceschanged = () => this.loadVoices();
                }
                console.log('✅ Speech Synthesis initialized');
            } else {
                console.log('⚠️ Speech Synthesis not supported');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize speech capabilities:', error);
        }
    }

    loadVoices() {
        this.voices = this.speechSynthesis.getVoices();
        const voiceSelect = document.getElementById('voiceSelect');
        
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">-- Automatický výběr --</option>';
            
            // Filter voices by language
            const langVoices = this.voices.filter(voice => 
                voice.lang.startsWith(this.settings.speech.language.split('-')[0])
            );
            
            langVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                voiceSelect.appendChild(option);
            });
        }
    }

    setupSpeechRecognitionEvents() {
        if (!this.speechRecognition) return;
        
        this.speechRecognition.onstart = () => {
            this.isRecording = true;
            this.updateMicStatus('recording', '🎤 Nahrávání...');
            this.startVoiceVisualization();
        };
        
        this.speechRecognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    this.updateConfidenceLevel(confidence);
                } else {
                    interimTranscript += transcript;
                }
            }
            
            const recognizedText = document.getElementById('recognizedText');
            if (recognizedText) {
                const displayText = finalTranscript || interimTranscript;
                recognizedText.textContent = displayText || 'Mluvte prosím...';
                recognizedText.classList.toggle('empty', !displayText);
            }
            
            if (finalTranscript) {
                this.processFinalTranscript(finalTranscript);
            }
        };
        
        this.speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isRecording = false;
            this.updateMicStatus('error', '❌ Chyba rozpoznávání');
            this.stopVoiceVisualization();
            
            switch (event.error) {
                case 'no-speech':
                    this.showNotification('Žádná řeč nebyla detekována', 'warning');
                    break;
                case 'audio-capture':
                    this.showNotification('Problém s přístupem k mikrofonu', 'error');
                    break;
                case 'not-allowed':
                    this.showNotification('Přístup k mikrofonu byl zamítnut', 'error');
                    break;
                default:
                    this.showNotification(`Chyba rozpoznávání: ${event.error}`, 'error');
            }
        };
        
        this.speechRecognition.onend = () => {
            this.isRecording = false;
            this.updateMicStatus('ready', 'Připraveno k nahrávání');
            this.stopVoiceVisualization();
        };
    }

    setupEventListeners() {
        // 🧪 TESTOVACÍ TLAČÍTKO PRO ORAL EXAM
        document.getElementById('testOralBtn')?.addEventListener('click', () => {
            console.log('🎯 Test button event listener triggered!');
            alert('🎯 Event listener works!');
            this.runOralAPIClientTest();
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (this.examState.isActive) {
                if (confirm('Opravdu se chcete odhlásit během aktivní zkoušky? Váš pokrok bude ztracen.')) {
                    this.endExam();
                    // Use APIClient logout if available
                    if (window.APIClient) {
                        window.APIClient.logout();
                    }
                    navigation.logout();
                }
            } else {
                // Use APIClient logout if available
                if (window.APIClient) {
                    window.APIClient.logout();
                }
                navigation.logout();
            }
        });

        // Exam setup
        document.getElementById('examTableSelect')?.addEventListener('change', this.handleTableSelection.bind(this));
        document.getElementById('startExamBtn')?.addEventListener('click', this.startExam.bind(this));
        document.getElementById('endExamBtn')?.addEventListener('click', this.endExam.bind(this));
        document.getElementById('examSettingsBtn')?.addEventListener('click', () => this.openModal('advancedSettingsModal'));

        // Voice settings
        document.getElementById('speechRate')?.addEventListener('input', this.updateSpeechSettings.bind(this));
        document.getElementById('speechPitch')?.addEventListener('input', this.updateSpeechSettings.bind(this));
        document.getElementById('speechVolume')?.addEventListener('input', this.updateSpeechSettings.bind(this));
        document.getElementById('testSpeechBtn')?.addEventListener('click', this.testSpeech.bind(this));
        document.getElementById('micTestBtn')?.addEventListener('click', this.testMicrophone.bind(this));

        // Exam controls
        document.getElementById('pauseExamBtn')?.addEventListener('click', this.togglePause.bind(this));
        document.getElementById('helpExamBtn')?.addEventListener('click', () => this.openModal('helpModal'));
        document.getElementById('repeatQuestionBtn')?.addEventListener('click', this.repeatQuestion.bind(this));
        document.getElementById('skipQuestionBtn')?.addEventListener('click', this.skipQuestion.bind(this));

        // Voice input
        document.getElementById('micButton')?.addEventListener('click', this.toggleRecording.bind(this));
        document.querySelectorAll('input[name="responseMode"]').forEach(radio => {
            radio.addEventListener('change', this.toggleResponseMode.bind(this));
        });

        // Text input
        document.getElementById('clearTextBtn')?.addEventListener('click', this.clearTextInput.bind(this));
        document.getElementById('speakTextBtn')?.addEventListener('click', this.speakTextInput.bind(this));
        document.getElementById('manualAnswer')?.addEventListener('input', this.updateSubmitButton.bind(this));

        // Answer submission
        document.getElementById('submitAnswerBtn')?.addEventListener('click', this.submitAnswer.bind(this));
        document.getElementById('retryAnswerBtn')?.addEventListener('click', this.retryAnswer.bind(this));
        document.getElementById('nextQuestionBtn')?.addEventListener('click', this.nextQuestion.bind(this));
        document.getElementById('explainAnswerBtn')?.addEventListener('click', this.explainAnswer.bind(this));

        // Results actions
        document.getElementById('retakeExamBtn')?.addEventListener('click', this.retakeExam.bind(this));
        document.getElementById('newExamBtn')?.addEventListener('click', this.newExam.bind(this));
        document.getElementById('exportResultsBtn')?.addEventListener('click', this.exportResults.bind(this));
        document.getElementById('shareResultsBtn')?.addEventListener('click', this.shareResults.bind(this));

        // Advanced settings
        document.getElementById('saveAdvancedSettingsBtn')?.addEventListener('click', this.saveAdvancedSettings.bind(this));
        document.getElementById('resetSettingsBtn')?.addEventListener('click', this.resetSettings.bind(this));

        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', this.switchTab.bind(this));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    async loadAvailableTables() {
        try {
            const tableSelect = document.getElementById('examTableSelect');
            if (!tableSelect) return;

            // Clear existing options
            tableSelect.innerHTML = '<option value="">-- Vyberte tabulku --</option>';

            // Try to load from server first if APIClient is available
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                try {
                    console.log('🔍 Loading oral exam tables from server...');
                    const response = await window.APIClient.get('/api/quiz/tables');
                    console.log('🔍 Server tables response for oral exam:', response);
                    
                    if (response.success && response.data) {
                        response.data.forEach(table => {
                            const option = document.createElement('option');
                            option.value = table.name;
                            option.textContent = `🌐 ${table.name} (${table.question_count || 0} otázek)`;
                            tableSelect.appendChild(option);
                        });
                        
                        console.log('✅ Server tables loaded for oral exam', { count: response.data.length });
                        console.log('✅ Server tables loaded successfully for oral exam');
                        return; // Exit if server data loaded successfully
                    }
                } catch (error) {
                    console.error('❌ Failed to load server tables for oral exam:', error);
                    console.log('⚠️ Failed to load server tables, using demo data', error);
                }
            }

            // Fallback to demo tables
            const demoTables = [
                { id: 'javascript_basics', name: 'JavaScript - Základy' },
                { id: 'web_development', name: 'Webový vývoj' },
                { id: 'algorithms', name: 'Algoritmy a datové struktury' }
            ];

            demoTables.forEach(table => {
                const option = document.createElement('option');
                option.value = table.id;
                option.textContent = `📚 ${table.name}`;
                tableSelect.appendChild(option);
            });

            console.log('Demo tables loaded for oral exam');

        } catch (error) {
            console.error('Failed to load available tables:', error);
            this.showNotification('Nepodařilo se načíst dostupné tabulky', 'error');
        }
    }

    handleTableSelection(event) {
        const selectedTable = event.target.value;
        const startBtn = document.getElementById('startExamBtn');
        
        if (startBtn) {
            startBtn.disabled = !selectedTable;
        }
        
        if (selectedTable) {
            console.log('Table selected:', selectedTable);
        }
    }

    async startExam() {
        try {
            if (!this.validateExamSetup()) return;
            
            console.log('Starting oral exam...');
            
            // Initialize exam state
            this.examState.isActive = true;
            this.examState.isPaused = false;
            this.examState.currentQuestion = 0;
            this.examState.answers = [];
            this.examState.startTime = new Date();
            this.examState.timeLimit = parseInt(document.getElementById('examDuration').value);
            
            // Load questions
            await this.loadExamQuestions();
            
            // Update UI
            this.updateExamUI();
            
            // Start timer
            this.startExamTimer();
            
            // Load first question
            this.loadCurrentQuestion();
            
            this.showNotification('Ústní zkouška byla spuštěna!', 'success');
            
        } catch (error) {
            console.error('Failed to start exam:', error);
            this.showNotification('Nepodařilo se spustit zkoušku', 'error');
        }
    }

    validateExamSetup() {
        const tableSelect = document.getElementById('examTableSelect');
        if (!tableSelect.value) {
            this.showNotification('Vyberte prosím tabulku otázek', 'warning');
            return false;
        }
        
        if (!this.speechRecognition && document.querySelector('input[name="responseMode"]:checked').value === 'voice') {
            this.showNotification('Rozpoznávání řeči není dostupné. Přepněte na textový režim.', 'warning');
            return false;
        }
        
        return true;
    }

    async loadExamQuestions() {
        try {
            const questionCount = parseInt(document.getElementById('questionCount').value);
            const difficulty = document.getElementById('examDifficulty').value;
            
            // For demo, use predefined questions
            let availableQuestions = [...this.demoQuestions];
            
            // Filter by difficulty if specified
            if (difficulty !== 'all') {
                availableQuestions = availableQuestions.filter(q => q.difficulty === difficulty);
            }
            
            // Shuffle and take requested count
            availableQuestions = this.shuffleArray(availableQuestions);
            this.examState.questions = availableQuestions.slice(0, questionCount);
            
            console.log(`Loaded ${this.examState.questions.length} questions for exam`);
            
        } catch (error) {
            console.error('Failed to load exam questions:', error);
            throw error;
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    updateExamUI() {
        // Hide setup, show exam interface
        document.getElementById('examSetup').style.display = 'none';
        document.getElementById('examInterface').style.display = 'block';
        
        // Update buttons
        document.getElementById('startExamBtn').disabled = true;
        document.getElementById('endExamBtn').disabled = false;
        
        // Reset progress
        this.updateProgress();
    }

    loadCurrentQuestion() {
        const question = this.examState.questions[this.examState.currentQuestion];
        if (!question) return;
        
        // Update question display
        document.getElementById('examQuestionText').textContent = question.question;
        
        // Update progress
        this.updateProgress();
        
        // Clear previous answer
        this.clearAnswer();
        
        // Auto-read question if enabled
        if (this.settings.speech.autoRead) {
            setTimeout(() => {
                this.speakText(question.question);
            }, 500);
        }
        
        console.log(`Loaded question ${this.examState.currentQuestion + 1}:`, question.question);
    }

    updateProgress() {
        const current = this.examState.currentQuestion + 1;
        const total = this.examState.questions.length;
        const correct = this.examState.answers.filter(a => a.isCorrect).length;
        const incorrect = this.examState.answers.length - correct;
        
        // Update counters
        document.getElementById('examQuestionCounter').textContent = `Otázka: ${current}/${total}`;
        document.getElementById('examScore').textContent = `🎯 Skóre: ${correct}/${this.examState.answers.length}`;
        
        // Update progress bar
        const progressFill = document.getElementById('examProgressFill');
        if (progressFill) {
            const percentage = ((this.examState.currentQuestion) / total) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }

    startExamTimer() {
        this.examState.timer = setInterval(() => {
            if (this.examState.isPaused) return;
            
            const elapsed = new Date() - this.examState.startTime;
            const remaining = (this.examState.timeLimit * 60 * 1000) - elapsed;
            
            if (remaining <= 0) {
                this.timeUp();
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            document.getElementById('examTimeRemaining').textContent = 
                `⏱️ Zbývá: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    timeUp() {
        clearInterval(this.examState.timer);
        this.showNotification('Čas vypršel! Zkouška byla ukončena.', 'warning');
        this.finishExam();
    }

    togglePause() {
        this.examState.isPaused = !this.examState.isPaused;
        const pauseBtn = document.getElementById('pauseExamBtn');
        
        if (this.examState.isPaused) {
            pauseBtn.textContent = '▶️ Pokračovat';
            pauseBtn.classList.remove('btn-warning');
            pauseBtn.classList.add('btn-success');
            this.showNotification('Zkouška pozastavena', 'info');
        } else {
            pauseBtn.textContent = '⏸️ Pauza';
            pauseBtn.classList.remove('btn-success');
            pauseBtn.classList.add('btn-warning');
            this.showNotification('Zkouška obnovena', 'info');
        }
    }

    repeatQuestion() {
        const question = this.examState.questions[this.examState.currentQuestion];
        if (question) {
            this.speakText(question.question);
        }
    }

    skipQuestion() {
        if (confirm('Opravdu chcete přeskočit tuto otázku? Bude označena jako nesprávná.')) {
            const question = this.examState.questions[this.examState.currentQuestion];
            this.examState.answers.push({
                questionId: question.id,
                question: question.question,
                userAnswer: '',
                correctAnswer: question.correctAnswer,
                isCorrect: false,
                score: 0,
                skipped: true,
                timestamp: new Date()
            });
            
            this.nextQuestion();
        }
    }

    toggleRecording() {
        if (!this.speechRecognition) {
            this.showNotification('Rozpoznávání řeči není dostupné', 'error');
            return;
        }
        
        if (this.examState.isPaused) {
            this.showNotification('Zkouška je pozastavena', 'warning');
            return;
        }
        
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        try {
            this.speechRecognition.start();
            const micButton = document.getElementById('micButton');
            if (micButton) {
                micButton.classList.add('recording');
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showNotification('Nepodařilo se spustit nahrávání', 'error');
        }
    }

    stopRecording() {
        try {
            this.speechRecognition.stop();
            const micButton = document.getElementById('micButton');
            if (micButton) {
                micButton.classList.remove('recording');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }

    updateMicStatus(status, text) {
        const statusElement = document.getElementById('micStatusText');
        const micButton = document.getElementById('micButton');
        
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = `mic-status ${status}`;
        }
        
        if (micButton) {
            micButton.disabled = (status === 'error');
        }
    }

    updateConfidenceLevel(confidence) {
        const confidenceElement = document.getElementById('confidenceLevel');
        if (confidenceElement) {
            const percentage = Math.round(confidence * 100);
            confidenceElement.textContent = `${percentage}%`;
            
            // Color coding
            if (percentage >= 80) {
                confidenceElement.style.color = 'var(--success-color)';
            } else if (percentage >= 60) {
                confidenceElement.style.color = 'var(--warning-color)';
            } else {
                confidenceElement.style.color = 'var(--error-color)';
            }
        }
    }

    processFinalTranscript(transcript) {
        console.log('Final transcript:', transcript);
        
        // Update submit button
        this.updateSubmitButton();
        
        // Auto-submit if confidence is high and answer seems complete
        if (this.settings.interface.autoSubmit && transcript.trim().length > 10) {
            // Add small delay for user to review
            setTimeout(() => {
                if (!this.isProcessing) {
                    this.submitAnswer();
                }
            }, 2000);
        }
    }

    toggleResponseMode() {
        const voiceMode = document.querySelector('input[name="responseMode"][value="voice"]').checked;
        
        document.getElementById('voiceInput').style.display = voiceMode ? 'block' : 'none';
        document.getElementById('textInput').style.display = voiceMode ? 'none' : 'block';
        
        this.updateSubmitButton();
    }

    clearTextInput() {
        document.getElementById('manualAnswer').value = '';
        this.updateSubmitButton();
    }

    speakTextInput() {
        const text = document.getElementById('manualAnswer').value;
        if (text.trim()) {
            this.speakText(text);
        }
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submitAnswerBtn');
        if (!submitBtn) return;
        
        const voiceMode = document.querySelector('input[name="responseMode"][value="voice"]').checked;
        let hasAnswer = false;
        
        if (voiceMode) {
            const recognizedText = document.getElementById('recognizedText').textContent;
            hasAnswer = recognizedText && recognizedText.trim() && !recognizedText.includes('Mluvte prosím');
        } else {
            const manualAnswer = document.getElementById('manualAnswer').value;
            hasAnswer = manualAnswer && manualAnswer.trim();
        }
        
        submitBtn.disabled = !hasAnswer || this.isProcessing;
    }

    async submitAnswer() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.updateSubmitButton();
            
            const voiceMode = document.querySelector('input[name="responseMode"][value="voice"]').checked;
            let userAnswer = '';
            
            if (voiceMode) {
                userAnswer = document.getElementById('recognizedText').textContent.trim();
            } else {
                userAnswer = document.getElementById('manualAnswer').value.trim();
            }
            
            if (!userAnswer) {
                this.showNotification('Zadejte prosím odpověď', 'warning');
                return;
            }
            
            // Evaluate answer
            const result = await this.evaluateAnswer(userAnswer);
            
            // Store answer
            const question = this.examState.questions[this.examState.currentQuestion];
            this.examState.answers.push({
                questionId: question.id,
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: result.isCorrect,
                score: result.score,
                confidence: result.confidence,
                analysis: result.analysis,
                timestamp: new Date()
            });
            
            // Show feedback
            this.showAnswerFeedback(result);
            
            console.log('Answer submitted:', { userAnswer, result });
            
        } catch (error) {
            console.error('Failed to submit answer:', error);
            this.showNotification('Chyba při odesílání odpovědi', 'error');
        } finally {
            this.isProcessing = false;
            this.updateSubmitButton();
        }
    }

    async evaluateAnswer(userAnswer) {
        const question = this.examState.questions[this.examState.currentQuestion];
        const correctAnswer = question.correctAnswer;
        
        let isCorrect = false;
        let score = 0;
        let confidence = 0;
        let analysis = [];
        
        switch (this.settings.evaluation.mode) {
            case 'strict':
                isCorrect = this.strictComparison(userAnswer, correctAnswer);
                break;
            case 'fuzzy':
                const fuzzyResult = this.fuzzyComparison(userAnswer, correctAnswer);
                isCorrect = fuzzyResult.similarity >= this.settings.evaluation.similarityThreshold;
                confidence = fuzzyResult.similarity;
                break;
            case 'semantic':
                // Placeholder for semantic analysis
                const semanticResult = this.semanticComparison(userAnswer, correctAnswer);
                isCorrect = semanticResult.similarity >= this.settings.evaluation.similarityThreshold;
                confidence = semanticResult.similarity;
                break;
        }
        
        // Calculate score
        if (isCorrect) {
            score = 100;
        } else if (this.settings.evaluation.allowPartialCredit) {
            score = Math.round(confidence * 100);
        }
        
        // Generate analysis
        analysis = this.generateAnalysis(userAnswer, correctAnswer, confidence);
        
        return {
            isCorrect,
            score,
            confidence,
            analysis
        };
    }

    strictComparison(userAnswer, correctAnswer) {
        let user = userAnswer;
        let correct = correctAnswer;
        
        if (this.settings.evaluation.ignoreCase) {
            user = user.toLowerCase();
            correct = correct.toLowerCase();
        }
        
        if (this.settings.evaluation.ignorePunctuation) {
            user = user.replace(/[^\w\s]/g, '');
            correct = correct.replace(/[^\w\s]/g, '');
        }
        
        return user.trim() === correct.trim();
    }

    fuzzyComparison(userAnswer, correctAnswer) {
        // Simple fuzzy string matching using Levenshtein distance
        const similarity = this.calculateSimilarity(userAnswer, correctAnswer);
        return { similarity };
    }

    semanticComparison(userAnswer, correctAnswer) {
        // Placeholder - in real implementation, this would use NLP/AI
        // For now, use enhanced fuzzy matching with keyword analysis
        const keywordSimilarity = this.calculateKeywordSimilarity(userAnswer, correctAnswer);
        const structureSimilarity = this.fuzzyComparison(userAnswer, correctAnswer).similarity;
        
        const similarity = (keywordSimilarity + structureSimilarity) / 2;
        return { similarity };
    }

    calculateSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength > 0 ? 1 - (distance / maxLength) : 1;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    calculateKeywordSimilarity(userAnswer, correctAnswer) {
        const userKeywords = this.extractKeywords(userAnswer);
        const correctKeywords = this.extractKeywords(correctAnswer);
        
        if (correctKeywords.length === 0) return 0;
        
        let matches = 0;
        correctKeywords.forEach(keyword => {
            if (userKeywords.some(userKeyword => 
                userKeyword.includes(keyword) || keyword.includes(userKeyword)
            )) {
                matches++;
            }
        });
        
        return matches / correctKeywords.length;
    }

    extractKeywords(text) {
        // Simple keyword extraction - remove common words
        const commonWords = ['je', 'to', 'a', 'v', 'na', 'se', 'za', 'pro', 'do', 'od', 'po', 'při'];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.includes(word));
    }

    generateAnalysis(userAnswer, correctAnswer, confidence) {
        const analysis = [];
        
        if (confidence >= 0.9) {
            analysis.push('Výborná odpověď! Velmi přesně jste zachytili hlavní body.');
        } else if (confidence >= 0.7) {
            analysis.push('Dobrá odpověď. Obsahuje většinu důležitých informací.');
        } else if (confidence >= 0.5) {
            analysis.push('Částečně správná odpověď. Některé body byly správné.');
        } else {
            analysis.push('Odpověď obsahuje několik správných prvků, ale chybí klíčové informace.');
        }
        
        // Analyze keywords
        const userKeywords = this.extractKeywords(userAnswer);
        const correctKeywords = this.extractKeywords(correctAnswer);
        const missingKeywords = correctKeywords.filter(keyword => 
            !userKeywords.some(userKeyword => 
                userKeyword.includes(keyword) || keyword.includes(userKeyword)
            )
        );
        
        if (missingKeywords.length > 0) {
            analysis.push(`Klíčová slova, která chyběla: ${missingKeywords.join(', ')}`);
        }
        
        return analysis;
    }

    showAnswerFeedback(result) {
        const feedbackPanel = document.getElementById('feedbackPanel');
        if (!feedbackPanel) return;
        
        // Update feedback content
        const question = this.examState.questions[this.examState.currentQuestion];
        
        document.getElementById('answerScore').textContent = `${result.score}/100`;
        document.getElementById('userAnswerText').textContent = this.examState.answers[this.examState.answers.length - 1].userAnswer;
        document.getElementById('correctAnswerText').textContent = question.correctAnswer;
        
        // Update analysis
        const feedbackPoints = document.getElementById('feedbackPoints');
        if (feedbackPoints) {
            feedbackPoints.innerHTML = '';
            result.analysis.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                feedbackPoints.appendChild(li);
            });
        }
        
        // Show feedback panel
        feedbackPanel.style.display = 'block';
        feedbackPanel.scrollIntoView({ behavior: 'smooth' });
        
        // Auto-read feedback if enabled
        if (this.settings.speech.readFeedback) {
            setTimeout(() => {
                const feedbackText = `Váš výsledek: ${result.score} bodů. ${result.analysis.join(' ')}`;
                this.speakText(feedbackText);
            }, 1000);
        }
        
        // Update progress
        this.updateProgress();
    }

    retryAnswer() {
        // Clear current answer and allow retry
        this.clearAnswer();
        document.getElementById('feedbackPanel').style.display = 'none';
        
        // Enable input again
        const submitBtn = document.getElementById('submitAnswerBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
        
        this.showNotification('Můžete odpovědět znovu', 'info');
    }

    clearAnswer() {
        // Clear voice input
        const recognizedText = document.getElementById('recognizedText');
        if (recognizedText) {
            recognizedText.textContent = 'Stiskněte mikrofon a začněte mluvit...';
            recognizedText.classList.add('empty');
        }
        
        // Clear text input
        const manualAnswer = document.getElementById('manualAnswer');
        if (manualAnswer) {
            manualAnswer.value = '';
        }
        
        // Clear confidence
        document.getElementById('confidenceLevel').textContent = '--';
        
        // Update submit button
        this.updateSubmitButton();
    }

    nextQuestion() {
        // Hide feedback
        document.getElementById('feedbackPanel').style.display = 'none';
        
        // Move to next question
        this.examState.currentQuestion++;
        
        if (this.examState.currentQuestion >= this.examState.questions.length) {
            this.finishExam();
        } else {
            this.loadCurrentQuestion();
        }
    }

    explainAnswer() {
        const question = this.examState.questions[this.examState.currentQuestion];
        if (question.explanation) {
            this.speakText(question.explanation);
            
            // Show explanation in UI
            alert(`Vysvětlení: ${question.explanation}`);
        }
    }

    async finishExam() {
        try {
            this.examState.isActive = false;
            this.examState.endTime = new Date();
            
            // Stop timer
            if (this.examState.timer) {
                clearInterval(this.examState.timer);
            }
            
            // Stop any recording
            if (this.isRecording) {
                this.stopRecording();
            }
            
            // Calculate final results
            const results = this.calculateExamResults();
            
            // Show results
            this.showExamResults(results);
            
            // Save results
            await this.saveExamResults(results);
            
            console.log('Exam finished with results:', results);
            
        } catch (error) {
            console.error('Failed to finish exam:', error);
        }
    }

    calculateExamResults() {
        const totalQuestions = this.examState.answers.length;
        const correctAnswers = this.examState.answers.filter(a => a.isCorrect).length;
        const totalScore = this.examState.answers.reduce((sum, a) => sum + a.score, 0);
        const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;
        
        const duration = this.examState.endTime - this.examState.startTime;
        const durationMinutes = Math.round(duration / 60000);
        
        // Calculate performance metrics
        const voiceQuality = this.calculateVoiceQuality();
        const clarity = this.calculateClarity();
        const responseSpeed = this.calculateResponseSpeed();
        
        // Determine grade
        let grade = 'F';
        if (averageScore >= 90) grade = 'A';
        else if (averageScore >= 80) grade = 'B';
        else if (averageScore >= 70) grade = 'C';
        else if (averageScore >= 60) grade = 'D';
        else if (averageScore >= 50) grade = 'E';
        
        return {
            totalQuestions,
            correctAnswers,
            accuracy: Math.round((correctAnswers / totalQuestions) * 100),
            averageScore: Math.round(averageScore),
            grade,
            duration: durationMinutes,
            voiceQuality,
            clarity,
            responseSpeed,
            answers: this.examState.answers
        };
    }

    calculateVoiceQuality() {
        // Placeholder - would analyze audio quality metrics
        return Math.round(80 + Math.random() * 20);
    }

    calculateClarity() {
        // Calculate based on recognition confidence
        const confidenceScores = this.examState.answers
            .filter(a => a.confidence)
            .map(a => a.confidence);
        
        if (confidenceScores.length === 0) return 85;
        
        const averageConfidence = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length;
        return Math.round(averageConfidence * 100);
    }

    calculateResponseSpeed() {
        // Placeholder - would calculate average response time
        return Math.round(70 + Math.random() * 30);
    }

    showExamResults(results) {
        // Hide exam interface, show results
        document.getElementById('examInterface').style.display = 'none';
        document.getElementById('examResults').style.display = 'block';
        
        // Update results display
        document.getElementById('overallGrade').textContent = results.grade;
        document.getElementById('totalQuestions').textContent = results.totalQuestions;
        document.getElementById('correctAnswers').textContent = results.correctAnswers;
        document.getElementById('accuracyPercent').textContent = `${results.accuracy}%`;
        document.getElementById('timeSpent').textContent = `${results.duration}:00`;
        
        // Update performance metrics
        document.getElementById('voiceQuality').style.width = `${results.voiceQuality}%`;
        document.getElementById('voiceQualityText').textContent = `${results.voiceQuality}%`;
        
        document.getElementById('clarity').style.width = `${results.clarity}%`;
        document.getElementById('clarityText').textContent = `${results.clarity}%`;
        
        document.getElementById('responseSpeed').style.width = `${results.responseSpeed}%`;
        document.getElementById('responseSpeedText').textContent = `${results.responseSpeed}%`;
        
        // Show detailed question reviews
        this.showDetailedResults(results.answers);
        
        // Scroll to results
        document.getElementById('examResults').scrollIntoView({ behavior: 'smooth' });
    }

    showDetailedResults(answers) {
        const reviewsContainer = document.getElementById('questionReviews');
        if (!reviewsContainer) return;
        
        reviewsContainer.innerHTML = '';
        
        answers.forEach((answer, index) => {
            const reviewDiv = document.createElement('div');
            reviewDiv.className = `question-review ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            reviewDiv.innerHTML = `
                <h5>Otázka ${index + 1}: ${answer.isCorrect ? '✅' : '❌'} (${answer.score}/100)</h5>
                <p><strong>Otázka:</strong> ${answer.question}</p>
                <p><strong>Vaše odpověď:</strong> ${answer.userAnswer || 'Přeskočeno'}</p>
                <p><strong>Správná odpověď:</strong> ${answer.correctAnswer}</p>
                ${answer.analysis ? `<p><strong>Analýza:</strong> ${answer.analysis.join(' ')}</p>` : ''}
            `;
            
            reviewsContainer.appendChild(reviewDiv);
        });
    }

    async saveExamResults(results) {
        try {
            // Save to localStorage for now
            const examData = {
                timestamp: new Date().toISOString(),
                user: this.currentUser?.username || 'Anonymous',
                results: results
            };
            
            const savedResults = JSON.parse(localStorage.getItem('oralExamResults') || '[]');
            savedResults.push(examData);
            localStorage.setItem('oralExamResults', JSON.stringify(savedResults));
            
            console.log('Exam results saved');
            
        } catch (error) {
            console.error('Failed to save exam results:', error);
        }
    }

    endExam() {
        if (!this.examState.isActive) return;
        
        if (confirm('Opravdu chcete ukončit zkoušku? Váš pokrok bude ztracen.')) {
            this.finishExam();
        }
    }

    retakeExam() {
        if (confirm('Chcete opakovat stejnou zkoušku?')) {
            this.resetExamState();
            this.startExam();
        }
    }

    newExam() {
        this.resetExamState();
        
        // Show setup again
        document.getElementById('examResults').style.display = 'none';
        document.getElementById('examSetup').style.display = 'block';
        
        // Reset buttons
        document.getElementById('startExamBtn').disabled = false;
        document.getElementById('endExamBtn').disabled = true;
    }

    resetExamState() {
        // Clear exam state
        this.examState = {
            isActive: false,
            isPaused: false,
            currentQuestion: 0,
            questions: [],
            answers: [],
            startTime: null,
            endTime: null,
            timeLimit: 15,
            timer: null
        };
        
        // Stop any ongoing processes
        if (this.examState.timer) {
            clearInterval(this.examState.timer);
        }
        
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Clear UI
        this.clearAnswer();
        document.getElementById('feedbackPanel').style.display = 'none';
    }

    exportResults() {
        try {
            const savedResults = JSON.parse(localStorage.getItem('oralExamResults') || '[]');
            const dataStr = JSON.stringify(savedResults, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `oral-exam-results-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Výsledky byly exportovány', 'success');
            
        } catch (error) {
            console.error('Failed to export results:', error);
            this.showNotification('Chyba při exportu výsledků', 'error');
        }
    }

    shareResults() {
        if (navigator.share) {
            navigator.share({
                title: 'Výsledky ústní zkoušky',
                text: 'Podívejte se na mé výsledky z ústní zkoušky!',
                url: window.location.href
            });
        } else {
            // Fallback - copy to clipboard
            const text = 'Výsledky ústní zkoušky - zkopírováno do schránky!';
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Odkaz zkopírován do schránky', 'success');
            });
        }
    }

    // Voice Visualization
    initializeVoiceVisualization() {
        this.canvas = document.getElementById('voiceCanvas');
        if (!this.canvas) return;
        
        this.canvasContext = this.canvas.getContext('2d');
        this.setupAudioContext();
    }

    async setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
        } catch (error) {
            console.error('Failed to setup audio context:', error);
        }
    }

    async startVoiceVisualization() {
        if (!this.settings.interface.showWaveform || !this.audioContext) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.drawVisualization();
            
        } catch (error) {
            console.error('Failed to start voice visualization:', error);
        }
    }

    stopVoiceVisualization() {
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        // Clear canvas
        if (this.canvasContext) {
            this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawVisualization() {
        if (!this.isRecording || !this.analyser) return;
        
        requestAnimationFrame(() => this.drawVisualization());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.canvasContext.fillStyle = 'var(--bg-secondary)';
        this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = (this.dataArray[i] / 255) * this.canvas.height;
            
            this.canvasContext.fillStyle = `hsl(${250 + i * 2}, 100%, 50%)`;
            this.canvasContext.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    // Speech functions
    speakText(text) {
        if (!this.speechSynthesis || !text) return;
        
        // Stop any current speech
        this.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.settings.speech.language;
        utterance.rate = this.settings.speech.rate;
        utterance.pitch = this.settings.speech.pitch;
        utterance.volume = this.settings.speech.volume;
        
        if (this.settings.speech.voice) {
            const voice = this.voices.find(v => v.name === this.settings.speech.voice);
            if (voice) utterance.voice = voice;
        }
        
        // Update speech status
        const speechStatus = document.getElementById('speechStatus');
        if (speechStatus) {
            speechStatus.classList.add('speaking');
            document.getElementById('speechStatusText').textContent = 'Přehrávání...';
        }
        
        utterance.onend = () => {
            if (speechStatus) {
                speechStatus.classList.remove('speaking');
                document.getElementById('speechStatusText').textContent = 'Připraveno k přečtení';
            }
        };
        
        this.speechSynthesis.speak(utterance);
    }

    testSpeech() {
        const testText = 'Toto je test hlasového výstupu. Zkouška proběhla úspěšně.';
        this.speakText(testText);
    }

    async testMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.showNotification('Mikrofon funguje správně!', 'success');
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.error('Microphone test failed:', error);
            this.showNotification('Problém s přístupem k mikrofonu', 'error');
        }
    }

    updateSpeechSettings() {
        this.settings.speech.rate = parseFloat(document.getElementById('speechRate').value);
        this.settings.speech.pitch = parseFloat(document.getElementById('speechPitch').value);
        this.settings.speech.volume = parseFloat(document.getElementById('speechVolume').value);
        
        // Update display values
        document.getElementById('speechRateDisplay').textContent = `${this.settings.speech.rate}x`;
        document.getElementById('speechPitchDisplay').textContent = `${this.settings.speech.pitch}x`;
        document.getElementById('speechVolumeDisplay').textContent = `${Math.round(this.settings.speech.volume * 100)}%`;
        
        this.saveSettings();
    }

    // Settings management
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('oralExamSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                Object.assign(this.settings, settings);
                this.applySettings();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('oralExamSettings', JSON.stringify(this.settings));
            console.log('Settings saved');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    applySettings() {
        // Apply speech settings
        document.getElementById('speechRate').value = this.settings.speech.rate;
        document.getElementById('speechPitch').value = this.settings.speech.pitch;
        document.getElementById('speechVolume').value = this.settings.speech.volume;
        
        this.updateSpeechSettings();
        
        // Apply other settings to UI elements
        Object.keys(this.settings).forEach(category => {
            Object.keys(this.settings[category]).forEach(setting => {
                const element = document.getElementById(setting);
                if (element) {
                    const value = this.settings[category][setting];
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        });
    }

    saveAdvancedSettings() {
        // Collect all settings from modal
        const formData = new FormData();
        
        // Speech settings
        this.settings.speech.autoRead = document.getElementById('autoReadQuestions').checked;
        this.settings.speech.readFeedback = document.getElementById('readFeedback').checked;
        this.settings.speech.pauseBetween = parseInt(document.getElementById('pauseBetweenQuestions').value);
        this.settings.speech.voice = document.getElementById('voiceSelect').value;
        
        // Recognition settings
        this.settings.recognition.language = document.getElementById('recognitionLanguage').value;
        this.settings.recognition.continuous = document.getElementById('continuousRecognition').checked;
        this.settings.recognition.interimResults = document.getElementById('interimResults').checked;
        this.settings.recognition.maxAlternatives = parseInt(document.getElementById('maxAlternatives').value);
        this.settings.recognition.confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);
        
        // Evaluation settings
        this.settings.evaluation.mode = document.getElementById('evaluationMode').value;
        this.settings.evaluation.similarityThreshold = parseFloat(document.getElementById('similarityThreshold').value);
        this.settings.evaluation.ignoreCase = document.getElementById('ignoreCase').checked;
        this.settings.evaluation.ignorePunctuation = document.getElementById('ignorePunctuation').checked;
        this.settings.evaluation.allowPartialCredit = document.getElementById('allowPartialCredit').checked;
        
        // Interface settings
        this.settings.interface.showWaveform = document.getElementById('showWaveform').checked;
        this.settings.interface.showConfidence = document.getElementById('showConfidence').checked;
        this.settings.interface.feedbackDetail = document.getElementById('feedbackDetail').value;
        this.settings.interface.animationSpeed = document.getElementById('animationSpeed').value;
        
        this.saveSettings();
        this.applySettings();
        
        this.closeModal('advancedSettingsModal');
        this.showNotification('Nastavení bylo uloženo', 'success');
    }

    resetSettings() {
        if (confirm('Opravdu chcete obnovit všechna nastavení na výchozí hodnoty?')) {
            localStorage.removeItem('oralExamSettings');
            location.reload();
        }
    }

    // Tab management
    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Show target tab and activate button
        document.getElementById(targetTab + 'Tab').classList.add('active');
        event.target.classList.add('active');
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if (!this.examState.isActive) return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.toggleRecording();
                break;
            case 'KeyR':
                if (!event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    this.repeatQuestion();
                }
                break;
            case 'KeyS':
                if (!event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    this.skipQuestion();
                }
                break;
            case 'Enter':
                if (!event.shiftKey) {
                    event.preventDefault();
                    this.submitAnswer();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.togglePause();
                break;
        }
    }

    // Modal management
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

    // Utility functions
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
    
    // 🧪 TESTOVACÍ FUNKCE PRO APIClient - ORAL EXAM
    async runOralAPIClientTest() {
        console.log('🧪 ORAL EXAM TEST BUTTON CLICKED! (v2.0)'); // Debug
        alert('🧪 TEST FUNCTION REACHED! - Oral Exam v2.0'); // Immediate feedback
        
        const testResults = document.getElementById('testOralResults');
        const testOutput = document.getElementById('testOralOutput');
        
        if (!testResults || !testOutput) {
            console.error('❌ Oral exam test elements not found!');
            alert('❌ Oral exam test elements not found!');
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
                            let extractedUsername = 'unknown';
                            if (user && user.username) {
                                extractedUsername = user.username;
                            } else if (user && user.user && user.user.username) {
                                extractedUsername = user.user.username;
                            }
                            output += `<div>👤 Extracted Username: <strong>${extractedUsername}</strong></div>`;
                        } catch (error) {
                            output += `<div>❌ getCurrentUser error: ${error.message}</div>`;
                        }
                    }
                } catch (error) {
                    output += `<div>❌ isAuthenticated error: ${error.message}</div>`;
                }
                
                // Test 5: Try API call - tables
                try {
                    output += `<div>🌐 Testing API call to /api/quiz/tables...</div>`;
                    const tablesResponse = await window.APIClient.get('/api/quiz/tables');
                    output += `<div>✅ Tables response: ${JSON.stringify(tablesResponse, null, 2)}</div>`;
                } catch (error) {
                    output += `<div>❌ Tables API call error: ${error.message}</div>`;
                }
                
                // Test 6: localStorage tokens
                const token = localStorage.getItem('modular_quiz_token');
                output += `<div>🎫 Token in localStorage: ${token ? 'YES (length: ' + token.length + ')' : 'NO'}</div>`;
                
                // Test 7: Current user state in oral exam module
                output += `<div>👨‍🎓 Oral Exam Current User: ${this.currentUser ? this.currentUser.username : 'NULL'}</div>`;
            }
            
        } catch (error) {
            output += `<div>🚨 CRITICAL ERROR: ${error.message}</div>`;
            console.error('🚨 Oral exam test function error:', error);
        }
        
        testOutput.innerHTML = output;
        
        console.log('🧪 ORAL EXAM TEST COMPLETED - Check test results panel');
        alert('🧪 Oral exam test completed! Check results in red panel.');
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
        console.log('🔧 Starting oral exam module initialization...');
        window.oralExamModule = new OralExamModule();
        console.log('🏗️ OralExamModule created:', window.oralExamModule);
        await window.oralExamModule.initialize();
        console.log('✅ Oral Exam Module ready');
    } catch (error) {
        console.error('❌ Failed to initialize Oral Exam Module:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', (event) => {
    if (window.oralExamModule && window.oralExamModule.examState.isActive) {
        event.preventDefault();
        event.returnValue = 'Máte rozdělanou zkoušku. Opravdu chcete stránku opustit?';
        return event.returnValue;
    }
});

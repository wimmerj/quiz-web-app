/**
 * Battle Module - Real-time Multiplayer Quiz System
 * Features: WebSocket connections, Matchmaking, Live battles, Tournaments, Leaderboards
 */

class BattleModule {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.socket = null;
        this.isConnected = false;
        
        // Battle State
        this.battleState = {
            isActive: false,
            mode: null, // 'quick', 'ranked', 'tournament', 'custom'
            battleId: null,
            currentQuestion: 0,
            questions: [],
            players: [],
            myAnswers: [],
            timeRemaining: 0,
            questionTimeLimit: 15,
            questionStartTime: null,
            scores: {},
            isFinished: false
        };
        
        // Matchmaking State
        this.matchmakingState = {
            isSearching: false,
            searchStartTime: null,
            searchTimer: null,
            estimatedWaitTime: 30
        };
        
        // User Stats
        this.userStats = {
            rank: 'Bronze III',
            rating: 1842,
            wins: 23,
            losses: 15,
            winRate: 60.5,
            bestStreak: 7,
            currentStreak: 3
        };
        
        // Demo data for offline mode
        this.demoQuestions = [
            {
                id: 1,
                question: "Jaký je výsledek 2 + 2?",
                answers: ["3", "4", "5"],
                correctAnswer: 1,
                difficulty: "easy",
                timeLimit: 10
            },
            {
                id: 2,
                question: "Kdo napsal 'Romeo a Julie'?",
                answers: ["Charles Dickens", "William Shakespeare", "Jane Austen"],
                correctAnswer: 1,
                difficulty: "medium",
                timeLimit: 15
            },
            {
                id: 3,
                question: "Která planeta je nejblíže Slunci?",
                answers: ["Venuše", "Merkur", "Mars"],
                correctAnswer: 1,
                difficulty: "easy",
                timeLimit: 12
            },
            {
                id: 4,
                question: "Co je JavaScript?",
                answers: ["Programovací jazyk", "Káva", "Framework"],
                correctAnswer: 0,
                difficulty: "medium",
                timeLimit: 15
            },
            {
                id: 5,
                question: "Jaký je hlavní město Francie?",
                answers: ["Lyon", "Marseille", "Paříž"],
                correctAnswer: 2,
                difficulty: "easy",
                timeLimit: 10
            }
        ];
        
        // Demo opponents
        this.demoOpponents = [
            { name: "QuizMaster", rank: "Gold II", rating: 2156, avatar: "🎯" },
            { name: "BrainStorm", rank: "Silver I", rating: 1934, avatar: "🧠" },
            { name: "FastFinger", rank: "Bronze I", rating: 1678, avatar: "⚡" },
            { name: "ThinkTank", rank: "Platinum", rating: 2487, avatar: "💎" }
        ];
        
        // Live feed messages
        this.liveFeedMessages = [];
        
        Logger.info('BattleModule constructor completed');
    }

    async initialize() {
        try {
            Logger.info('Initializing Battle Module...');
            
            // Initialize user session
            await this.checkAuthentication();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize WebSocket connection (simulate for demo)
            await this.initializeConnection();
            
            // Load user stats
            this.loadUserStats();
            
            // Update UI with initial data
            this.updateBattleMenu();
            
            // Initialize server status check
            this.initializeServerStatus();
            
            this.isInitialized = true;
            Logger.info('Battle Module initialized successfully');
            
        } catch (error) {
            Logger.error('Failed to initialize Battle Module:', error);
            this.showNotification('Chyba při inicializaci Battle modulu', 'error');
        }
    }

    async checkAuthentication() {
        // Check if user is logged in (from auth module or previous session)
        
        console.log('🔍 Checking authentication in Battle...');
        console.log('🔍 window.APIClient:', window.APIClient);
        
        // First check APIClient authentication
        if (window.APIClient && window.APIClient.isAuthenticated()) {
            try {
                console.log('✅ APIClient is authenticated, getting user info...');
                const userInfo = await window.APIClient.getCurrentUser();
                console.log('✅ Battle user info received:', userInfo);
                
                // Extract username properly from the response
                if (userInfo && userInfo.username) {
                    this.currentUser = userInfo.username;
                } else if (userInfo && userInfo.user && userInfo.user.username) {
                    this.currentUser = userInfo.user.username;
                } else if (userInfo && userInfo.email) {
                    this.currentUser = userInfo.email;
                } else {
                    this.currentUser = 'authenticated_user'; // fallback
                }
                
                Logger.info('Battle user authenticated via APIClient', { user: this.currentUser });
                this.updateUserDisplay();
                return;
            } catch (error) {
                console.error('❌ Battle APIClient user info failed:', error);
                Logger.warning('Battle APIClient user info failed, trying fallback', error);
            }
        } else {
            console.log('⚠️ Battle APIClient not available or not authenticated');
            console.log('⚠️ APIClient exists:', !!window.APIClient);
            console.log('⚠️ APIClient authenticated:', window.APIClient ? window.APIClient.isAuthenticated() : 'N/A');
        }
        
        // Fallback to old method
        const currentUser = this.getCurrentUser();
        console.log('🔍 Battle fallback getCurrentUser result:', currentUser);
        
        if (currentUser instanceof Promise) {
            // Handle async getCurrentUser
            try {
                this.currentUser = await currentUser;
                Logger.info('Battle user authenticated', { user: this.currentUser });
            } catch (error) {
                Logger.warning('Battle failed to get current user', error);
                this.currentUser = null;
            }
        } else if (currentUser) {
            this.currentUser = currentUser;
            Logger.info('Battle user authenticated (fallback)', { user: this.currentUser });
        } else {
            console.log('❌ No authentication found, using guest mode...');
            this.currentUser = 'Guest Player';
            Logger.info('Battle module running in guest mode');
            this.showNotification('Běžím v demo módu - přihlaste se pro full funkčnost', 'info');
        }
        
        this.updateUserDisplay();
    }

    getCurrentUser() {
        // Try to get current user from various sources
        
        // 1. Check APIClient authentication first
        if (window.APIClient && window.APIClient.isAuthenticated()) {
            // Try to get user info from APIClient
            return window.APIClient.getCurrentUser()
                .then(userInfo => {
                    if (userInfo && userInfo.username) {
                        return userInfo.username;
                    } else if (userInfo && userInfo.user && userInfo.user.username) {
                        return userInfo.user.username;
                    } else if (userInfo && userInfo.email) {
                        return userInfo.email;
                    } else {
                        return 'authenticated_user';
                    }
                })
                .catch(() => 'authenticated_user');
        }
        
        // 2. URL parameter (from auth redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const userFromUrl = urlParams.get('user');
        if (userFromUrl) {
            return userFromUrl;
        }
        
        // 3. Session storage
        const userFromSession = sessionStorage.getItem('currentUser');
        if (userFromSession) {
            return userFromSession;
        }
        
        // 4. Local storage (remember me)
        const savedCredentials = localStorage.getItem('modular_quiz_credentials');
        if (savedCredentials) {
            try {
                const credentials = JSON.parse(savedCredentials);
                return credentials.username;
            } catch (e) {
                Logger.warning('Battle failed to parse saved credentials', e);
            }
        }
        
        // 5. No user found
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
        
        // Also update status indicator
        this.updateBattleStatusIndicator();
    }

    async initializeConnection() {
        try {
            // Simulate WebSocket connection for demo
            this.isConnected = true;
            Logger.info('Demo connection established');
            
            // In real implementation, this would be:
            // this.socket = new WebSocket('wss://your-battle-server.com');
            // this.setupSocketEventListeners();
            
        } catch (error) {
            Logger.error('Failed to initialize connection:', error);
            this.isConnected = false;
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (this.battleState.isActive) {
                if (confirm('Opravdu se chcete odhlásit během aktivního souboje? Souboj bude ukončen.')) {
                    this.surrenderBattle();
                    this.logout();
                }
            } else {
                this.logout();
            }
        });

        // Battle Mode Buttons
        document.getElementById('quickBattleBtn')?.addEventListener('click', () => this.startMatchmaking('quick'));
        document.getElementById('rankedBattleBtn')?.addEventListener('click', () => this.startMatchmaking('ranked'));
        document.getElementById('tournamentBtn')?.addEventListener('click', () => this.openModal('tournamentModal'));
        document.getElementById('createRoomBtn')?.addEventListener('click', () => this.openModal('customRoomModal'));
        document.getElementById('joinRoomBtn')?.addEventListener('click', this.joinCustomRoom.bind(this));

        // Matchmaking
        document.getElementById('cancelMatchmakingBtn')?.addEventListener('click', this.cancelMatchmaking.bind(this));

        // Battle Controls
        document.getElementById('surrenderBtn')?.addEventListener('click', this.surrenderBattle.bind(this));

        // Battle Answers
        document.getElementById('battleAnswerA')?.addEventListener('click', () => this.selectAnswer(0));
        document.getElementById('battleAnswerB')?.addEventListener('click', () => this.selectAnswer(1));
        document.getElementById('battleAnswerC')?.addEventListener('click', () => this.selectAnswer(2));

        // Results Actions
        document.getElementById('rematchBtn')?.addEventListener('click', this.requestRematch.bind(this));
        document.getElementById('newBattleBtn')?.addEventListener('click', this.startNewBattle.bind(this));
        document.getElementById('shareResultBtn')?.addEventListener('click', this.shareResult.bind(this));
        document.getElementById('backToMenuBtn')?.addEventListener('click', this.backToMenu.bind(this));

        // Sidebar Actions
        document.getElementById('fullLeaderboardBtn')?.addEventListener('click', () => this.openModal('leaderboardModal'));

        // Custom Room Modal
        document.getElementById('createCustomRoomBtn')?.addEventListener('click', this.createCustomRoom.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Server status manual refresh
        document.getElementById('serverStatus')?.addEventListener('click', () => {
            console.log('[Render.com Optimization] Manual server status refresh clicked');
            this.refreshServerStatus();
        });

        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', this.switchTab.bind(this));
        });

        // API Test button
        document.getElementById('testBattleBtn')?.addEventListener('click', () => {
            this.runBattleAPIClientTest();
        });

        // Update API status indicator
        this.updateBattleStatusIndicator();
    }

    loadUserStats() {
        try {
            // Load from localStorage or use demo data
            const savedStats = localStorage.getItem('battleUserStats');
            if (savedStats) {
                Object.assign(this.userStats, JSON.parse(savedStats));
            }
            
            // Update UI
            document.getElementById('userRank').textContent = `🏆 ${this.userStats.rank}`;
            document.getElementById('userRating').textContent = `⭐ ${this.userStats.rating}`;
            
        } catch (error) {
            Logger.error('Failed to load user stats:', error);
        }
    }

    updateBattleMenu() {
        // Update online player counts (demo data)
        document.getElementById('quickBattlePlayers').textContent = Math.floor(Math.random() * 150) + 50;
        document.getElementById('rankedBattlePlayers').textContent = Math.floor(Math.random() * 80) + 20;
        document.getElementById('activeTournaments').textContent = Math.floor(Math.random() * 5) + 2;
        
        // Update recent battles (demo)
        this.updateRecentBattles();
        
        // Update leaderboard preview
        this.updateLeaderboardPreview();
        
        // Update online indicator
        if (this.isConnected) {
            this.showNotification('Připojeno k Battle serveru', 'success');
        } else {
            this.showNotification('Offline režim - použije se demo data', 'warning');
        }
    }

    updateRecentBattles() {
        const recentBattles = document.getElementById('recentBattles');
        if (!recentBattles) return;
        
        // Demo recent battles
        const battles = [
            { result: 'win', opponent: 'QuizMaster', score: '8:6', time: 'před 2h' },
            { result: 'loss', opponent: 'BrainStorm', score: '4:9', time: 'před 1d' },
            { result: 'win', opponent: 'FastFinger', score: '7:5', time: 'před 2d' }
        ];
        
        recentBattles.innerHTML = '';
        battles.forEach(battle => {
            const item = document.createElement('div');
            item.className = `recent-item ${battle.result}`;
            item.innerHTML = `
                <div class="battle-result">${battle.result === 'win' ? '🏆 VÝHRA' : '❌ PROHRA'}</div>
                <div class="battle-details">
                    <span>vs ${battle.opponent}</span>
                    <span class="battle-score">${battle.score}</span>
                </div>
                <div class="battle-time">${battle.time}</div>
            `;
            recentBattles.appendChild(item);
        });
    }

    updateLeaderboardPreview() {
        const leaderboard = document.getElementById('leaderboardPreview');
        if (!leaderboard) return;
        
        // Demo leaderboard data
        const topPlayers = [
            { rank: 1, name: 'QuizGod', rating: 2847 },
            { rank: 2, name: 'BrainMaster', rating: 2756 },
            { rank: 3, name: 'QuickThink', rating: 2689 },
            { rank: 47, name: 'You', rating: this.userStats.rating, current: true }
        ];
        
        leaderboard.innerHTML = '';
        topPlayers.forEach(player => {
            const item = document.createElement('div');
            item.className = `leader-item ${player.current ? 'current' : ''}`;
            item.innerHTML = `
                <span class="rank">${player.rank}.</span>
                <span class="name">${player.name}</span>
                <span class="rating">${player.rating}</span>
            `;
            leaderboard.appendChild(item);
        });
    }

    async startMatchmaking(mode) {
        try {
            Logger.info(`Starting matchmaking for ${mode} battle`);
            
            if (!this.isConnected) {
                // Demo mode - simulate finding opponent
                this.simulateMatchmaking(mode);
                return;
            }
            
            this.matchmakingState.isSearching = true;
            this.matchmakingState.searchStartTime = new Date();
            this.battleState.mode = mode;
            
            // Show matchmaking screen
            this.showMatchmakingScreen();
            
            // Start search timer
            this.startSearchTimer();
            
            // Send matchmaking request to server
            // this.socket.send(JSON.stringify({
            //     type: 'start_matchmaking',
            //     mode: mode,
            //     rating: this.userStats.rating
            // }));
            
        } catch (error) {
            Logger.error('Failed to start matchmaking:', error);
            this.showNotification('Chyba při spouštění matchmakingu', 'error');
        }
    }

    simulateMatchmaking(mode) {
        this.showMatchmakingScreen();
        this.startSearchTimer();
        
        // Simulate finding opponent after random time
        const searchTime = Math.random() * 8000 + 2000; // 2-10 seconds
        
        setTimeout(() => {
            if (this.matchmakingState.isSearching) {
                this.onOpponentFound(mode);
            }
        }, searchTime);
    }

    showMatchmakingScreen() {
        document.getElementById('battleMenu').style.display = 'none';
        document.getElementById('matchmaking').style.display = 'block';
        
        // Update status
        document.getElementById('searchStatus').textContent = 'Hledání protivníka...';
        document.getElementById('onlineCount').textContent = Math.floor(Math.random() * 200) + 100;
        
        // Rotate search tips
        this.rotateSearchTips();
    }

    startSearchTimer() {
        this.matchmakingState.searchTimer = setInterval(() => {
            if (!this.matchmakingState.isSearching) return;
            
            const elapsed = new Date() - this.matchmakingState.searchStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('searchTime').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
        }, 1000);
    }

    rotateSearchTips() {
        const tips = [
            'Připravte si klávesové zkratky A, B, C pro rychlé odpovídání',
            'Rychlost odpovědi ovlivňuje konečné skóre',
            'Při stejném počtu správných odpovědí vyhrává rychlejší hráč',
            'Každá správná odpověď přináší body podle obtížnosti',
            'Série správných odpovědí zvyšuje bonus multiplikátor',
            'V hodnocených soubojích se mění váš rating podle výsledku'
        ];
        
        let currentTip = 0;
        const tipsList = document.getElementById('searchTips');
        
        if (tipsList) {
            setInterval(() => {
                if (!this.matchmakingState.isSearching) return;
                
                currentTip = (currentTip + 1) % tips.length;
                tipsList.innerHTML = `<li>${tips[currentTip]}</li>`;
            }, 3000);
        }
    }

    onOpponentFound(mode) {
        Logger.info('Opponent found, starting battle');
        
        // Stop matchmaking
        this.cancelMatchmaking(false);
        
        // Select random opponent
        const opponent = this.demoOpponents[Math.floor(Math.random() * this.demoOpponents.length)];
        
        // Initialize battle
        this.initializeBattle(mode, opponent);
        
        this.showNotification(`Protivník nalezen: ${opponent.name}`, 'success');
    }

    cancelMatchmaking(showNotification = true) {
        this.matchmakingState.isSearching = false;
        
        if (this.matchmakingState.searchTimer) {
            clearInterval(this.matchmakingState.searchTimer);
            this.matchmakingState.searchTimer = null;
        }
        
        // Hide matchmaking, show menu
        document.getElementById('matchmaking').style.display = 'none';
        document.getElementById('battleMenu').style.display = 'block';
        
        if (showNotification) {
            this.showNotification('Hledání zrušeno', 'info');
        }
    }

    async initializeBattle(mode, opponent) {
        try {
            // Set up battle state
            this.battleState.isActive = true;
            this.battleState.mode = mode;
            this.battleState.battleId = 'demo_' + Date.now();
            this.battleState.currentQuestion = 0;
            this.battleState.questions = this.shuffleArray([...this.demoQuestions]);
            this.battleState.players = [
                {
                    id: 'you',
                    name: this.currentUser?.username || 'Vy',
                    rank: this.userStats.rank,
                    rating: this.userStats.rating,
                    score: 0,
                    correct: 0,
                    streak: 0,
                    isYou: true
                },
                {
                    id: 'opponent',
                    name: opponent.name,
                    rank: opponent.rank,
                    rating: opponent.rating,
                    score: 0,
                    correct: 0,
                    streak: 0,
                    isYou: false
                }
            ];
            this.battleState.myAnswers = [];
            this.battleState.isFinished = false;
            
            // Show battle arena
            this.showBattleArena();
            
            // Start battle countdown
            this.startBattleCountdown();
            
        } catch (error) {
            Logger.error('Failed to initialize battle:', error);
            this.showNotification('Chyba při inicializaci souboje', 'error');
        }
    }

    showBattleArena() {
        // Hide other sections
        document.getElementById('matchmaking').style.display = 'none';
        document.getElementById('battleMenu').style.display = 'none';
        
        // Show battle arena
        document.getElementById('battleArena').style.display = 'block';
        
        // Update battle info
        const modeNames = {
            'quick': '⚡ Rychlý Souboj',
            'ranked': '🏆 Hodnocený Souboj',
            'tournament': '🏅 Turnaj',
            'custom': '🎨 Vlastní Souboj'
        };
        
        document.querySelector('.battle-mode').textContent = modeNames[this.battleState.mode] || 'Souboj';
        
        // Update player info
        this.updatePlayerDisplay();
        
        // Clear live feed
        this.liveFeedMessages = [];
        this.addLiveFeedMessage('system', 'Souboj začíná! Hodně štěstí!');
    }

    updatePlayerDisplay() {
        const you = this.battleState.players.find(p => p.isYou);
        const opponent = this.battleState.players.find(p => !p.isYou);
        
        if (you) {
            document.getElementById('yourName').textContent = you.name;
            document.getElementById('yourRank').textContent = `Rank: ${you.rank}`;
            document.getElementById('yourScore').textContent = you.score;
            document.getElementById('yourCorrect').textContent = you.correct;
            document.getElementById('yourStreak').textContent = you.streak;
        }
        
        if (opponent) {
            document.getElementById('opponentName').textContent = opponent.name;
            document.getElementById('opponentRank').textContent = `Rank: ${opponent.rank}`;
            document.getElementById('opponentScore').textContent = opponent.score;
            document.getElementById('opponentCorrect').textContent = opponent.correct;
            document.getElementById('opponentStreak').textContent = opponent.streak;
        }
    }

    startBattleCountdown() {
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            if (countdown > 0) {
                this.addLiveFeedMessage('system', `Začínáme za ${countdown}...`);
                countdown--;
            } else {
                clearInterval(countdownInterval);
                this.startFirstQuestion();
            }
        }, 1000);
    }

    startFirstQuestion() {
        this.addLiveFeedMessage('system', 'FIGHT! 🔥');
        this.loadCurrentQuestion();
    }

    loadCurrentQuestion() {
        const question = this.battleState.questions[this.battleState.currentQuestion];
        if (!question) {
            this.finishBattle();
            return;
        }
        
        // Update question display
        document.getElementById('battleQuestionText').textContent = question.question;
        document.getElementById('battleQuestionCounter').textContent = 
            `Otázka ${this.battleState.currentQuestion + 1}/${this.battleState.questions.length}`;
        
        // Update difficulty badge
        const difficultyBadge = document.getElementById('questionDifficulty');
        difficultyBadge.textContent = question.difficulty.toUpperCase();
        difficultyBadge.className = `difficulty-badge ${question.difficulty}`;
        
        // Update answer options
        const answerButtons = ['battleAnswerA', 'battleAnswerB', 'battleAnswerC'];
        question.answers.forEach((answer, index) => {
            const button = document.getElementById(answerButtons[index]);
            if (button) {
                button.querySelector('.answer-text').textContent = answer;
                button.disabled = false;
                button.className = 'battle-answer';
            }
        });
        
        // Start question timer
        this.startQuestionTimer(question.timeLimit || 15);
        
        // Update status
        document.getElementById('yourStatus').textContent = 'Přemýšlí...';
        document.getElementById('yourStatus').className = 'status-indicator answering';
        document.getElementById('opponentStatus').textContent = 'Přemýšlí...';
        document.getElementById('opponentStatus').className = 'status-indicator answering';
        
        this.battleState.questionStartTime = new Date();
        
        // Simulate opponent answering
        this.simulateOpponentAnswer(question);
    }

    startQuestionTimer(timeLimit) {
        this.battleState.questionTimeLimit = timeLimit;
        this.battleState.timeRemaining = timeLimit;
        
        const timerBar = document.getElementById('responseTimeBar');
        const timerText = document.getElementById('responseTimeText');
        
        const timerInterval = setInterval(() => {
            this.battleState.timeRemaining--;
            
            if (timerText) {
                timerText.textContent = `${this.battleState.timeRemaining}s`;
            }
            
            if (timerBar) {
                const percentage = (this.battleState.timeRemaining / timeLimit) * 100;
                timerBar.style.width = `${percentage}%`;
                
                if (percentage < 30) {
                    timerBar.classList.add('warning');
                }
            }
            
            if (this.battleState.timeRemaining <= 0) {
                clearInterval(timerInterval);
                this.timeUp();
            }
        }, 1000);
        
        // Store timer to clear later if needed
        this.battleState.questionTimer = timerInterval;
    }

    simulateOpponentAnswer(question) {
        // Simulate opponent answering with some delay and accuracy
        const responseTime = Math.random() * 8000 + 2000; // 2-10 seconds
        
        setTimeout(() => {
            if (this.battleState.currentQuestion < this.battleState.questions.length) {
                const opponent = this.battleState.players.find(p => !p.isYou);
                const accuracy = 0.7; // 70% accuracy for demo opponent
                const isCorrect = Math.random() < accuracy;
                
                // Calculate opponent score
                let points = 0;
                if (isCorrect) {
                    points = this.calculatePoints(question.difficulty, responseTime / 1000);
                    opponent.correct++;
                    opponent.streak++;
                } else {
                    opponent.streak = 0;
                }
                
                opponent.score += points;
                
                // Update display
                this.updatePlayerDisplay();
                
                // Update status
                document.getElementById('opponentStatus').textContent = isCorrect ? 'Správně!' : 'Špatně';
                document.getElementById('opponentStatus').className = `status-indicator ${isCorrect ? 'answered' : 'ready'}`;
                
                // Add live feed message
                this.addLiveFeedMessage('opponent', 
                    isCorrect ? `${opponent.name} odpověděl správně! (+${points} bodů)` : `${opponent.name} odpověděl špatně`
                );
            }
        }, responseTime);
    }

    selectAnswer(answerIndex) {
        if (this.battleState.timeRemaining <= 0) return;
        
        const question = this.battleState.questions[this.battleState.currentQuestion];
        const responseTime = (new Date() - this.battleState.questionStartTime) / 1000;
        const isCorrect = answerIndex === question.correctAnswer;
        
        // Clear question timer
        if (this.battleState.questionTimer) {
            clearInterval(this.battleState.questionTimer);
        }
        
        // Update answer buttons
        const answerButtons = ['battleAnswerA', 'battleAnswerB', 'battleAnswerC'];
        answerButtons.forEach((buttonId, index) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = true;
                
                if (index === answerIndex) {
                    button.classList.add(isCorrect ? 'correct' : 'incorrect');
                } else if (index === question.correctAnswer) {
                    button.classList.add('correct');
                }
            }
        });
        
        // Update player stats
        const you = this.battleState.players.find(p => p.isYou);
        let points = 0;
        
        if (isCorrect) {
            points = this.calculatePoints(question.difficulty, responseTime);
            you.correct++;
            you.streak++;
            
            // Update status
            document.getElementById('yourStatus').textContent = 'Správně!';
            document.getElementById('yourStatus').className = 'status-indicator answered';
        } else {
            you.streak = 0;
            
            // Update status
            document.getElementById('yourStatus').textContent = 'Špatně';
            document.getElementById('yourStatus').className = 'status-indicator ready';
        }
        
        you.score += points;
        
        // Store answer
        this.battleState.myAnswers.push({
            questionId: question.id,
            selectedAnswer: answerIndex,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            responseTime: responseTime,
            points: points
        });
        
        // Update display
        this.updatePlayerDisplay();
        
        // Add live feed message
        this.addLiveFeedMessage('player', 
            isCorrect ? `Správná odpověď! (+${points} bodů)` : 'Špatná odpověď'
        );
        
        // Continue to next question after delay
        setTimeout(() => {
            this.nextQuestion();
        }, 2000);
    }

    calculatePoints(difficulty, responseTime) {
        const basePoints = {
            'easy': 100,
            'medium': 150,
            'hard': 200
        };
        
        const base = basePoints[difficulty] || 100;
        
        // Time bonus (faster = more points)
        const timeBonus = Math.max(0, (15 - responseTime) * 5);
        
        // Streak bonus
        const you = this.battleState.players.find(p => p.isYou);
        const streakBonus = Math.min(you.streak * 10, 50);
        
        return Math.round(base + timeBonus + streakBonus);
    }

    timeUp() {
        this.addLiveFeedMessage('system', 'Čas vypršel!');
        
        // Treat as wrong answer
        this.selectAnswer(-1); // Invalid answer index
    }

    nextQuestion() {
        this.battleState.currentQuestion++;
        
        if (this.battleState.currentQuestion >= this.battleState.questions.length) {
            this.finishBattle();
        } else {
            this.loadCurrentQuestion();
        }
    }

    finishBattle() {
        this.battleState.isFinished = true;
        
        // Determine winner
        const you = this.battleState.players.find(p => p.isYou);
        const opponent = this.battleState.players.find(p => !p.isYou);
        
        const isVictory = you.score > opponent.score;
        
        // Update user stats
        if (isVictory) {
            this.userStats.wins++;
            this.userStats.currentStreak++;
            this.userStats.bestStreak = Math.max(this.userStats.bestStreak, this.userStats.currentStreak);
        } else {
            this.userStats.losses++;
            this.userStats.currentStreak = 0;
        }
        
        this.userStats.winRate = (this.userStats.wins / (this.userStats.wins + this.userStats.losses)) * 100;
        
        // Calculate rating change (for ranked battles)
        let ratingChange = 0;
        if (this.battleState.mode === 'ranked') {
            ratingChange = this.calculateRatingChange(isVictory, you.score, opponent.score, opponent.rating);
            this.userStats.rating += ratingChange;
        }
        
        // Save stats
        localStorage.setItem('battleUserStats', JSON.stringify(this.userStats));
        
        // Show results
        this.showBattleResults(isVictory, ratingChange);
        
        this.addLiveFeedMessage('system', `Souboj skončen! ${isVictory ? 'Vítězství!' : 'Porážka!'}`);
    }

    calculateRatingChange(isVictory, yourScore, opponentScore, opponentRating) {
        const scoreDiff = yourScore - opponentScore;
        const ratingDiff = opponentRating - this.userStats.rating;
        
        let baseChange = isVictory ? 25 : -20;
        
        // Adjust based on opponent strength
        if (ratingDiff > 0) {
            baseChange *= 1.2; // Bonus for beating stronger opponent
        } else {
            baseChange *= 0.8; // Less penalty for losing to weaker opponent
        }
        
        // Adjust based on score difference
        const scoreMultiplier = Math.min(Math.abs(scoreDiff) / 500, 1.5);
        baseChange *= scoreMultiplier;
        
        return Math.round(baseChange);
    }

    showBattleResults(isVictory, ratingChange) {
        // Hide battle arena
        document.getElementById('battleArena').style.display = 'none';
        
        // Show results
        document.getElementById('battleResults').style.display = 'block';
        
        // Update result banner
        const resultBanner = document.getElementById('resultBanner');
        const resultTitle = document.getElementById('resultTitle');
        const resultSubtitle = document.getElementById('resultSubtitle');
        
        if (isVictory) {
            resultBanner.className = 'result-banner victory';
            resultTitle.textContent = 'VÍTĚZSTVÍ!';
            resultSubtitle.textContent = 'Skvělá práce! Porazili jste protivníka.';
        } else {
            resultBanner.className = 'result-banner defeat';
            resultTitle.textContent = 'PORÁŽKA';
            resultSubtitle.textContent = 'Tentokrát se to nepovedlo. Zkuste to znovu!';
        }
        
        // Update final scores
        const you = this.battleState.players.find(p => p.isYou);
        const opponent = this.battleState.players.find(p => !p.isYou);
        
        document.getElementById('yourFinalScore').textContent = you.score;
        document.getElementById('yourFinalCorrect').textContent = you.correct;
        document.getElementById('yourFinalWrong').textContent = this.battleState.questions.length - you.correct;
        
        document.getElementById('opponentFinalScore').textContent = opponent.score;
        document.getElementById('opponentFinalCorrect').textContent = opponent.correct;
        document.getElementById('opponentFinalWrong').textContent = this.battleState.questions.length - opponent.correct;
        
        // Calculate average response times
        const yourAvgTime = this.battleState.myAnswers.reduce((sum, a) => sum + a.responseTime, 0) / this.battleState.myAnswers.length;
        document.getElementById('yourAvgTime').textContent = `${yourAvgTime.toFixed(1)}s`;
        document.getElementById('opponentAvgTime').textContent = `${(Math.random() * 3 + 2).toFixed(1)}s`;
        
        // Update rewards
        document.getElementById('ratingChange').textContent = ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString();
        document.getElementById('xpGained').textContent = `+${you.score / 10}`;
        
        // Check for achievements
        this.checkAchievements();
        
        // Update battle review
        this.updateBattleReview();
    }

    checkAchievements() {
        const achievements = [];
        const you = this.battleState.players.find(p => p.isYou);
        
        if (you.streak >= 5) {
            achievements.push('Série 5');
        }
        
        if (you.correct === this.battleState.questions.length) {
            achievements.push('Perfektní Hra');
        }
        
        const avgResponseTime = this.battleState.myAnswers.reduce((sum, a) => sum + a.responseTime, 0) / this.battleState.myAnswers.length;
        if (avgResponseTime < 2) {
            achievements.push('Rychlá Ruka');
        }
        
        document.getElementById('achievementEarned').textContent = achievements.join(', ') || 'Žádné nové';
    }

    updateBattleReview() {
        const reviewContainer = document.getElementById('questionReview');
        if (!reviewContainer) return;
        
        reviewContainer.innerHTML = '';
        
        this.battleState.myAnswers.forEach((answer, index) => {
            const question = this.battleState.questions[index];
            
            const reviewItem = document.createElement('div');
            reviewItem.className = `question-review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            reviewItem.innerHTML = `
                <h5>Otázka ${index + 1}: ${answer.isCorrect ? '✅' : '❌'} (+${answer.points} bodů)</h5>
                <p><strong>Otázka:</strong> ${question.question}</p>
                <p><strong>Vaše odpověď:</strong> ${question.answers[answer.selectedAnswer] || 'Žádná'}</p>
                <p><strong>Správná odpověď:</strong> ${question.answers[question.correctAnswer]}</p>
                <p><strong>Čas odpovědi:</strong> ${answer.responseTime.toFixed(1)}s</p>
            `;
            
            reviewContainer.appendChild(reviewItem);
        });
    }

    addLiveFeedMessage(type, message) {
        const timestamp = new Date().toLocaleTimeString().slice(0, 5);
        
        this.liveFeedMessages.push({
            type: type,
            message: message,
            timestamp: timestamp
        });
        
        // Update live feed display
        const feedContainer = document.getElementById('liveFeedMessages');
        if (feedContainer) {
            const messageElement = document.createElement('div');
            messageElement.className = `feed-message ${type}`;
            messageElement.innerHTML = `
                <span class="timestamp">${timestamp}</span>
                <span class="message">${message}</span>
            `;
            
            feedContainer.appendChild(messageElement);
            feedContainer.scrollTop = feedContainer.scrollHeight;
            
            // Limit messages count
            while (feedContainer.children.length > 20) {
                feedContainer.removeChild(feedContainer.firstChild);
            }
        }
    }

    surrenderBattle() {
        if (!this.battleState.isActive) return;
        
        if (confirm('Opravdu se chcete vzdát? Souboj bude ukončen jako prohra.')) {
            this.addLiveFeedMessage('system', 'Hráč se vzdal souboje');
            
            // Set opponent as winner
            const opponent = this.battleState.players.find(p => !p.isYou);
            opponent.score = Math.max(opponent.score, 9999);
            
            this.finishBattle();
        }
    }

    requestRematch() {
        if (confirm('Chcete požádat protivníka o odvetu?')) {
            this.showNotification('Žádost o odvetu odeslána', 'info');
            
            // Simulate opponent response
            setTimeout(() => {
                if (Math.random() > 0.5) {
                    this.showNotification('Protivník přijal odvetu!', 'success');
                    // Start new battle with same opponent
                    const opponent = this.battleState.players.find(p => !p.isYou);
                    this.initializeBattle(this.battleState.mode, opponent);
                } else {
                    this.showNotification('Protivník odmítl odvetu', 'warning');
                }
            }, 2000);
        }
    }

    startNewBattle() {
        this.backToMenu();
        this.showNotification('Vyberte typ souboje', 'info');
    }

    shareResult() {
        const you = this.battleState.players.find(p => p.isYou);
        const opponent = this.battleState.players.find(p => !p.isYou);
        const isVictory = you.score > opponent.score;
        
        const result = `${isVictory ? '🏆 Vítězství' : '😔 Porážka'} v Quiz Battle!
Skóre: ${you.score} vs ${opponent.score}
Správných odpovědí: ${you.correct}/${this.battleState.questions.length}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Quiz Battle Results',
                text: result,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(result).then(() => {
                this.showNotification('Výsledek zkopírován do schránky', 'success');
            });
        }
    }

    backToMenu() {
        // Reset battle state
        this.battleState = {
            isActive: false,
            mode: null,
            battleId: null,
            currentQuestion: 0,
            questions: [],
            players: [],
            myAnswers: [],
            timeRemaining: 0,
            questionTimeLimit: 15,
            questionStartTime: null,
            scores: {},
            isFinished: false
        };
        
        // Hide all sections except menu
        document.getElementById('battleArena').style.display = 'none';
        document.getElementById('battleResults').style.display = 'none';
        document.getElementById('matchmaking').style.display = 'none';
        document.getElementById('battleMenu').style.display = 'block';
        
        // Update menu data
        this.updateBattleMenu();
    }

    joinCustomRoom() {
        const roomCode = document.getElementById('roomCodeInput').value.trim();
        
        if (!roomCode) {
            this.showNotification('Zadejte kód místnosti', 'warning');
            return;
        }
        
        // Simulate joining room
        this.showNotification(`Připojování k místnosti ${roomCode}...`, 'info');
        
        setTimeout(() => {
            if (Math.random() > 0.3) {
                this.showNotification('Připojeno k místnosti!', 'success');
                this.simulateMatchmaking('custom');
            } else {
                this.showNotification('Místnost nebyla nalezena', 'error');
            }
        }, 1500);
    }

    createCustomRoom() {
        const roomName = document.getElementById('roomName').value.trim();
        const maxPlayers = document.getElementById('maxPlayers').value;
        const battleMode = document.getElementById('battleMode').value;
        
        if (!roomName) {
            this.showNotification('Zadejte název místnosti', 'warning');
            return;
        }
        
        // Simulate room creation
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        this.closeModal('customRoomModal');
        this.showNotification(`Místnost vytvořena! Kód: ${roomCode}`, 'success');
        
        // Start waiting for players
        setTimeout(() => {
            this.simulateMatchmaking('custom');
        }, 1000);
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if (!this.battleState.isActive) return;
        
        switch (event.code) {
            case 'KeyA':
                event.preventDefault();
                document.getElementById('battleAnswerA')?.click();
                break;
            case 'KeyB':
                event.preventDefault();
                document.getElementById('battleAnswerB')?.click();
                break;
            case 'KeyC':
                event.preventDefault();
                document.getElementById('battleAnswerC')?.click();
                break;
            case 'Escape':
                event.preventDefault();
                this.surrenderBattle();
                break;
        }
    }

    // Tab management
    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        const parentModal = event.target.closest('.modal');
        
        // Hide all tab contents in this modal
        parentModal.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all buttons in this modal
        parentModal.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Show target tab and activate button
        parentModal.querySelector(`#${targetTab}Tab`).classList.add('active');
        event.target.classList.add('active');
        
        // Load tab-specific data
        if (targetTab === 'global') {
            this.loadGlobalLeaderboard();
        } else if (targetTab === 'weekly') {
            this.loadWeeklyLeaderboard();
        } else if (targetTab === 'friends') {
            this.loadFriendsLeaderboard();
        }
    }

    loadGlobalLeaderboard() {
        const container = document.getElementById('globalLeaderboard');
        if (!container) return;
        
        // Demo leaderboard data
        const players = [
            { rank: 1, name: 'QuizGod', rating: 2847, wins: 156, losses: 23, streak: 12 },
            { rank: 2, name: 'BrainMaster', rating: 2756, wins: 134, losses: 31, streak: 8 },
            { rank: 3, name: 'QuickThink', rating: 2689, wins: 98, losses: 19, streak: 15 },
            { rank: 47, name: 'You', rating: this.userStats.rating, wins: this.userStats.wins, losses: this.userStats.losses, streak: this.userStats.currentStreak, current: true }
        ];
        
        container.innerHTML = '';
        players.forEach(player => {
            const row = document.createElement('div');
            row.className = `leaderboard-row ${player.current ? 'current-user' : ''}`;
            row.innerHTML = `
                <span>${player.rank}</span>
                <span>${player.name}</span>
                <span>${player.rating}</span>
                <span>${player.wins}/${player.losses}</span>
                <span>${player.streak}</span>
            `;
            container.appendChild(row);
        });
    }

    loadWeeklyLeaderboard() {
        // Similar implementation for weekly leaderboard
        const container = document.getElementById('weeklyLeaderboard');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Týdenní žebříček se načítá...</div>';
    }

    loadFriendsLeaderboard() {
        // Similar implementation for friends leaderboard
        const container = document.getElementById('friendsLeaderboard');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Zatím nemáte žádné přátele. Přidejte někoho!</div>';
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

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            
            // Load modal-specific data
            if (modalId === 'leaderboardModal') {
                this.loadGlobalLeaderboard();
            } else if (modalId === 'tournamentModal') {
                this.loadTournaments();
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadTournaments() {
        const container = document.getElementById('tournamentList');
        if (!container) return;
        
        // Demo tournament data
        const tournaments = [
            {
                name: 'Weekly Championship',
                players: 64,
                prizePool: '1000 XP',
                startTime: 'za 2 hodiny',
                status: 'registration'
            },
            {
                name: 'Lightning Round',
                players: 128,
                prizePool: '500 XP',
                startTime: 'právě teď',
                status: 'in-progress'
            }
        ];
        
        container.innerHTML = '';
        tournaments.forEach(tournament => {
            const item = document.createElement('div');
            item.className = 'tournament-item';
            item.innerHTML = `
                <h4>${tournament.name}</h4>
                <p>Hráči: ${tournament.players} | Výhra: ${tournament.prizePool}</p>
                <p>Start: ${tournament.startTime}</p>
                <button class="btn btn-primary">Připojit se</button>
            `;
            container.appendChild(item);
        });
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

    updateBattleStatusIndicator() {
        const indicator = document.getElementById('battleStatusIndicator');
        if (!indicator) return;
        
        // Check API status
        const hasAPIClient = !!window.APIClient;
        const isAuthenticated = hasAPIClient && window.APIClient.isAuthenticated();
        const hasUser = !!this.currentUser;
        const isConnected = this.isConnected;
        
        if (hasAPIClient && isAuthenticated && hasUser) {
            indicator.textContent = '🟢 Online Mode';
            indicator.style.background = '#00ff88';
            indicator.style.color = '#000';
        } else if (hasAPIClient && hasUser) {
            indicator.textContent = '🟡 API Available';
            indicator.style.background = '#ffaa00';
            indicator.style.color = '#000';
        } else if (hasUser) {
            indicator.textContent = '🔴 Offline Mode';
            indicator.style.background = '#ff4444';
            indicator.style.color = '#fff';
        } else {
            indicator.textContent = '❌ Not Logged In';
            indicator.style.background = '#666';
            indicator.style.color = '#fff';
        }
    }

    async runBattleAPIClientTest() {
        console.log('🧪 Starting Battle APIClient integration test...');
        const resultsDiv = document.getElementById('testBattleResults');
        if (!resultsDiv) return;
        
        // Show results div and clear previous content
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = '<h4>🧪 Battle APIClient Test:</h4>';
        
        try {
            // Test 1: Check APIClient availability
            if (window.APIClient) {
                resultsDiv.innerHTML += '<p>✅ APIClient available</p>';
                console.log('✅ APIClient available');
            } else {
                resultsDiv.innerHTML += '<p>❌ APIClient NOT available</p>';
                console.error('❌ APIClient NOT available');
                return;
            }
            
            // Test 2: Check base URL
            if (window.APIClient.baseURL) {
                resultsDiv.innerHTML += `<p>🌐 Base URL: ${window.APIClient.baseURL}</p>`;
            }
            
            // Test 3: Health check
            const startTime = Date.now();
            try {
                const isHealthy = await window.APIClient.healthCheck();
                const responseTime = Date.now() - startTime;
                resultsDiv.innerHTML += `<p>🏥 Health: ${isHealthy ? '✅ OK' : '❌ Failed'} (${responseTime}ms)</p>`;
            } catch (error) {
                resultsDiv.innerHTML += `<p>🏥 Health: ❌ Error - ${error.message}</p>`;
            }
            
            // Test 4: Test connection
            try {
                await window.APIClient.testConnection();
                resultsDiv.innerHTML += '<p>🔗 Connection: ✅ OK</p>';
            } catch (error) {
                resultsDiv.innerHTML += `<p>🔗 Connection: ❌ ${error.message}</p>`;
            }
            
            // Test 5: Authentication status
            const isAuth = window.APIClient.isAuthenticated();
            resultsDiv.innerHTML += `<p>🔐 Auth: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}</p>`;
            
            // Test 6: Current user (if authenticated)
            if (isAuth) {
                try {
                    const user = await window.APIClient.getCurrentUser();
                    resultsDiv.innerHTML += `<p>👤 User: ${user ? '✅ ' + JSON.stringify(user) : '❌ No data'}</p>`;
                } catch (error) {
                    resultsDiv.innerHTML += `<p>👤 User: ❌ ${error.message}</p>`;
                }
            }
            
            // Test 7: Battle-specific info
            resultsDiv.innerHTML += `<p>⚔️ Current User: ${this.currentUser || 'None'}</p>`;
            resultsDiv.innerHTML += `<p>⚔️ Battle Active: ${this.battleState.isActive}</p>`;
            resultsDiv.innerHTML += `<p>⚔️ Connected: ${this.isConnected}</p>`;
            
            resultsDiv.innerHTML += '<p><strong>✅ Battle test completed!</strong></p>';
            console.log('✅ Battle APIClient test completed!');
            
        } catch (error) {
            resultsDiv.innerHTML += `<p>❌ Test error: ${error.message}</p>`;
            console.error('❌ Battle test error:', error);
        }
    }

    logout() {
        const confirmed = confirm('Opravdu se chcete odhlásit?');
        if (!confirmed) return;
        
        Logger.action('Battle user logout', { user: this.currentUser });
        
        // Clear APIClient authentication
        if (window.APIClient) {
            window.APIClient.logout();
        }
        
        // Clear user data
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('modular_quiz_credentials');
        
        // End current battle
        if (this.battleState.isActive) {
            this.finishBattle();
        }
        
        // Redirect to login
        window.location.href = '../auth/login.html';
    }

    // === SERVER STATUS METHODS ===
    
    initializeServerStatus() {
        // Initial check only - no periodic checking to save Render.com free tier resources
        this.checkServerStatus();
        
        Logger.info('Server status checking initialized - single check only (Render.com optimization)');
        console.log('💡 Tip: Status will be refreshed only when needed (before battles, etc.)');
    }

    async checkServerStatus() {
        try {
            const serverStatusElement = document.getElementById('serverStatus');
            if (!serverStatusElement) return;

            // Try to check if APIClient is available and connected
            let isOnline = false;
            
            if (window.APIClient && typeof window.APIClient.checkConnection === 'function') {
                isOnline = await window.APIClient.checkConnection();
            } else {
                // Fallback: try to make a simple request to check connectivity
                try {
                    const response = await fetch('../../shared/api-config.js', { 
                        method: 'HEAD',
                        cache: 'no-cache' 
                    });
                    isOnline = response.ok;
                } catch (error) {
                    isOnline = false;
                }
            }

            this.updateServerStatus(isOnline);
            
        } catch (error) {
            console.error('Error checking server status:', error);
            this.updateServerStatus(false);
        }
    }

    async refreshServerStatus() {
        console.log('[Render.com Optimization] Manual server status refresh initiated');
        await this.checkServerStatus();
    }

    updateServerStatus(isOnline) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusIndicatorText');
        const mode = document.getElementById('statusMode');
        
        if (indicator && statusText && mode) {
            if (isOnline) {
                indicator.textContent = '🟢';
                statusText.textContent = 'Online';
                mode.textContent = 'Server Mode';
            } else {
                indicator.textContent = '🔴';
                statusText.textContent = 'Offline';
                mode.textContent = 'Local Mode';
            }
            
            // Also update server status container class
            const serverStatusElement = document.getElementById('serverStatus');
            if (serverStatusElement) {
                serverStatusElement.className = isOnline ? 'server-status online' : 'server-status offline';
            }
        }
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
        window.battleModule = new BattleModule();
        await window.battleModule.initialize();
        Logger.info('Battle Module ready');
    } catch (error) {
        Logger.error('Failed to initialize Battle Module:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', (event) => {
    if (window.battleModule && window.battleModule.battleState.isActive) {
        event.preventDefault();
        event.returnValue = 'Máte rozdělaný souboj. Opravdu chcete stránku opustit?';
        return event.returnValue;
    }
});

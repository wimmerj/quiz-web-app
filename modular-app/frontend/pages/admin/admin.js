/**
 * ADMIN MODULE - MAIN LOGIC
 * Comprehensive admin panel for user and content management
 */

class AdminModule {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.activeTab = 'users';
        this.users = new Map();
        this.questions = new Map();
        this.tables = new Map();
        this.analytics = {
            totalUsers: 0,
            totalTables: 0,
            totalQuestions: 0,
            totalAnswers: 0
        };
        
        this.init();
    }
    
    async init() {
        Logger.system('AdminModule initializing...');
        
        // Check authentication and admin access
        await this.checkAdminAccess();
        
        if (!this.hasAdminAccess()) {
            this.showAccessWarning();
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Load initial tab
        this.switchTab(this.activeTab);
        
        Logger.success('AdminModule initialized successfully');
    }
    
    async checkAdminAccess() {
        // Check if user is logged in and has admin role
        this.currentUser = this.getCurrentUser();
        this.userRole = this.getUserRole();
        
        Logger.info('Admin access check', { 
            user: this.currentUser, 
            role: this.userRole 
        });
        
        this.updateUserDisplay();
    }
    
    getCurrentUser() {
        // Try multiple sources for current user
        const urlParams = new URLSearchParams(window.location.search);
        const userFromUrl = urlParams.get('user');
        if (userFromUrl) return userFromUrl;
        
        const userFromSession = sessionStorage.getItem('currentUser');
        if (userFromSession) return userFromSession;
        
        const savedCredentials = localStorage.getItem('modular_quiz_credentials');
        if (savedCredentials) {
            try {
                const credentials = JSON.parse(savedCredentials);
                return credentials.username;
            } catch (e) {
                Logger.warning('Failed to parse saved credentials', e);
            }
        }
        
        return null;
    }
    
    getUserRole() {
        if (!this.currentUser) return null;
        
        // Check if user is in admin list
        const adminUsers = ['admin', 'root', 'administrator'];
        if (adminUsers.includes(this.currentUser.toLowerCase())) {
            return 'admin';
        }
        
        // Check stored user data
        const users = this.loadFromStorage('users') || {};
        const userData = users[this.currentUser];
        if (userData && userData.role) {
            return userData.role;
        }
        
        // Default to user role
        return 'user';
    }
    
    hasAdminAccess() {
        return this.currentUser && this.userRole === 'admin';
    }
    
    showAccessWarning() {
        const warning = document.getElementById('accessWarning');
        const content = document.getElementById('adminContent');
        
        if (warning) warning.style.display = 'block';
        if (content) content.style.display = 'none';
        
        Logger.warning('Admin access denied', { 
            user: this.currentUser, 
            role: this.userRole 
        });
    }
    
    updateUserDisplay() {
        const userDisplay = document.getElementById('userDisplay');
        const userRole = document.getElementById('userRole');
        
        if (userDisplay) {
            userDisplay.textContent = this.currentUser ? `👤 ${this.currentUser}` : '👤 Nepřihlášen';
        }
        
        if (userRole) {
            userRole.textContent = this.userRole === 'admin' ? '🛠️ Admin' : '👤 User';
            userRole.className = `user-role ${this.userRole}`;
        }
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        
        // Users tab actions
        document.getElementById('refreshUsersBtn')?.addEventListener('click', () => {
            this.loadUsersData();
        });
        
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        // Questions tab actions
        document.getElementById('refreshQuestionsBtn')?.addEventListener('click', () => {
            this.loadQuestionsData();
        });
        
        document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
            this.showAddQuestionModal();
        });
        
        document.getElementById('importQuestionsBtn')?.addEventListener('click', () => {
            this.importQuestions();
        });
        
        document.getElementById('questionTableFilter')?.addEventListener('change', (e) => {
            this.filterQuestions(e.target.value);
        });
        
        // Tables tab actions
        document.getElementById('refreshTablesBtn')?.addEventListener('click', () => {
            this.loadTablesData();
        });
        
        document.getElementById('addTableBtn')?.addEventListener('click', () => {
            this.addNewTable();
        });
        
        // Analytics tab actions
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => {
            this.loadAnalyticsData();
        });
        
        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('analyticsTimeRange')?.addEventListener('change', (e) => {
            this.updateAnalytics(e.target.value);
        });
        
        // System tab actions
        document.getElementById('systemInfoBtn')?.addEventListener('click', () => {
            this.showSystemInfo();
        });
        
        document.getElementById('cleanupBtn')?.addEventListener('click', () => {
            this.cleanupData();
        });
        
        document.getElementById('backupDbBtn')?.addEventListener('click', () => {
            this.backupDatabase();
        });
        
        document.getElementById('repairDbBtn')?.addEventListener('click', () => {
            this.repairDatabase();
        });
        
        document.getElementById('optimizeDbBtn')?.addEventListener('click', () => {
            this.optimizeDatabase();
        });
        
        // Form submissions
        document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser(e);
        });
        
        document.getElementById('addQuestionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddQuestion(e);
        });
        
        Logger.debug('Admin event listeners setup complete');
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
        
        this.activeTab = tabName;
        
        // Load tab data
        this.loadTabData(tabName);
        
        Logger.action('Admin tab switched', { tab: tabName });
    }
    
    async loadTabData(tabName) {
        switch (tabName) {
            case 'users':
                await this.loadUsersData();
                break;
            case 'questions':
                await this.loadQuestionsData();
                break;
            case 'tables':
                await this.loadTablesData();
                break;
            case 'analytics':
                await this.loadAnalyticsData();
                break;
            case 'system':
                await this.loadSystemData();
                break;
        }
    }
    
    async loadDashboardData() {
        try {
            // Load basic statistics
            const users = this.loadFromStorage('users') || {};
            const questionHistory = this.loadFromStorage('user_answer_history') || {};
            const quizResults = this.loadFromStorage('quiz_results') || {};
            
            this.analytics.totalUsers = Object.keys(users).length;
            this.analytics.totalTables = this.getDemoTablesCount();
            this.analytics.totalQuestions = this.getTotalQuestionsCount();
            this.analytics.totalAnswers = this.getTodayAnswersCount();
            
            // Update dashboard display
            this.updateDashboardStats();
            
            Logger.info('Dashboard data loaded', this.analytics);
            
        } catch (error) {
            Logger.error('Failed to load dashboard data', error);
            this.showNotification('Chyba při načítání dat dashboardu', 'error');
        }
    }
    
    getDemoTablesCount() {
        // Count demo tables + any stored tables
        const demoTables = ['Tabulka1', 'Databáze']; // From quiz module
        const storedTables = this.loadFromStorage('custom_tables') || {};
        return demoTables.length + Object.keys(storedTables).length;
    }
    
    getTotalQuestionsCount() {
        // Count demo questions + any stored questions
        const demoCount = 5; // From quiz module demo data
        const storedQuestions = this.loadFromStorage('custom_questions') || [];
        return demoCount + storedQuestions.length;
    }
    
    getTodayAnswersCount() {
        const today = new Date().toISOString().split('T')[0];
        const history = this.loadFromStorage('user_answer_history') || {};
        
        let count = 0;
        Object.values(history).forEach(userHistory => {
            count += userHistory.filter(entry => 
                entry.timestamp && entry.timestamp.startsWith(today)
            ).length;
        });
        
        return count;
    }
    
    updateDashboardStats() {
        document.getElementById('totalUsers').textContent = this.analytics.totalUsers;
        document.getElementById('totalTables').textContent = this.analytics.totalTables;
        document.getElementById('totalQuestions').textContent = this.analytics.totalQuestions;
        document.getElementById('totalAnswers').textContent = this.analytics.totalAnswers;
    }
    
    async loadUsersData() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;
        
        this.setLoading('usersTable', true);
        
        try {
            const users = this.loadFromStorage('users') || {};
            const userHistory = this.loadFromStorage('user_answer_history') || {};
            
            tableBody.innerHTML = '';
            
            Object.entries(users).forEach(([username, userData]) => {
                const userAnswers = userHistory[username] || [];
                const lastActivity = this.getLastActivity(userAnswers);
                const role = userData.role || 'user';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <strong>${username}</strong>
                        ${userData.email ? `<br><small>${userData.email}</small>` : ''}
                    </td>
                    <td>
                        <span class="role-badge ${role}">${role}</span>
                    </td>
                    <td>${userData.createdAt || 'Neznámé'}</td>
                    <td>${lastActivity}</td>
                    <td>
                        <span style="color: var(--admin-success)">${userData.totalCorrect || 0}</span> / 
                        <span style="color: var(--admin-danger)">${userData.totalWrong || 0}</span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="adminModule.editUser('${username}')">✏️ Upravit</button>
                        <button class="action-btn" onclick="adminModule.viewUserStats('${username}')">📊 Statistiky</button>
                        <button class="action-btn danger" onclick="adminModule.deleteUser('${username}')">🗑️ Smazat</button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add demo users if no users exist
            if (Object.keys(users).length === 0) {
                this.addDemoUsers();
            }
            
        } catch (error) {
            Logger.error('Failed to load users data', error);
            this.showNotification('Chyba při načítání uživatelů', 'error');
        } finally {
            this.setLoading('usersTable', false);
        }
    }
    
    addDemoUsers() {
        const demoUsers = {
            'admin': { role: 'admin', totalCorrect: 45, totalWrong: 5, email: 'admin@example.com' },
            'test': { role: 'user', totalCorrect: 23, totalWrong: 12, email: 'test@example.com' },
            'demo': { role: 'user', totalCorrect: 15, totalWrong: 8, email: 'demo@example.com' }
        };
        
        const users = this.loadFromStorage('users') || {};
        Object.assign(users, demoUsers);
        this.saveToStorage('users', users);
        
        this.loadUsersData(); // Reload to show demo users
    }
    
    getLastActivity(userAnswers) {
        if (!userAnswers || userAnswers.length === 0) {
            return 'Nikdy';
        }
        
        const lastAnswer = userAnswers[userAnswers.length - 1];
        if (lastAnswer.timestamp) {
            const date = new Date(lastAnswer.timestamp);
            return date.toLocaleDateString('cs-CZ');
        }
        
        return 'Neznámé';
    }
    
    async loadQuestionsData() {
        const tableBody = document.getElementById('questionsTableBody');
        const tableFilter = document.getElementById('questionTableFilter');
        if (!tableBody) return;
        
        this.setLoading('questionsTable', true);
        
        try {
            // Load demo questions
            const demoQuestions = this.getDemoQuestions();
            const customQuestions = this.loadFromStorage('custom_questions') || [];
            const allQuestions = [...demoQuestions, ...customQuestions];
            
            // Update table filter options
            this.updateTableFilterOptions();
            
            tableBody.innerHTML = '';
            
            allQuestions.forEach((question, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${question.id || index + 1}</td>
                    <td>${question.table || 'Demo'}</td>
                    <td>
                        <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                            ${question.question}
                        </div>
                    </td>
                    <td><strong>${question.correct_answer}</strong></td>
                    <td>
                        <span class="difficulty-badge ${question.difficulty || 'medium'}">
                            ${this.getDifficultyText(question.difficulty || 'medium')}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="adminModule.editQuestion(${question.id || index})">✏️ Upravit</button>
                        <button class="action-btn" onclick="adminModule.viewQuestion(${question.id || index})">👁️ Detail</button>
                        <button class="action-btn danger" onclick="adminModule.deleteQuestion(${question.id || index})">🗑️ Smazat</button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
        } catch (error) {
            Logger.error('Failed to load questions data', error);
            this.showNotification('Chyba při načítání otázek', 'error');
        } finally {
            this.setLoading('questionsTable', false);
        }
    }
    
    getDemoQuestions() {
        // Return demo questions from quiz module
        return [
            {
                id: 1,
                table: 'Tabulka1',
                question: 'Jaký je hlavní cíl objektově orientovaného programování?',
                answer_a: 'Zrychlení výpočtů',
                answer_b: 'Zapouzdření dat a funkcí do objektů',
                answer_c: 'Snížení spotřeby paměti',
                correct_answer: 'B',
                difficulty: 'medium',
                explanation: 'OOP umožňuje zapouzdření dat a funkcí do objektů.'
            },
            {
                id: 2,
                table: 'Tabulka1',
                question: 'Co je to polymorfismus?',
                answer_a: 'Možnost objektu mít více podob',
                answer_b: 'Dědičnost mezi třídami',
                answer_c: 'Skrývání implementačních detailů',
                correct_answer: 'A',
                difficulty: 'hard',
                explanation: 'Polymorfismus umožňuje objektům různých tříd být používány stejným způsobem.'
            },
            {
                id: 3,
                table: 'Databáze',
                question: 'Co znamená SQL?',
                answer_a: 'Structured Query Language',
                answer_b: 'Simple Query Language',
                answer_c: 'Standard Query Language',
                correct_answer: 'A',
                difficulty: 'easy',
                explanation: 'SQL je zkratka pro Structured Query Language.'
            }
        ];
    }
    
    getDifficultyText(difficulty) {
        const map = {
            'easy': 'Snadná',
            'medium': 'Střední',
            'hard': 'Těžká'
        };
        return map[difficulty] || 'Střední';
    }
    
    updateTableFilterOptions() {
        const filter = document.getElementById('questionTableFilter');
        if (!filter) return;
        
        // Clear existing options except first
        while (filter.children.length > 1) {
            filter.removeChild(filter.lastChild);
        }
        
        // Add table options
        const tables = ['Tabulka1', 'Databáze'];
        tables.forEach(tableName => {
            const option = document.createElement('option');
            option.value = tableName;
            option.textContent = tableName;
            filter.appendChild(option);
        });
    }
    
    async loadTablesData() {
        const tablesGrid = document.getElementById('tablesGrid');
        if (!tablesGrid) return;
        
        this.setLoading('tablesGrid', true);
        
        try {
            const demoTables = [
                {
                    name: 'Tabulka1',
                    description: 'Demo tabulka s otázkami z programování',
                    questionCount: 3,
                    difficulty: 'medium',
                    category: 'Demo'
                },
                {
                    name: 'Databáze',
                    description: 'Demo tabulka s otázkami z databází',
                    questionCount: 2,
                    difficulty: 'easy',
                    category: 'Demo'
                }
            ];
            
            const customTables = this.loadFromStorage('custom_tables') || {};
            
            tablesGrid.innerHTML = '';
            
            // Add demo tables
            demoTables.forEach(table => {
                const tableCard = this.createTableCard(table);
                tablesGrid.appendChild(tableCard);
            });
            
            // Add custom tables
            Object.entries(customTables).forEach(([name, table]) => {
                const tableCard = this.createTableCard({ name, ...table });
                tablesGrid.appendChild(tableCard);
            });
            
        } catch (error) {
            Logger.error('Failed to load tables data', error);
            this.showNotification('Chyba při načítání tabulek', 'error');
        } finally {
            this.setLoading('tablesGrid', false);
        }
    }
    
    createTableCard(table) {
        const card = document.createElement('div');
        card.className = 'table-card';
        card.innerHTML = `
            <h3>📚 ${table.name}</h3>
            <p>${table.description || 'Bez popisu'}</p>
            <div class="table-stats">
                <span>${table.questionCount || 0} otázek</span>
                <span class="difficulty-badge ${table.difficulty || 'medium'}">
                    ${this.getDifficultyText(table.difficulty || 'medium')}
                </span>
            </div>
            <div class="table-actions">
                <button class="btn btn-small btn-primary" onclick="adminModule.editTable('${table.name}')">
                    ✏️ Upravit
                </button>
                <button class="btn btn-small btn-secondary" onclick="adminModule.exportTable('${table.name}')">
                    📤 Export
                </button>
                ${table.category !== 'Demo' ? `
                <button class="btn btn-small btn-danger" onclick="adminModule.deleteTable('${table.name}')">
                    🗑️ Smazat
                </button>
                ` : ''}
            </div>
        `;
        
        return card;
    }
    
    async loadAnalyticsData() {
        try {
            // Load user activity chart placeholder
            this.setupUserActivityChart();
            
            // Load question success chart placeholder
            this.setupQuestionSuccessChart();
            
            // Load battle stats
            this.loadBattleStats();
            
            // Load top users
            this.loadTopUsers();
            
        } catch (error) {
            Logger.error('Failed to load analytics data', error);
            this.showNotification('Chyba při načítání analytiky', 'error');
        }
    }
    
    setupUserActivityChart() {
        const canvas = document.getElementById('userActivityChart');
        if (canvas) {
            canvas.style.display = 'none';
            canvas.parentElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    📈 Graf aktivity uživatelů<br>
                    <small>Bude implementován s Chart.js</small>
                </div>
            `;
        }
    }
    
    setupQuestionSuccessChart() {
        const canvas = document.getElementById('questionSuccessChart');
        if (canvas) {
            canvas.style.display = 'none';
            canvas.parentElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    🎯 Graf úspěšnosti otázek<br>
                    <small>Bude implementován s Chart.js</small>
                </div>
            `;
        }
    }
    
    loadBattleStats() {
        const battleStats = document.getElementById('battleStats');
        if (!battleStats) return;
        
        const battleHistory = this.loadFromStorage('battle_history') || [];
        
        battleStats.innerHTML = `
            <div class="battle-stat">
                <span>Celkem bitev:</span>
                <strong>${battleHistory.length}</strong>
            </div>
            <div class="battle-stat">
                <span>Aktivních bitev:</span>
                <strong>0</strong>
            </div>
            <div class="battle-stat">
                <span>Průměrná doba:</span>
                <strong>5:30</strong>
            </div>
            <div class="battle-stat">
                <span>Nejpopulárnější tabulka:</span>
                <strong>Tabulka1</strong>
            </div>
        `;
    }
    
    loadTopUsers() {
        const topUsers = document.getElementById('topUsers');
        if (!topUsers) return;
        
        const users = this.loadFromStorage('users') || {};
        const userArray = Object.entries(users)
            .map(([username, data]) => ({
                username,
                score: (data.totalCorrect || 0) - (data.totalWrong || 0)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        
        topUsers.innerHTML = userArray.map((user, index) => `
            <div class="top-user">
                <span>${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]} ${user.username}</span>
                <strong>${user.score} bodů</strong>
            </div>
        `).join('');
    }
    
    async loadSystemData() {
        try {
            // Load system metrics
            this.loadSystemMetrics();
            
            // Check server status
            this.checkServerStatus();
            
        } catch (error) {
            Logger.error('Failed to load system data', error);
            this.showNotification('Chyba při načítání systémových dat', 'error');
        }
    }
    
    loadSystemMetrics() {
        const metrics = document.getElementById('systemMetrics');
        if (!metrics) return;
        
        const users = this.loadFromStorage('users') || {};
        const questions = this.loadFromStorage('custom_questions') || [];
        const history = this.loadFromStorage('user_answer_history') || {};
        
        const storageSize = this.calculateStorageSize();
        const totalAnswers = Object.values(history).reduce((sum, userHistory) => sum + userHistory.length, 0);
        
        metrics.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">Velikost úložiště:</span>
                <span class="metric-value">${storageSize} KB</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Celkem odpovědí:</span>
                <span class="metric-value">${totalAnswers}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Vlastní otázky:</span>
                <span class="metric-value">${questions.length}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Verze aplikace:</span>
                <span class="metric-value">v2.0.0</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Posledí zálohování:</span>
                <span class="metric-value">Nikdy</span>
            </div>
        `;
    }
    
    calculateStorageSize() {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
            }
        }
        return Math.round(totalSize / 1024);
    }
    
    async checkServerStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        const backendStatus = document.getElementById('backendStatus');
        const databaseStatus = document.getElementById('databaseStatus');
        const serverVersion = document.getElementById('serverVersion');
        
        if (!statusIndicator) return;
        
        statusIndicator.textContent = '🟡 Kontroluji...';
        if (backendStatus) backendStatus.textContent = 'Kontroluji...';
        if (databaseStatus) databaseStatus.textContent = 'Kontroluji...';
        
        try {
            const isOnline = await APIClient.healthCheck();
            
            if (isOnline) {
                statusIndicator.textContent = '🟢 Online';
                if (backendStatus) backendStatus.textContent = 'Online';
                if (databaseStatus) databaseStatus.textContent = 'Online';
                if (serverVersion) serverVersion.textContent = 'v1.0.0';
            } else {
                throw new Error('Server nedostupný');
            }
            
        } catch (error) {
            statusIndicator.textContent = '🔴 Offline';
            if (backendStatus) backendStatus.textContent = 'Offline';
            if (databaseStatus) databaseStatus.textContent = 'Neznámé';
            if (serverVersion) serverVersion.textContent = 'Neznámé';
        }
    }
    
    // Modal management
    showAddUserModal() {
        this.showModal('addUserModal');
    }
    
    showAddQuestionModal() {
        // Populate table dropdown
        const tableSelect = document.getElementById('questionTable');
        if (tableSelect) {
            tableSelect.innerHTML = '<option value="">Vyberte tabulku</option>';
            ['Tabulka1', 'Databáze'].forEach(tableName => {
                const option = document.createElement('option');
                option.value = tableName;
                option.textContent = tableName;
                tableSelect.appendChild(option);
            });
        }
        
        this.showModal('addQuestionModal');
    }
    
    // CRUD operations
    async handleAddUser(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('newUsername') || document.getElementById('newUsername').value,
            email: formData.get('newUserEmail') || document.getElementById('newUserEmail').value,
            password: formData.get('newUserPassword') || document.getElementById('newUserPassword').value,
            role: formData.get('newUserRole') || document.getElementById('newUserRole').value,
            createdAt: new Date().toISOString().split('T')[0],
            totalCorrect: 0,
            totalWrong: 0
        };
        
        try {
            const users = this.loadFromStorage('users') || {};
            
            if (users[userData.username]) {
                this.showNotification('Uživatel již existuje', 'error');
                return;
            }
            
            users[userData.username] = userData;
            this.saveToStorage('users', users);
            
            this.showNotification(`Uživatel ${userData.username} byl vytvořen`, 'success');
            this.closeModal('addUserModal');
            form.reset();
            
            // Reload users data
            this.loadUsersData();
            this.loadDashboardData();
            
            Logger.action('User created', { username: userData.username, role: userData.role });
            
        } catch (error) {
            Logger.error('Failed to create user', error);
            this.showNotification('Chyba při vytváření uživatele', 'error');
        }
    }
    
    async handleAddQuestion(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        const questionData = {
            id: Date.now(),
            table: formData.get('questionTable') || document.getElementById('questionTable').value,
            question: formData.get('questionText') || document.getElementById('questionText').value,
            answer_a: formData.get('answerA') || document.getElementById('answerA').value,
            answer_b: formData.get('answerB') || document.getElementById('answerB').value,
            answer_c: formData.get('answerC') || document.getElementById('answerC').value,
            correct_answer: formData.get('correctAnswer') || document.getElementById('correctAnswer').value,
            difficulty: formData.get('questionDifficulty') || document.getElementById('questionDifficulty').value,
            explanation: formData.get('questionExplanation') || document.getElementById('questionExplanation').value,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser
        };
        
        try {
            const questions = this.loadFromStorage('custom_questions') || [];
            questions.push(questionData);
            this.saveToStorage('custom_questions', questions);
            
            this.showNotification('Otázka byla přidána', 'success');
            this.closeModal('addQuestionModal');
            form.reset();
            
            // Reload questions data
            this.loadQuestionsData();
            this.loadDashboardData();
            
            Logger.action('Question created', { id: questionData.id, table: questionData.table });
            
        } catch (error) {
            Logger.error('Failed to create question', error);
            this.showNotification('Chyba při vytváření otázky', 'error');
        }
    }
    
    // User actions
    editUser(username) {
        this.showNotification(`Úprava uživatele ${username} - funkce bude implementována`, 'info');
    }
    
    viewUserStats(username) {
        const users = this.loadFromStorage('users') || {};
        const user = users[username];
        const history = this.loadFromStorage('user_answer_history') || {};
        const userHistory = history[username] || [];
        
        if (!user) {
            this.showNotification('Uživatel nenalezen', 'error');
            return;
        }
        
        const stats = `
Statistiky uživatele: ${username}
Role: ${user.role || 'user'}
Správně: ${user.totalCorrect || 0}
Špatně: ${user.totalWrong || 0}
Celkem odpovědí: ${userHistory.length}
Registrace: ${user.createdAt || 'Neznámé'}
        `.trim();
        
        alert(stats);
    }
    
    deleteUser(username) {
        if (!confirm(`Opravdu chcete smazat uživatele ${username}?`)) {
            return;
        }
        
        try {
            const users = this.loadFromStorage('users') || {};
            delete users[username];
            this.saveToStorage('users', users);
            
            // Also remove user history
            const history = this.loadFromStorage('user_answer_history') || {};
            delete history[username];
            this.saveToStorage('user_answer_history', history);
            
            this.showNotification(`Uživatel ${username} byl smazán`, 'success');
            this.loadUsersData();
            this.loadDashboardData();
            
            Logger.action('User deleted', { username });
            
        } catch (error) {
            Logger.error('Failed to delete user', error);
            this.showNotification('Chyba při mazání uživatele', 'error');
        }
    }
    
    // System actions
    showSystemInfo() {
        const info = `
Informace o systému:
- Verze aplikace: v2.0.0 Modular
- Celkem uživatelů: ${this.analytics.totalUsers}
- Celkem otázek: ${this.analytics.totalQuestions}
- Velikost úložiště: ${this.calculateStorageSize()} KB
- Browser: ${navigator.userAgent.split(' ')[0]}
- Platform: ${navigator.platform}
        `.trim();
        
        alert(info);
    }
    
    cleanupData() {
        if (!confirm('Opravdu chcete vyčistit stará data? Tato akce je nevratná.')) {
            return;
        }
        
        try {
            // Clean old entries from history
            const history = this.loadFromStorage('user_answer_history') || {};
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Keep last 3 months
            
            Object.keys(history).forEach(username => {
                history[username] = history[username].filter(entry => {
                    const entryDate = new Date(entry.timestamp);
                    return entryDate > cutoffDate;
                });
            });
            
            this.saveToStorage('user_answer_history', history);
            
            this.showNotification('Data byla vyčištěna', 'success');
            Logger.action('Data cleanup completed');
            
        } catch (error) {
            Logger.error('Failed to cleanup data', error);
            this.showNotification('Chyba při čištění dat', 'error');
        }
    }
    
    backupDatabase() {
        try {
            const backup = {
                users: this.loadFromStorage('users'),
                questions: this.loadFromStorage('custom_questions'),
                tables: this.loadFromStorage('custom_tables'),
                history: this.loadFromStorage('user_answer_history'),
                results: this.loadFromStorage('quiz_results'),
                timestamp: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(backup, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `quiz-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Záloha byla stažena', 'success');
            Logger.action('Database backup created');
            
        } catch (error) {
            Logger.error('Failed to backup database', error);
            this.showNotification('Chyba při vytváření zálohy', 'error');
        }
    }
    
    // Utility methods
    setLoading(elementId, loading) {
        const element = document.getElementById(elementId);
        if (element) {
            if (loading) {
                element.classList.add('loading');
            } else {
                element.classList.remove('loading');
            }
        }
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
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        Logger.info(`Notification: ${type}`, { message });
    }
    
    logout() {
        const confirmed = confirm('Opravdu se chcete odhlásit?');
        if (!confirmed) return;
        
        Logger.action('Admin logout', { user: this.currentUser });
        
        sessionStorage.removeItem('currentUser');
        window.location.href = '../auth/login.html';
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
    const adminModule = new AdminModule();
    window.adminModule = adminModule; // Make globally available
    
    Logger.success('Admin module loaded successfully');
});

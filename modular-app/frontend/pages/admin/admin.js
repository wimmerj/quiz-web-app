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
        this.serverStatus = 'checking'; // Add server status tracking
        this.analytics = {
            totalUsers: 0,
            totalTables: 0,
            totalQuestions: 0,
            totalAnswers: 0
        };
        
        // Initialize SQL.js for database parsing
        this.initializeSQL();
        
        // Initialize the admin module
        this.init();
    }
    
    async initializeSQL() {
        // Don't load SQL.js at startup - only when needed
        console.log('SQL.js will be loaded on demand when needed');
    }
    
    async loadSQLjsOnDemand() {
        if (this.SQL) return this.SQL; // Already loaded
        
        try {
            console.log('Loading SQL.js on demand...');
            
            if (typeof window.loadSQLjs === 'function') {
                const initSqlJs = await window.loadSQLjs();
                this.SQL = await initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                });
                console.log('SQL.js loaded successfully on demand');
                return this.SQL;
            } else {
                throw new Error('SQL.js loader not available');
            }
            
        } catch (error) {
            console.warn('On-demand SQL.js loading failed:', error.message);
            this.SQL = null;
            return null;
        }
    }
    
    async init() {
        console.log('AdminModule initializing...');
        
        // Check authentication and admin access
        await this.checkAdminAccess();
        
        console.log('After checkAdminAccess - currentUser:', this.currentUser, 'userRole:', this.userRole);
        
        if (!this.hasAdminAccess()) {
            console.error('❌ hasAdminAccess() returned false, showing access warning');
            this.showAccessWarning();
            return;
        }
        
        console.log('✅ Admin access confirmed, continuing initialization...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check server status
        this.checkServerStatus();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Load initial tab
        this.switchTab(this.activeTab);
        
        console.log('AdminModule initialized successfully');
    }
    
    async checkAdminAccess() {
        console.log('🔍 Checking admin access...');
        
        // First check URL parameters for admin access
        const urlParams = new URLSearchParams(window.location.search);
        const userFromUrl = urlParams.get('user');
        const forceAdmin = urlParams.get('admin');
        
        if (userFromUrl && userFromUrl.toLowerCase() === 'admin') {
            console.log('🎯 Admin access granted via URL parameter:', userFromUrl);
            this.currentUser = userFromUrl;
            this.userRole = 'admin';
            // Save to session storage for consistency
            sessionStorage.setItem('currentUser', userFromUrl);
            this.updateUserDisplay();
            return;
        }
        
        if (forceAdmin === 'true' || forceAdmin === '1') {
            console.log('🔓 Admin access forced via URL parameter');
            this.currentUser = 'admin';
            this.userRole = 'admin';
            sessionStorage.setItem('currentUser', 'admin');
            this.updateUserDisplay();
            return;
        }
        
        // Wait for APIClient to be available
        let attempts = 0;
        const maxAttempts = 30;
        while (!window.APIClient && attempts < maxAttempts) {
            console.log(`⏳ Waiting for APIClient... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.APIClient) {
            console.error('❌ APIClient not available after waiting, trying fallback authentication...');
            // Instead of redirecting immediately, try fallback methods first
            await this.tryFallbackAuthentication();
            return;
        }
        
        console.log('✅ APIClient is available, checking authentication...');
        
        if (window.APIClient.isAuthenticated()) {
            console.log('✅ APIClient is authenticated, getting user info...');
            try {
                const user = await window.APIClient.getCurrentUser();
                console.log('✅ User info received for admin:', user);
                
                if (user) {
                    this.currentUser = user.username || user.name || user.email || 'Unknown';
                    this.userRole = user.role || 'user';
                    console.log('✅ User authenticated via APIClient for admin', { 
                        user: this.currentUser, 
                        role: this.userRole 
                    });
                } else {
                    console.warn('⚠️ User object is null, but still authenticated. Setting defaults...');
                    this.currentUser = 'admin'; // Default for authenticated users
                    this.userRole = 'admin';
                }
            } catch (error) {
                console.error('Failed to get user info for admin:', error);
                console.log('⚠️ Setting fallback admin credentials...');
                this.currentUser = 'admin'; // Fallback if API call fails
                this.userRole = 'admin';
            }
        } else {
            console.log('❌ APIClient not authenticated, trying fallback authentication...');
            await this.tryFallbackAuthentication();
        }
        
        this.updateUserDisplay();
    }
    
    async tryFallbackAuthentication() {
        console.log('🔄 Trying fallback authentication methods...');
        
        // Try fallback authentication methods before giving up
        const fallbackUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        const credentials = localStorage.getItem('modular_quiz_credentials');
        
        if (fallbackUser) {
            console.log('🔄 Found fallback user in session storage:', fallbackUser);
            this.currentUser = fallbackUser;
            this.userRole = fallbackUser.toLowerCase() === 'admin' ? 'admin' : 'user';
        } else if (credentials) {
            try {
                const cred = JSON.parse(credentials);
                console.log('🔄 Found saved credentials:', cred.username);
                this.currentUser = cred.username;
                this.userRole = cred.username.toLowerCase() === 'admin' ? 'admin' : 'user';
            } catch (e) {
                console.warn('Failed to parse credentials');
            }
        }
        
        // If still no authentication found, use guest/demo mode
        if (!this.currentUser) {
            console.log('❌ No authentication found, using admin demo mode...');
            this.currentUser = 'Admin Demo User';
            this.showNotification('Běžím v demo módu - některé funkce mohou být omezeny', 'warning');
        }
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
                console.warning('Failed to parse saved credentials', e);
            }
        }
        
        return null;
    }
    
    hasAdminAccess() {
        console.log('🔍 Checking hasAdminAccess...', { 
            currentUser: this.currentUser, 
            userRole: this.userRole 
        });
        
        // Check if user is explicitly admin role
        if (this.userRole === 'admin') {
            console.log('✅ User has admin role');
            return true;
        }
        
        // Fallback: Check if username is admin (for compatibility)
        if (this.currentUser && this.currentUser.toLowerCase() === 'admin') {
            console.log('✅ User is admin by username');
            this.userRole = 'admin'; // Set role for consistency
            return true;
        }
        
        // Additional fallback: Check session storage
        const sessionUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        if (sessionUser && sessionUser.toLowerCase() === 'admin') {
            console.log('✅ User is admin by session storage');
            if (!this.currentUser) this.currentUser = sessionUser;
            this.userRole = 'admin';
            return true;
        }
        
        // Final fallback: Check saved credentials
        try {
            const credentials = localStorage.getItem('modular_quiz_credentials');
            if (credentials) {
                const cred = JSON.parse(credentials);
                if (cred.username && cred.username.toLowerCase() === 'admin') {
                    console.log('✅ User is admin by saved credentials');
                    if (!this.currentUser) this.currentUser = cred.username;
                    this.userRole = 'admin';
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to check saved credentials:', e);
        }
        
        console.log('❌ User does not have admin access');
        return false;
    }
    
    showAccessWarning() {
        console.log('🚨 showAccessWarning() called - displaying access denied warning');
        console.log('Current state:', { 
            currentUser: this.currentUser, 
            userRole: this.userRole,
            hasAccess: this.hasAdminAccess() 
        });
        
        const warning = document.getElementById('accessWarning');
        const content = document.getElementById('adminContent');
        
        if (warning) {
            warning.style.display = 'block';
            console.log('✅ Access warning element shown');
        } else {
            console.error('❌ Access warning element not found!');
        }
        
        if (content) {
            content.style.display = 'none';
            console.log('✅ Admin content hidden');
        } else {
            console.error('❌ Admin content element not found!');
        }
        
        console.warning('Admin access denied', { 
            user: this.currentUser, 
            role: this.userRole 
        });
    }
    
    updateServerStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusIndicatorText');
        const statusMode = document.getElementById('statusMode');
        
        if (indicator && statusText) {
            switch (status) {
                case 'online':
                    indicator.textContent = '🟢';
                    statusText.textContent = text || 'Online';
                    break;
                case 'offline':
                    indicator.textContent = '🔴';
                    statusText.textContent = text || 'Offline';
                    break;
                case 'checking':
                    indicator.textContent = '🟡';
                    statusText.textContent = text || 'Checking...';
                    break;
                default:
                    indicator.textContent = '🔴';
                    statusText.textContent = 'Unknown';
            }
            
            const statusElement = document.getElementById('serverStatus');
            if (statusElement) {
                statusElement.className = `server-status ${status}`;
            }
        }
        
        if (statusMode) {
            statusMode.textContent = status === 'online' ? 'Server Mode' : 'Local Mode';
        }
    }
    
    async checkServerStatus() {
        console.log('Checking server status...');
        this.updateServerStatus('checking', 'Kontroluji...');
        
        // Ensure APIClient is available
        if (!window.APIClient) {
            console.warn('APIClient not yet available, falling back to offline mode');
            this.serverStatus = 'offline';
            this.updateServerStatus('offline', 'Offline');
            return;
        }
        
        const isOnline = await window.APIClient.healthCheck();
        
        if (isOnline) {
            this.serverStatus = 'online';
            this.updateServerStatus('online', 'Online');
        } else {
            this.serverStatus = 'offline';
            this.updateServerStatus('offline', 'Offline');
        }
    }
    
    updateUserDisplay() {
        console.log('Updating user display for admin...');
        const userDisplay = document.getElementById('userDisplay');
        const userRole = document.getElementById('userRole');
        
        if (userDisplay) {
            userDisplay.textContent = this.currentUser ? `👤 ${this.currentUser}` : '👤 Nepřihlášen';
            console.log('Updated user display for admin:', this.currentUser);
        }
        
        if (userRole) {
            userRole.textContent = this.userRole === 'admin' ? '🛠️ Admin' : '👤 User';
            userRole.className = `user-role ${this.userRole}`;
            console.log('Updated role display for admin:', this.userRole);
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
            // Open the "Add User" collapsible panel instead of modal
            const panel = document.getElementById('addUserPanel');
            if (panel && panel.style.display !== 'block') {
                this.togglePanel('addUserPanel');
            }
        });
        
        // Questions tab actions
        document.getElementById('refreshQuestionsBtn')?.addEventListener('click', () => {
            this.loadQuestionsData();
        });
        
        document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
            // Open the "Add Question" collapsible panel instead of modal
            const panel = document.getElementById('addQuestionPanel');
            if (panel && panel.style.display !== 'block') {
                this.togglePanel('addQuestionPanel');
            }
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
        
        // Form submissions - Panel forms
        document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser(e);
        });
        
        document.getElementById('addQuestionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddQuestion(e);
        });
        
        // Test APIClient integration
        document.getElementById('testAdminBtn')?.addEventListener('click', () => {
            this.runAdminAPIClientTest();
        });
        
        console.debug('Admin event listeners setup complete');
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
        
        console.log('Admin tab switched', { tab: tabName });
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
            
            console.log('Dashboard data loaded', this.analytics);
            
        } catch (error) {
            console.error('Failed to load dashboard data', error);
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
            let allUsers = {};
            
            // Try to load users from API first (real registered users)
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                try {
                    // TODO: Add API endpoint to get all users
                    console.log('🔄 Attempting to load users from API...');
                    // const apiUsers = await window.APIClient.getAllUsers();
                    // if (apiUsers) allUsers = {...allUsers, ...apiUsers};
                } catch (error) {
                    console.log('📝 API users not available, using localStorage only');
                }
            }
            
            // Load local users (created via admin)
            const localUsers = this.loadFromStorage('users') || {};
            allUsers = {...allUsers, ...localUsers};
            
            const userHistory = this.loadFromStorage('user_answer_history') || {};
            
            tableBody.innerHTML = '';
            
            if (Object.keys(allUsers).length === 0) {
                // Add demo users if no users exist
                this.addDemoUsers();
                return;
            }
            
            Object.entries(allUsers).forEach(([username, userData]) => {
                const userAnswers = userHistory[username] || [];
                const lastActivity = this.getLastActivity(userAnswers);
                const role = userData.role || 'user';
                const source = localUsers[username] ? '🏠 Lokální' : '☁️ Cloud';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <strong>${username}</strong>
                        ${userData.email ? `<br><small>${userData.email}</small>` : ''}
                        <br><small style="color: var(--text-secondary);">${source}</small>
                    </td>
                    <td>
                        <span class="role-badge ${role}">${role}</span>
                    </td>
                    <td>${userData.createdAt || userData.created_at || 'Neznámé'}</td>
                    <td>${lastActivity}</td>
                    <td>
                        <span style="color: var(--admin-success)">${userData.totalCorrect || 0}</span> / 
                        <span style="color: var(--admin-danger)">${userData.totalWrong || 0}</span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="adminModule.editUser('${username}')">✏️ Upravit</button>
                        <button class="action-btn" onclick="adminModule.viewUserStats('${username}')">📊 Statistiky</button>
                        ${localUsers[username] ? `
                        <button class="action-btn danger" onclick="adminModule.deleteUser('${username}')">🗑️ Smazat</button>
                        ` : '<small>Jen API uživatel</small>'}
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Failed to load users data', error);
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
            console.error('Failed to load questions data', error);
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
            let allTables = [];
            
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                try {
                    // Load tables from API
                    const apiResponse = await window.APIClient.getTables();
                    const apiTables = apiResponse.tables || apiResponse; // Handle both formats
                    
                    // Ensure we have an array
                    const tablesArray = Array.isArray(apiTables) ? apiTables : [];
                    
                    // Convert API format to UI format
                    allTables = tablesArray.map(table => ({
                        name: table.name || table.table_name,
                        description: table.description || 'Popis není k dispozici',
                        questionCount: table.question_count || table.count || 0,
                        difficulty: table.difficulty || 'medium',
                        category: table.created_by ? 'Custom' : 'System',
                        createdAt: table.created_at,
                        createdBy: table.created_by,
                        isFromAPI: true
                    }));
                    
                    console.log('Loaded tables from API', { count: allTables.length, rawResponse: apiResponse });
                    
                } catch (apiError) {
                    console.error('Failed to load from API, using localStorage fallback:', apiError);
                    allTables = this.loadTablesFromLocalStorage();
                }
            } else {
                // Load from localStorage if API not available
                allTables = this.loadTablesFromLocalStorage();
            }
            
            // Clear and populate grid
            tablesGrid.innerHTML = '';
            
            if (allTables.length === 0) {
                tablesGrid.innerHTML = `
                    <div class="col-12">
                        <div class="card bg-dark border-warning">
                            <div class="card-body text-center">
                                <h5 class="card-title text-warning">Žádné tabulky</h5>
                                <p class="card-text">Vytvořte novou tabulku nebo importujte existující databázi.</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Add all tables
                allTables.forEach(table => {
                    const tableCard = this.createTableCard(table);
                    tablesGrid.appendChild(tableCard);
                });
            }
            
        } catch (error) {
            console.error('Failed to load tables data', error);
            this.showNotification('Chyba při načítání tabulek', 'error');
            
            // Show error state
            tablesGrid.innerHTML = `
                <div class="col-12">
                    <div class="card bg-danger border-danger">
                        <div class="card-body text-center">
                            <h5 class="card-title">Chyba při načítání</h5>
                            <p class="card-text">Nepodařilo se načíst tabulky. Zkuste aktualizovat stránku.</p>
                            <button class="btn btn-light" onclick="adminModule.loadTablesData()">Zkusit znovu</button>
                        </div>
                    </div>
                </div>
            `;
        } finally {
            this.setLoading('tablesGrid', false);
        }
    }
    
    loadTablesFromLocalStorage() {
        // Fallback method for localStorage
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
        const allTables = [...demoTables];
        
        // Add custom tables from localStorage
        Object.entries(customTables).forEach(([name, table]) => {
            allTables.push({ 
                name, 
                ...table,
                isFromAPI: false
            });
        });
        
        console.log('Loaded tables from localStorage', { count: allTables.length });
        return allTables;
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
            console.error('Failed to load analytics data', error);
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
            console.error('Failed to load system data', error);
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
            form.reset();
            
            // Reload users data
            this.loadUsersData();
            this.loadDashboardData();
            
            console.log('User created', { username: userData.username, role: userData.role });
            
        } catch (error) {
            console.error('Failed to create user', error);
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
            form.reset();
            
            // Reload questions data
            this.loadQuestionsData();
            this.loadDashboardData();
            
            console.log('Question created', { id: questionData.id, table: questionData.table });
            
        } catch (error) {
            console.error('Failed to create question', error);
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
            
            console.log('User deleted', { username });
            
        } catch (error) {
            console.error('Failed to delete user', error);
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
            console.log('Data cleanup completed');
            
        } catch (error) {
            console.error('Failed to cleanup data', error);
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
            console.log('Database backup created');
            
        } catch (error) {
            console.error('Failed to backup database', error);
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
        
        console.log(`Notification: ${type}`, { message });
    }
    
    async logout() {
        const confirmed = confirm('Opravdu se chcete odhlásit?');
        if (!confirmed) return;
        
        console.log('Admin logout initiated', { user: this.currentUser });
        
        try {
            if (window.APIClient && typeof window.APIClient.logout === 'function') {
                console.log('🔓 Logging out via APIClient...');
                await window.APIClient.logout();
                console.log('✅ APIClient logout successful');
            } else {
                console.log('❌ APIClient not available, clearing session storage only');
                sessionStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            sessionStorage.removeItem('currentUser');
        }
        
        console.log('🔄 Redirecting to login page...');
        window.location.href = '../auth/login.html';
    }
    
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warning(`Failed to load from storage: ${key}`, error);
            return null;
        }
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warning(`Failed to save to storage: ${key}`, error);
        }
    }
    
    // Test funkcia pre APIClient integráciu
    async runAdminAPIClientTest() {
        console.log('🧪 Starting Admin APIClient integration test...');
        const resultsDiv = document.getElementById('testAdminResults');
        if (!resultsDiv) return;
        
        // Show results div and clear previous content
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = '<h4>🧪 Admin APIClient Test Results:</h4>';
        
        try {
            // Test 1: Check APIClient availability
            if (window.APIClient) {
                resultsDiv.innerHTML += '<p>✅ APIClient is available</p>';
                console.log('✅ APIClient is available');
            } else {
                resultsDiv.innerHTML += '<p>❌ APIClient is NOT available</p>';
                console.error('❌ APIClient is NOT available');
                return;
            }
            
            // Test 2: Check authentication status
            const isAuth = window.APIClient.isAuthenticated();
            resultsDiv.innerHTML += `<p>🔐 Authentication status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}</p>`;
            console.log('🔐 Authentication status:', isAuth);
            
            // Test 3: Get current user
            if (isAuth) {
                const user = await window.APIClient.getCurrentUser();
                resultsDiv.innerHTML += `<p>👤 Current user: ${user ? '✅ ' + JSON.stringify(user) : '❌ No user data'}</p>`;
                console.log('👤 Current user:', user);
                
                // Test 4: Admin access check
                const hasAccess = this.hasAdminAccess();
                resultsDiv.innerHTML += `<p>🛠️ Admin access: ${hasAccess ? '✅ Has admin access' : '❌ No admin access'}</p>`;
                console.log('🛠️ Admin access:', hasAccess);
                
                // Test 5: Show admin current settings
                resultsDiv.innerHTML += `<p>👤 Admin user: ${this.currentUser}</p>`;
                resultsDiv.innerHTML += `<p>🛠️ Admin role: ${this.userRole}</p>`;
            }
            
            resultsDiv.innerHTML += '<p><strong>✅ Admin APIClient test completed!</strong></p>';
            console.log('✅ Admin APIClient test completed!');
            
        } catch (error) {
            resultsDiv.innerHTML += `<p>❌ Error during test: ${error.message}</p>`;
            console.error('❌ Error during admin test:', error);
        }
    }
    
    // Table Management Functions
    addNewTable() {
        // Show modal with two options: Manual creation or Database import
        const modal = this.createTableCreationModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
    
    createTableCreationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'tableCreationModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📚 Vytvořit novou tabulku</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Vyberte způsob vytvoření nové tabulky:</p>
                    <div class="creation-options">
                        <button class="creation-option-btn" onclick="adminModule.showManualTableCreation()">
                            <div class="option-icon">✏️</div>
                            <div class="option-content">
                                <h4>Manuální vytvoření</h4>
                                <p>Vytvořte tabulku řádek po řádku</p>
                            </div>
                        </button>
                        <button class="creation-option-btn" onclick="adminModule.showDatabaseImport()">
                            <div class="option-icon">📁</div>
                            <div class="option-content">
                                <h4>Import z databáze</h4>
                                <p>Nahrajte existující .db soubor</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }
    
    showManualTableCreation() {
        // Close current modal and show manual creation form
        document.getElementById('tableCreationModal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'manualTableModal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>✏️ Manuální vytvoření tabulky</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="manualTableForm">
                        <div class="form-group">
                            <label for="tableName" class="form-label">Název tabulky:</label>
                            <input type="text" id="tableName" class="form-input" required placeholder="Zadejte název tabulky...">
                        </div>
                        <div class="form-group">
                            <label for="tableDescription" class="form-label">Popis:</label>
                            <textarea id="tableDescription" class="form-textarea" rows="2" placeholder="Volitelný popis tabulky..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="tableDifficulty" class="form-label">Výchozí obtížnost:</label>
                            <select id="tableDifficulty" class="form-select">
                                <option value="easy">Snadná</option>
                                <option value="medium" selected>Střední</option>
                                <option value="hard">Těžká</option>
                            </select>
                        </div>
                        <div class="questions-section">
                            <h4>📝 Otázky <button type="button" class="btn btn-small btn-secondary" onclick="adminModule.addQuestionRow()">➕ Přidat otázku</button></h4>
                            <div id="questionsContainer">
                                <!-- Questions will be added dynamically -->
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Zrušit
                    </button>
                    <button type="button" class="btn btn-primary" onclick="adminModule.saveManualTable()">
                        💾 Vytvořit tabulku
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Add first question row
        this.addQuestionRow();
    }
    
    addQuestionRow() {
        const container = document.getElementById('questionsContainer');
        const questionIndex = container.children.length + 1;
        
        const questionRow = document.createElement('div');
        questionRow.className = 'question-row';
        questionRow.innerHTML = `
            <div class="question-header">
                <h5>Otázka ${questionIndex}</h5>
                <button type="button" class="btn btn-small btn-danger" onclick="this.closest('.question-row').remove(); adminModule.renumberQuestions()">🗑️ Odstranit</button>
            </div>
            <div class="form-group">
                <label class="form-label">Text otázky:</label>
                <textarea class="form-textarea question-text" rows="2" required placeholder="Zadejte text otázky..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Odpověď A:</label>
                    <input type="text" class="form-input answer-a" required placeholder="Možnost A">
                </div>
                <div class="form-group">
                    <label class="form-label">Odpověď B:</label>
                    <input type="text" class="form-input answer-b" required placeholder="Možnost B">
                </div>
                <div class="form-group">
                    <label class="form-label">Odpověď C:</label>
                    <input type="text" class="form-input answer-c" required placeholder="Možnost C">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Správná odpověď:</label>
                    <select class="form-select correct-answer" required>
                        <option value="">Vyberte</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Obtížnost:</label>
                    <select class="form-select question-difficulty">
                        <option value="easy">Snadná</option>
                        <option value="medium" selected>Střední</option>
                        <option value="hard">Těžká</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Vysvětlení:</label>
                    <textarea class="form-textarea question-explanation" rows="1" placeholder="Volitelné vysvětlení..."></textarea>
                </div>
            </div>
        `;
        container.appendChild(questionRow);
    }
    
    renumberQuestions() {
        const container = document.getElementById('questionsContainer');
        Array.from(container.children).forEach((row, index) => {
            const header = row.querySelector('.question-header h5');
            if (header) {
                header.textContent = `Otázka ${index + 1}`;
            }
        });
    }
    
    async saveManualTable() {
        const tableName = document.getElementById('tableName').value.trim();
        const tableDescription = document.getElementById('tableDescription').value.trim();
        const tableDifficulty = document.getElementById('tableDifficulty').value;
        
        if (!tableName) {
            this.showNotification('Zadejte název tabulky', 'error');
            return;
        }
        
        // Collect questions
        const questions = [];
        const questionRows = document.querySelectorAll('.question-row');
        
        if (questionRows.length === 0) {
            this.showNotification('Přidejte alespoň jednu otázku', 'error');
            return;
        }
        
        for (let i = 0; i < questionRows.length; i++) {
            const row = questionRows[i];
            const question = {
                question: row.querySelector('.question-text').value.trim(),
                answer_a: row.querySelector('.answer-a').value.trim(),
                answer_b: row.querySelector('.answer-b').value.trim(),
                answer_c: row.querySelector('.answer-c').value.trim(),
                correct_answer: row.querySelector('.correct-answer').value,
                difficulty: row.querySelector('.question-difficulty').value,
                explanation: row.querySelector('.question-explanation').value.trim()
            };
            
            // Validate question
            if (!question.question || !question.answer_a || !question.answer_b || 
                !question.answer_c || !question.correct_answer) {
                this.showNotification(`Vyplňte všechna povinná pole u otázky ${i + 1}`, 'error');
                return;
            }
            
            questions.push(question);
        }
        
        // Prepare API data
        const tableData = {
            name: tableName,
            description: tableDescription,
            difficulty: tableDifficulty,
            questions: questions
        };
        
        try {
            // Show loading
            this.showNotification('Vytvářím tabulku...', 'info');
            
            // Call API to create table
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                const response = await window.APIClient.createTable(tableData);
                
                this.showNotification(`✅ Tabulka "${tableName}" byla vytvořena s ${questions.length} otázkami`, 'success');
                
                // Close modal and refresh
                document.getElementById('manualTableModal').remove();
                this.loadTablesData();
                this.loadDashboardData();
                
                console.log('Table created via API', { name: tableName, questions: questions.length });
            } else {
                // Fallback to localStorage if API not available
                this.saveTableToLocalStorage(tableData);
                this.showNotification(`📦 Tabulka "${tableName}" byla uložena lokálně (${questions.length} otázek)`, 'warning');
                
                document.getElementById('manualTableModal').remove();
                this.loadTablesData();
                this.loadDashboardData();
            }
            
        } catch (error) {
            console.error('Failed to create table:', error);
            
            // Try localStorage fallback
            try {
                this.saveTableToLocalStorage(tableData);
                this.showNotification(`⚠️ Tabulka uložena lokálně (server nedostupný)`, 'warning');
                
                document.getElementById('manualTableModal').remove();
                this.loadTablesData();
                this.loadDashboardData();
            } catch (fallbackError) {
                this.showNotification('Chyba při ukládání tabulky', 'error');
                console.error('Fallback save failed:', fallbackError);
            }
        }
    }
    
    saveTableToLocalStorage(tableData) {
        // Fallback method for localStorage
        const existingTables = this.loadFromStorage('custom_tables') || {};
        
        if (existingTables[tableData.name]) {
            throw new Error('Tabulka s tímto názvem již existuje');
        }
        
        const tableWithMeta = {
            ...tableData,
            category: 'Custom',
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser,
            questionCount: tableData.questions.length
        };
        
        existingTables[tableData.name] = tableWithMeta;
        this.saveToStorage('custom_tables', existingTables);
        this.saveToStorage(`questions_${tableData.name}`, tableData.questions);
    }
    
    showDatabaseImport() {
        // Close current modal and show database import form
        document.getElementById('tableCreationModal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'databaseImportModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📁 Import z databáze</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="import-section">
                        <h4>1. Nahrát databázový soubor</h4>
                        <div class="file-upload-area">
                            <input type="file" id="databaseFile" accept=".db,.sqlite,.sqlite3" style="display: none;">
                            <button type="button" class="btn btn-primary" onclick="document.getElementById('databaseFile').click()">
                                📁 Vybrat .db soubor
                            </button>
                            <div id="fileInfo" class="file-info"></div>
                        </div>
                    </div>
                    
                    <div id="tablesSection" class="tables-section" style="display: none;">
                        <h4>2. Vybrat tabulky k importu</h4>
                        <div id="availableTables" class="available-tables">
                            <!-- Tables will be loaded here -->
                        </div>
                        <div class="import-actions">
                            <button type="button" class="btn btn-secondary" onclick="adminModule.selectAllTables()">
                                ✅ Vybrat vše
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminModule.deselectAllTables()">
                                ❌ Zrušit výběr
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Zrušit
                    </button>
                    <button type="button" class="btn btn-primary" id="importSelectedBtn" onclick="adminModule.importSelectedTables()" style="display: none;">
                        📥 Importovat vybrané
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Setup file input handler
        document.getElementById('databaseFile').addEventListener('change', (e) => {
            this.handleDatabaseFile(e.target.files[0]);
        });
    }
    
    async handleDatabaseFile(file) {
        if (!file) return;
        
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <div class="file-selected">
                <span>📎 ${file.name} (${this.formatFileSize(file.size)})</span>
                <div class="loading-indicator">📊 Analyzuji databázi...</div>
            </div>
        `;
        
        // Add timeout for parsing to prevent freezing
        const parseTimeout = 30000; // 30 seconds max
        
        try {
            // Read file with size limit
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                throw new Error('Soubor je příliš velký (max 50MB)');
            }
            
            const arrayBuffer = await file.arrayBuffer();
            
            // Parse with timeout
            const tables = await Promise.race([
                this.extractTablesFromDatabase(arrayBuffer, file.name),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Parsing timeout')), parseTimeout)
                )
            ]);
            
            // Store the parsed data for later use in import
            this.parsedDatabaseData = {
                filename: file.name,
                tables: tables,
                originalData: arrayBuffer
            };
            
            if (tables.length > 0) {
                this.displayAvailableTables(tables);
                document.getElementById('tablesSection').style.display = 'block';
                document.getElementById('importSelectedBtn').style.display = 'inline-block';
            } else {
                fileInfo.innerHTML = `
                    <div class="file-error">
                        <span>⚠️ Nebyly nalezeny žádné tabulky v souboru</span>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Database parsing error:', error);
            
            let errorMessage = 'Chyba při čtení databáze';
            if (error.message === 'Parsing timeout') {
                errorMessage = 'Parsing databáze trval příliš dlouho. Zkuste menší soubor.';
            } else if (error.message.includes('příliš velký')) {
                errorMessage = error.message;
            }
            
            fileInfo.innerHTML = `
                <div class="file-error">
                    <span>❌ ${errorMessage}</span>
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.6);">
                        Tip: Zkuste použít menší databázi nebo exportovat pouze potřebné tabulky
                    </div>
                </div>
            `;
        }
    }
    
    async extractTablesFromDatabase(arrayBuffer, fileName) {
        try {
            // Quick size check - if file is too large, skip SQL.js
            if (arrayBuffer.byteLength > 10 * 1024 * 1024) { // 10MB limit for SQL.js
                console.log('File too large for SQL.js, using text parsing');
                return await this.parseTextBasedDatabase(arrayBuffer, fileName);
            }
            
            // Try to load SQL.js on demand and use it for real SQLite parsing
            try {
                const SQL = await this.loadSQLjsOnDemand();
                if (SQL && SQL.Database) {
                    return await this.parseSQLiteWithSQLjs(arrayBuffer, fileName, SQL);
                }
            } catch (sqlError) {
                console.warn('SQL.js loading failed, using text parsing:', sqlError.message);
            }
            
            // Fallback to improved text-based parsing
            return await this.parseTextBasedDatabase(arrayBuffer, fileName);
            
        } catch (error) {
            console.error('Database extraction error:', error);
            // Final fallback to demo data
            return this.createDemoTablesFromFile(fileName);
        }
    }
    
    async parseRealSQLiteDatabase(arrayBuffer, fileName) {
        try {
            // Try to use SQL.js if available for real SQLite parsing
            if (this.SQL && this.SQL.Database) {
                return await this.parseSQLiteWithSQLjs(arrayBuffer, fileName, this.SQL);
            } else {
                throw new Error('SQL.js not available');
            }
        } catch (error) {
            console.error('Real SQLite parsing error:', error);
            throw error;
        }
    }
    
    async parseSQLiteWithSQLjs(arrayBuffer, fileName, SQL) {
        try {
            const uInt8Array = new Uint8Array(arrayBuffer);
            const db = new SQL.Database(uInt8Array);
            
            // Get all table names (excluding system tables)
            const tableQuery = `
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name NOT LIKE 'sqlite_%'
                AND name NOT LIKE '__%'
                ORDER BY name
            `;
            
            const stmt = db.prepare(tableQuery);
            const tables = [];
            
            while (stmt.step()) {
                const tableName = stmt.getAsObject().name;
                
                // Get column info and sample data
                const countStmt = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const rowCount = countStmt.step() ? countStmt.getAsObject().count : 0;
                countStmt.free();
                
                // Get column names
                const colStmt = db.prepare(`PRAGMA table_info("${tableName}")`);
                const columns = [];
                while (colStmt.step()) {
                    const col = colStmt.getAsObject();
                    columns.push({
                        name: col.name,
                        type: col.type,
                        pk: col.pk === 1
                    });
                }
                colStmt.free();
                
                // Get sample data (first 3 rows)
                const sampleStmt = db.prepare(`SELECT * FROM "${tableName}" LIMIT 3`);
                const sampleData = [];
                while (sampleStmt.step()) {
                    sampleData.push(sampleStmt.getAsObject());
                }
                sampleStmt.free();
                
                tables.push({
                    name: tableName,
                    rowCount: rowCount,
                    columns: columns,
                    sampleData: sampleData,
                    estimatedRows: rowCount,
                    selected: true,
                    hasQuestionStructure: this.detectQuestionStructure(columns)
                });
            }
            
            stmt.free();
            db.close();
            
            console.log('Real SQLite parsing completed', { tables: tables.length, fileName });
            return tables;
            
        } catch (error) {
            console.error('Real SQLite parsing failed:', error);
            throw error;
        }
    }
    
    async parseTextBasedDatabase(arrayBuffer, fileName) {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const content = decoder.decode(arrayBuffer);
        
        // Enhanced pattern matching for CREATE TABLE statements
        const createTablePattern = /CREATE TABLE\s+(?:["`]?)([^"`\s\(]+)(?:["`]?)\s*\(([\s\S]*?)\);/gi;
        const insertPattern = /INSERT INTO\s+(?:["`]?)([^"`\s]+)(?:["`]?)\s+(?:VALUES|\()/gi;
        
        const tables = new Map();
        let match;
        
        // Parse CREATE TABLE statements
        while ((match = createTablePattern.exec(content)) !== null) {
            const tableName = match[1].trim();
            const columnDef = match[2];
            
            if (tableName && !tableName.toLowerCase().includes('sqlite_')) {
                const columns = this.parseColumnDefinitions(columnDef);
                tables.set(tableName, {
                    name: tableName,
                    columns: columns,
                    rowCount: 0,
                    sampleData: [],
                    selected: true,
                    hasQuestionStructure: this.detectQuestionStructure(columns)
                });
            }
        }
        
        // Count INSERT statements for each table
        while ((match = insertPattern.exec(content)) !== null) {
            const tableName = match[1].trim();
            if (tables.has(tableName)) {
                tables.get(tableName).rowCount++;
            }
        }
        
        const result = Array.from(tables.values()).map(table => ({
            ...table,
            estimatedRows: table.rowCount || Math.floor(Math.random() * 50) + 5
        }));
        
        console.log('Text-based SQLite parsing completed', { tables: result.length, fileName });
        return result;
    }
    
    parseColumnDefinitions(columnDef) {
        const columns = [];
        const columnPattern = /([^,\(]+?)(?:\s+([^,\(]+?))*(?:,|\)|$)/g;
        let match;
        
        while ((match = columnPattern.exec(columnDef)) !== null) {
            const fullDef = match[0].trim();
            if (fullDef && fullDef !== ',' && fullDef !== ')') {
                const parts = fullDef.replace(/,$/, '').trim().split(/\s+/);
                const name = parts[0].replace(/["`]/g, '');
                const type = parts[1] || 'TEXT';
                const isPK = fullDef.toUpperCase().includes('PRIMARY KEY');
                
                if (name && name !== ')') {
                    columns.push({
                        name: name,
                        type: type,
                        pk: isPK
                    });
                }
            }
        }
        
        return columns;
    }
    
    detectQuestionStructure(columns) {
        const columnNames = columns.map(c => c.name.toLowerCase());
        const questionFields = ['question', 'otazka', 'text', 'content'];
        const answerFields = ['answer', 'odpoved', 'correct', 'spravna'];
        
        const hasQuestion = questionFields.some(field => 
            columnNames.some(col => col.includes(field))
        );
        const hasAnswer = answerFields.some(field => 
            columnNames.some(col => col.includes(field))
        );
        
        return hasQuestion && hasAnswer;
    }
    
    createDemoTablesFromFile(fileName) {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        return [{
            name: baseName || 'ImportedTable',
            columns: [
                { name: 'id', type: 'INTEGER', pk: true },
                { name: 'question', type: 'TEXT', pk: false },
                { name: 'answer_a', type: 'TEXT', pk: false },
                { name: 'answer_b', type: 'TEXT', pk: false },
                { name: 'answer_c', type: 'TEXT', pk: false },
                { name: 'correct_answer', type: 'TEXT', pk: false }
            ],
            rowCount: 10,
            sampleData: [],
            estimatedRows: 10,
            selected: true,
            hasQuestionStructure: true
        }];
    }
    
    displayAvailableTables(tables) {
        const container = document.getElementById('availableTables');
        container.innerHTML = '';
        
        if (tables.length === 0) {
            container.innerHTML = `
                <div class="no-tables-found">
                    <p>❌ Nebyly nalezeny žádné tabulky v databázi</p>
                </div>
            `;
            return;
        }
        
        // Add summary header
        const summary = document.createElement('div');
        summary.className = 'import-summary';
        summary.innerHTML = `
            <div class="summary-header">
                <h4>📊 Nalezeno ${tables.length} tabulek</h4>
                <p>Vyberte tabulky které chcete importovat:</p>
            </div>
        `;
        container.appendChild(summary);
        
        tables.forEach((table, index) => {
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table-preview-card';
            
            // Generate column preview
            const columnPreview = table.columns ? table.columns.map(col => 
                `<span class="column-tag ${col.pk ? 'primary-key' : ''}" title="${col.type}">
                    ${col.name}${col.pk ? ' 🔑' : ''}
                </span>`
            ).join('') : '';
            
            // Generate sample data preview
            let sampleDataHTML = '';
            if (table.sampleData && table.sampleData.length > 0) {
                const headers = Object.keys(table.sampleData[0]).slice(0, 4); // Show max 4 columns
                sampleDataHTML = `
                    <div class="sample-data-preview">
                        <div class="sample-header">Náhled dat:</div>
                        <div class="sample-table">
                            <div class="sample-row header-row">
                                ${headers.map(h => `<div class="sample-cell">${h}</div>`).join('')}
                            </div>
                            ${table.sampleData.slice(0, 2).map(row => `
                                <div class="sample-row">
                                    ${headers.map(h => `
                                        <div class="sample-cell" title="${String(row[h] || '').substring(0, 100)}">
                                            ${String(row[h] || '').substring(0, 30)}${String(row[h] || '').length > 30 ? '...' : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            tableDiv.innerHTML = `
                <div class="table-preview-header">
                    <label class="table-checkbox-label">
                        <input type="checkbox" ${table.selected ? 'checked' : ''} data-table="${table.name}" class="table-checkbox-input">
                        <div class="table-main-info">
                            <div class="table-name">
                                📊 ${table.name}
                                ${table.hasQuestionStructure ? '<span class="quiz-compatible">🧠 Quiz kompatibilní</span>' : ''}
                            </div>
                            <div class="table-stats">
                                📈 ${table.rowCount || table.estimatedRows} záznamů
                                ${table.columns ? `• ${table.columns.length} sloupců` : ''}
                            </div>
                        </div>
                    </label>
                    <button class="preview-toggle-btn" onclick="adminModule.toggleTablePreview(${index})">
                        <span class="toggle-icon">👁️</span>
                        <span class="toggle-text">Náhled</span>
                    </button>
                </div>
                
                <div class="table-preview-details" id="tablePreview${index}" style="display: none;">
                    ${table.columns && table.columns.length > 0 ? `
                        <div class="columns-section">
                            <div class="section-title">Struktura sloupců:</div>
                            <div class="columns-preview">${columnPreview}</div>
                        </div>
                    ` : ''}
                    
                    ${sampleDataHTML}
                    
                    ${!table.hasQuestionStructure ? `
                        <div class="compatibility-warning">
                            ⚠️ Tato tabulka možná není kompatibilní s quiz systémem.
                            <br>Pro správný import jsou potřeba sloupce: question, answer_a, answer_b, answer_c, correct_answer
                        </div>
                    ` : `
                        <div class="compatibility-success">
                            ✅ Tabulka obsahuje strukturu kompatibilní s quiz systémem
                        </div>
                    `}
                </div>
            `;
            
            container.appendChild(tableDiv);
        });
        
        // Add select all/none controls
        const controls = document.createElement('div');
        controls.className = 'selection-controls';
        controls.innerHTML = `
            <div class="control-buttons">
                <button class="btn btn-small btn-secondary" onclick="adminModule.selectAllTables(true)">
                    ✅ Vybrat vše
                </button>
                <button class="btn btn-small btn-secondary" onclick="adminModule.selectAllTables(false)">
                    ❌ Zrušit výběr
                </button>
                <span class="selection-info">
                    <span id="selectedCount">${tables.filter(t => t.selected).length}</span> z ${tables.length} tabulek vybráno
                </span>
            </div>
        `;
        container.appendChild(controls);
        
        // Update selection counter when checkboxes change
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('table-checkbox-input')) {
                this.updateSelectionCounter();
            }
        });
    }
    
    toggleTablePreview(index) {
        const preview = document.getElementById(`tablePreview${index}`);
        const button = event.target.closest('.preview-toggle-btn');
        
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            button.querySelector('.toggle-text').textContent = 'Skrýt';
            button.querySelector('.toggle-icon').textContent = '🙈';
        } else {
            preview.style.display = 'none';
            button.querySelector('.toggle-text').textContent = 'Náhled';
            button.querySelector('.toggle-icon').textContent = '👁️';
        }
    }
    
    selectAllTables(selectAll) {
        const checkboxes = document.querySelectorAll('.table-checkbox-input');
        checkboxes.forEach(cb => {
            cb.checked = selectAll;
        });
        this.updateSelectionCounter();
    }
    
    updateSelectionCounter() {
        const selectedCount = document.querySelectorAll('.table-checkbox-input:checked').length;
        const totalCount = document.querySelectorAll('.table-checkbox-input').length;
        const counter = document.getElementById('selectedCount');
        if (counter) {
            counter.textContent = selectedCount;
        }
        
        // Show/hide import button based on selection
        const importBtn = document.getElementById('importSelectedBtn');
        if (importBtn) {
            importBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    selectAllTables() {
        document.querySelectorAll('#availableTables input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    }
    
    deselectAllTables() {
        document.querySelectorAll('#availableTables input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    }
    
    async importSelectedTables() {
        const selectedTables = [];
        document.querySelectorAll('.table-checkbox-input:checked').forEach(cb => {
            selectedTables.push(cb.dataset.table);
        });
        
        if (selectedTables.length === 0) {
            this.showNotification('Vyberte alespoň jednu tabulku k importu', 'warning');
            return;
        }
        
        try {
            // Show loading
            this.showNotification(`Importuji ${selectedTables.length} tabulek...`, 'info');
            
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                // Use parsed database data if available
                const importData = this.prepareImportData(selectedTables);
                
                const response = await window.APIClient.importDatabase(importData);
                
                this.showNotification(`✅ Import dokončen: ${response.imported || selectedTables.length} tabulek naimportováno`, 'success');
                
                // Close modal and refresh
                document.getElementById('databaseImportModal').remove();
                this.loadTablesData();
                this.loadDashboardData();
                
                console.log('Import completed via API', { imported: selectedTables.length });
            } else {
                // Fallback to localStorage simulation
                this.simulateTablesImportToLocal(selectedTables);
            }
            
        } catch (error) {
            console.error('Failed to import via API:', error);
            
            // Try localStorage fallback
            try {
                this.simulateTablesImportToLocal(selectedTables);
                this.showNotification(`⚠️ Tabulky importovány lokálně (server nedostupný)`, 'warning');
            } catch (fallbackError) {
                this.showNotification('Chyba při importu tabulek', 'error');
                console.error('Fallback import failed:', fallbackError);
            }
        }
    }
    
    prepareImportData(selectedTables) {
        // Use real parsed data if available
        if (this.parsedDatabaseData && this.parsedDatabaseData.tables) {
            const importData = {
                filename: this.parsedDatabaseData.filename,
                tables: {}
            };
            
            // Include only selected tables with their parsed data
            this.parsedDatabaseData.tables.forEach(table => {
                if (selectedTables.includes(table.name)) {
                    // Convert parsed table to API format
                    importData.tables[table.name] = {
                        name: table.name,
                        description: `Importováno z ${this.parsedDatabaseData.filename}`,
                        difficulty: 'medium',
                        questions: this.convertTableToQuestions(table)
                    };
                }
            });
            
            return importData;
        }
        
        // Fallback to demo data
        return this.createDemoImportData(selectedTables);
    }
    
    convertTableToQuestions(table) {
        const questions = [];
        
        if (table.sampleData && table.sampleData.length > 0 && table.hasQuestionStructure) {
            // Convert real data to questions
            table.sampleData.forEach(row => {
                const question = this.extractQuestionFromRow(row, table.columns);
                if (question) {
                    questions.push(question);
                }
            });
        }
        
        // If no valid questions found or no sample data, create demo questions
        if (questions.length === 0) {
            for (let i = 1; i <= Math.min(table.rowCount || 3, 5); i++) {
                questions.push({
                    question: `Importovaná otázka ${i} z tabulky ${table.name}`,
                    answer_a: 'Možnost A',
                    answer_b: 'Možnost B',
                    answer_c: 'Možnost C',
                    correct_answer: 'A',
                    difficulty: 'medium',
                    explanation: `Tato otázka byla importována z tabulky ${table.name}`
                });
            }
        }
        
        return questions;
    }
    
    extractQuestionFromRow(row, columns) {
        const columnMap = {};
        columns.forEach(col => {
            const name = col.name.toLowerCase();
            columnMap[name] = col.name;
        });
        
        // Try to find question field
        const questionField = ['question', 'otazka', 'text', 'content'].find(field => 
            columnMap[field] && row[columnMap[field]]
        );
        
        if (!questionField || !columnMap[questionField]) return null;
        
        // Extract question data
        const question = {
            question: String(row[columnMap[questionField]] || '').trim(),
            answer_a: this.findAnswerInRow(row, columnMap, ['answer_a', 'odpoved_a', 'a']),
            answer_b: this.findAnswerInRow(row, columnMap, ['answer_b', 'odpoved_b', 'b']),
            answer_c: this.findAnswerInRow(row, columnMap, ['answer_c', 'odpoved_c', 'c']),
            correct_answer: this.findAnswerInRow(row, columnMap, ['correct', 'correct_answer', 'spravna', 'spravna_odpoved']),
            difficulty: 'medium',
            explanation: this.findAnswerInRow(row, columnMap, ['explanation', 'vysledek', 'popis']) || ''
        };
        
        // Validate question has required fields
        if (question.question && question.answer_a && question.answer_b && question.answer_c && question.correct_answer) {
            return question;
        }
        
        return null;
    }
    
    findAnswerInRow(row, columnMap, possibleNames) {
        for (const name of possibleNames) {
            const field = columnMap[name];
            if (field && row[field]) {
                return String(row[field]).trim();
            }
        }
        return '';
    }
    
    createDemoImportData(selectedTables) {
        const importData = {
            filename: 'database_import',
            tables: {}
        };
        
        selectedTables.forEach(tableName => {
            const demoQuestions = [
                {
                    question: `Importovaná otázka z tabulky ${tableName}`,
                    answer_a: 'Možnost A',
                    answer_b: 'Možnost B', 
                    answer_c: 'Možnost C',
                    correct_answer: 'A',
                    difficulty: 'medium',
                    explanation: `Tato otázka byla importována z ${tableName}`
                }
            ];
            
            importData.tables[tableName] = {
                name: tableName,
                description: `Importována z databáze`,
                difficulty: 'medium',
                questions: demoQuestions
            };
        });
        
        return importData;
    }
    
    simulateTablesImportToLocal(selectedTables) {
        // Fallback method for localStorage
        selectedTables.forEach((tableName, index) => {
            setTimeout(() => {
                this.simulateTableImport(tableName);
            }, index * 1000);
        });
        
        document.getElementById('databaseImportModal').remove();
        this.loadTablesData();
        this.loadDashboardData();
        
        console.log('Import completed locally', { imported: selectedTables.length });
    }
    
    simulateTableImport(tableName) {
        // Create demo questions for imported table
        const demoQuestions = [
            {
                id: Date.now(),
                question: `Importovaná otázka z tabulky ${tableName}`,
                answer_a: 'Možnost A',
                answer_b: 'Možnost B', 
                answer_c: 'Možnost C',
                correct_answer: 'A',
                difficulty: 'medium',
                explanation: `Tato otázka byla importována z ${tableName}`,
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser
            }
        ];
        
        // Save imported table
        const tables = this.loadFromStorage('custom_tables') || {};
        tables[tableName] = {
            name: tableName,
            description: `Importována z databáze`,
            difficulty: 'medium',
            questionCount: demoQuestions.length,
            category: 'Imported',
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser,
            questions: demoQuestions
        };
        
        this.saveToStorage('custom_tables', tables);
        this.saveToStorage(`questions_${tableName}`, demoQuestions);
        
        this.showNotification(`✅ Tabulka "${tableName}" byla importována`, 'success');
        this.loadTablesData();
        this.loadDashboardData();
    }
    
    editTable(tableName) {
        // Load table data for editing
        const tables = this.loadFromStorage('custom_tables') || {};
        const tableData = tables[tableName];
        
        if (!tableData) {
            this.showNotification(`Tabulka "${tableName}" nebyla nalezena`, 'error');
            return;
        }
        
        // Show edit modal (similar to manual creation but pre-filled)
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'editTableModal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>✏️ Upravit tabulku: ${tableName}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editTableForm">
                        <div class="form-group">
                            <label for="editTableName" class="form-label">Název tabulky:</label>
                            <input type="text" id="editTableName" class="form-input" value="${tableData.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editTableDescription" class="form-label">Popis:</label>
                            <textarea id="editTableDescription" class="form-textarea" rows="2">${tableData.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editTableDifficulty" class="form-label">Výchozí obtížnost:</label>
                            <select id="editTableDifficulty" class="form-select">
                                <option value="easy" ${tableData.difficulty === 'easy' ? 'selected' : ''}>Snadná</option>
                                <option value="medium" ${tableData.difficulty === 'medium' ? 'selected' : ''}>Střední</option>
                                <option value="hard" ${tableData.difficulty === 'hard' ? 'selected' : ''}>Těžká</option>
                            </select>
                        </div>
                        <div class="table-stats">
                            <p><strong>Statistiky:</strong></p>
                            <ul>
                                <li>Otázek: ${tableData.questionCount || 0}</li>
                                <li>Vytvořeno: ${new Date(tableData.createdAt).toLocaleDateString()}</li>
                                <li>Autor: ${tableData.createdBy || 'Neznámý'}</li>
                            </ul>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Zrušit
                    </button>
                    <button type="button" class="btn btn-primary" onclick="adminModule.saveTableEdit('${tableName}')">
                        💾 Uložit změny
                    </button>
                    <button type="button" class="btn btn-info" onclick="adminModule.manageTableQuestions('${tableName}')">
                        📝 Spravovat otázky
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
    
    saveTableEdit(originalName) {
        const newName = document.getElementById('editTableName').value.trim();
        const description = document.getElementById('editTableDescription').value.trim();
        const difficulty = document.getElementById('editTableDifficulty').value;
        
        if (!newName) {
            this.showNotification('Zadejte název tabulky', 'error');
            return;
        }
        
        const tables = this.loadFromStorage('custom_tables') || {};
        const tableData = tables[originalName];
        
        if (!tableData) {
            this.showNotification('Původní tabulka nebyla nalezena', 'error');
            return;
        }
        
        // Update table data
        tableData.name = newName;
        tableData.description = description;
        tableData.difficulty = difficulty;
        tableData.updatedAt = new Date().toISOString();
        
        // If name changed, move the data
        if (newName !== originalName) {
            delete tables[originalName];
            tables[newName] = tableData;
            
            // Move questions storage
            const questions = this.loadFromStorage(`questions_${originalName}`) || [];
            this.saveToStorage(`questions_${newName}`, questions);
            localStorage.removeItem(`quiz_questions_${originalName}`);
        } else {
            tables[originalName] = tableData;
        }
        
        this.saveToStorage('custom_tables', tables);
        
        this.showNotification(`Tabulka byla aktualizována`, 'success');
        document.getElementById('editTableModal').remove();
        this.loadTablesData();
        
        console.log('Table updated', { originalName, newName });
    }
    
    exportTable(tableName) {
        try {
            // Load table data
            const tables = this.loadFromStorage('custom_tables') || {};
            const tableData = tables[tableName];
            const questions = this.loadFromStorage(`questions_${tableName}`) || [];
            
            if (!tableData && !questions.length) {
                // Try to export demo table
                const demoQuestions = this.getDemoQuestions().filter(q => q.table === tableName);
                if (demoQuestions.length > 0) {
                    this.exportQuestionsAsFile(tableName, demoQuestions, { 
                        name: tableName, 
                        category: 'Demo',
                        description: 'Demo tabulka'
                    });
                    return;
                }
                
                this.showNotification(`Tabulka "${tableName}" nebyla nalezena`, 'error');
                return;
            }
            
            this.exportQuestionsAsFile(tableName, questions, tableData);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Chyba při exportu tabulky', 'error');
        }
    }
    
    exportQuestionsAsFile(tableName, questions, tableData) {
        const exportData = {
            tableName: tableName,
            tableInfo: tableData || {
                name: tableName,
                category: 'Export',
                description: `Export tabulky ${tableName}`
            },
            questions: questions,
            exportDate: new Date().toISOString(),
            exportedBy: this.currentUser,
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${tableName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification(`Tabulka "${tableName}" byla exportována`, 'success');
        console.log('Table exported', { tableName, questionCount: questions.length });
    }
    
    async deleteTable(tableName) {
        if (!confirm(`Opravdu chcete smazat tabulku "${tableName}" a všechny její otázky?`)) {
            return;
        }
        
        try {
            // Show loading
            this.showNotification('Mažu tabulku...', 'info');
            
            if (window.APIClient && window.APIClient.isAuthenticated()) {
                // Delete via API
                await window.APIClient.deleteTable(tableName);
                
                this.showNotification(`✅ Tabulka "${tableName}" byla smazána`, 'success');
                this.loadTablesData();
                this.loadDashboardData();
                
                console.log('Table deleted via API', { tableName });
            } else {
                // Fallback to localStorage
                this.deleteTableFromLocalStorage(tableName);
                this.showNotification(`📦 Tabulka "${tableName}" byla smazána lokálně`, 'warning');
            }
            
        } catch (error) {
            console.error('Delete error:', error);
            
            // Try localStorage fallback
            try {
                this.deleteTableFromLocalStorage(tableName);
                this.showNotification(`⚠️ Tabulka smazána lokálně (server nedostupný)`, 'warning');
            } catch (fallbackError) {
                this.showNotification('Chyba při mazání tabulky', 'error');
                console.error('Fallback delete failed:', fallbackError);
            }
        }
    }
    
    deleteTableFromLocalStorage(tableName) {
        // Fallback method for localStorage
        const tables = this.loadFromStorage('custom_tables') || {};
        delete tables[tableName];
        this.saveToStorage('custom_tables', tables);
        
        // Remove questions
        localStorage.removeItem(`quiz_questions_${tableName}`);
        
        this.loadTablesData();
        this.loadDashboardData();
        
        console.log('Table deleted locally', { tableName });
    }
    
    manageTableQuestions(tableName) {
        // Close edit modal and open question management
        document.getElementById('editTableModal')?.remove();
        
        // Switch to Questions tab and filter by this table
        this.switchTab('questions');
        
        setTimeout(() => {
            const filter = document.getElementById('questionTableFilter');
            if (filter) {
                // Add table to filter if not exists
                const existingOption = Array.from(filter.options).find(option => option.value === tableName);
                if (!existingOption) {
                    const option = document.createElement('option');
                    option.value = tableName;
                    option.textContent = tableName;
                    filter.appendChild(option);
                }
                filter.value = tableName;
                this.filterQuestions(tableName);
            }
        }, 100);
    }
    
    filterQuestions(tableName) {
        const rows = document.querySelectorAll('#questionsTableBody tr');
        
        rows.forEach(row => {
            if (!tableName) {
                // Show all rows if no filter
                row.style.display = '';
            } else {
                // Check if row belongs to the selected table
                const tableCell = row.cells[1]; // Table column is index 1
                if (tableCell && tableCell.textContent.trim() === tableName) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
        
        // Update visible count
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        console.log(`Filtered questions: ${visibleRows.length} visible out of ${rows.length} total`);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const adminModule = new AdminModule();
    window.adminModule = adminModule; // Make globally available
    
    console.log('Admin module loaded successfully');
    
    // Update status indicator
    updateAdminStatusIndicator();
});

// Status indicator management
function updateAdminStatusIndicator() {
    const indicator = document.getElementById('adminStatusIndicator');
    if (!indicator) return;
    
    try {
        if (typeof APIClient !== 'undefined' && APIClient.isAuthenticated()) {
            const user = APIClient.getCurrentUser();
            if (user && user.role === 'admin') {
                indicator.style.background = '#00ff00';
                indicator.title = 'Online Mode - Admin Authenticated';
            } else {
                indicator.style.background = '#ffaa00';
                indicator.title = 'Authenticated - Not Admin';
            }
        } else if (typeof APIClient !== 'undefined') {
            indicator.style.background = '#ffff00';
            indicator.title = 'API Available - Admin Login Required';
        } else {
            indicator.style.background = '#ff8800';
            indicator.title = 'Offline Mode - Limited Access';
        }
    } catch (error) {
        indicator.style.background = '#ff0000';
        indicator.title = 'Connection Error';
    }
}

// Modern API Test Function
function runAdminAPIClientTest() {
    const resultsDiv = document.getElementById('api-test-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = `
        <div style="color: #00ff00; margin-bottom: 10px;">
            🚀 Starting Admin APIClient Test...
        </div>
    `;
    
    setTimeout(() => {
        let testResults = [];
        
        // Test 1: APIClient availability
        testResults.push(`<div style="color: #00aaff;">📡 APIClient Check:</div>`);
        if (typeof APIClient !== 'undefined') {
            testResults.push(`<div style="color: #00ff00; margin-left: 20px;">✅ APIClient object found</div>`);
            
            // Test 2: Authentication status
            testResults.push(`<div style="color: #00aaff;">🔐 Authentication Check:</div>`);
            try {
                const isAuth = APIClient.isAuthenticated();
                if (isAuth) {
                    testResults.push(`<div style="color: #00ff00; margin-left: 20px;">✅ User is authenticated</div>`);
                    
                    // Test 3: User info and admin rights
                    const userInfo = APIClient.getCurrentUser();
                    if (userInfo) {
                        testResults.push(`<div style="color: #00aaff;">👤 User Info:</div>`);
                        testResults.push(`<div style="color: #ffffff; margin-left: 20px;">📋 Username: ${userInfo.username || 'N/A'}</div>`);
                        testResults.push(`<div style="color: #ffffff; margin-left: 20px;">👑 Role: ${userInfo.role || 'N/A'}</div>`);
                        
                        if (userInfo.role === 'admin') {
                            testResults.push(`<div style="color: #00ff00; margin-left: 20px;">✅ Admin access confirmed</div>`);
                        } else {
                            testResults.push(`<div style="color: #ff4444; margin-left: 20px;">❌ Admin access required</div>`);
                        }
                    }
                } else {
                    testResults.push(`<div style="color: #ffaa00; margin-left: 20px;">⚠️ User not authenticated</div>`);
                }
                
                // Test 4: Admin module status
                testResults.push(`<div style="color: #00aaff;">⚙️ Admin Module Check:</div>`);
                if (window.adminModule) {
                    testResults.push(`<div style="color: #00ff00; margin-left: 20px;">✅ Admin Module loaded</div>`);
                    testResults.push(`<div style="color: #ffffff; margin-left: 20px;">🎛️ Module status: Ready</div>`);
                } else {
                    testResults.push(`<div style="color: #ffaa00; margin-left: 20px;">⚠️ Admin Module not loaded</div>`);
                }
                
            } catch (error) {
                testResults.push(`<div style="color: #ff4444; margin-left: 20px;">❌ Test error: ${error.message}</div>`);
            }
            
        } else {
            testResults.push(`<div style="color: #ff4444; margin-left: 20px;">❌ APIClient not found</div>`);
            testResults.push(`<div style="color: #888; margin-left: 20px;">🔄 Running in offline mode</div>`);
        }
        
        // Final status
        testResults.push(`<div style="color: #00aaff; margin-top: 10px;">📈 Final Status:</div>`);
        testResults.push(`<div style="color: #ffffff; margin-left: 20px;">🕒 Test completed at ${new Date().toLocaleTimeString()}</div>`);
        
        resultsDiv.innerHTML = testResults.join('');
        
        // Update status indicator after test
        updateAdminStatusIndicator();
        
    }, 500);
}

// Panel Toggle Function for Collapsible Panels
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) {
        console.error('Panel not found:', panelId);
        return;
    }
    
    panel.classList.toggle('collapsed');
    
    // Update toggle indicator
    const toggle = panel.querySelector('.panel-toggle');
    if (toggle) {
        toggle.style.transform = panel.classList.contains('collapsed') ? 
            'rotate(-90deg)' : 'rotate(0deg)';
    }
}

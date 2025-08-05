// Quiz Admin Panel - JavaScript Logic
class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.refreshInterval = null;
        this.users = [];
        this.statistics = {};
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🚀 Initializing Admin Panel...');
        
        // Check authentication
        if (!await this.checkAuth()) {
            this.showLogin();
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadDashboard();
        
        // Setup auto-refresh
        this.startAutoRefresh();
        
        console.log('✅ Admin Panel initialized');
    }

    async checkAuth() {
        try {
            const response = await apiClient.request('/api/auth/profile');
            
            if (response.user && response.user.role === 'admin') {
                console.log('✅ Admin authentication verified');
                return true;
            } else {
                console.log('❌ User is not admin');
                return false;
            }
        } catch (error) {
            console.log('❌ Authentication failed:', error);
            return false;
        }
    }

    showLogin() {
        document.body.innerHTML = `
            <div class="login-container" style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            ">
                <div class="login-form" style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    width: 400px;
                ">
                    <h2 style="text-align: center; margin-bottom: 2rem; color: #2c3e50;">
                        🔐 Admin Přihlášení
                    </h2>
                    <form onsubmit="adminPanel.login(event)">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Uživatelské jméno:
                            </label>
                            <input type="text" id="admin-username" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 1rem;
                            ">
                        </div>
                        <div style="margin-bottom: 2rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Heslo:
                            </label>
                            <input type="password" id="admin-password" required style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 1rem;
                            ">
                        </div>
                        <button type="submit" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 1rem;
                            cursor: pointer;
                        ">
                            Přihlásit
                        </button>
                    </form>
                    <div id="login-error" style="
                        margin-top: 1rem;
                        padding: 0.75rem;
                        background: #fee;
                        color: #c00;
                        border-radius: 4px;
                        display: none;
                    "></div>
                </div>
            </div>
        `;
    }

    async login(event) {
        event.preventDefault();
        
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await apiClient.login(username, password);
            
            if (response.user && response.user.role === 'admin') {
                console.log('✅ Admin login successful');
                window.location.reload();
            } else {
                throw new Error('Přístup pouze pro administrátory');
            }
        } catch (error) {
            console.error('❌ Login failed:', error);
            errorDiv.textContent = error.message || 'Chyba při přihlášení';
            errorDiv.style.display = 'block';
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.getAttribute('onclick')?.match(/showSection\('(\w+)'\)/)?.[1];
                if (section) {
                    this.showSection(section);
                }
            });
        });
    }

    showSection(sectionName) {
        console.log(`📍 Switching to section: ${sectionName}`);
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${sectionName}Btn`)?.classList.add('active');
        
        // Update content
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`)?.classList.add('active');
        
        this.currentSection = sectionName;
        
        // Load section data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboard() {
        console.log('📊 Loading dashboard...');
        
        try {
            // Load basic statistics
            await this.loadStatistics();
            
            // Update dashboard stats
            this.updateDashboardStats();
            
            // Load recent activity (mock for now)
            this.loadRecentActivity();
            
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
        }
    }

    async loadUsers() {
        console.log('👥 Loading users...');
        
        try {
            const response = await apiClient.getUsers();
            this.users = response.users || [];
            
            this.renderUsers();
            
        } catch (error) {
            console.error('❌ Failed to load users:', error);
            this.showError('Chyba při načítání uživatelů');
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <i class="fas fa-info-circle"></i> Žádní uživatelé
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <strong>${user.username}</strong>
                    ${user.is_active ? '<span style="color: green;">●</span>' : '<span style="color: red;">●</span>'}
                </td>
                <td>${user.email}</td>
                <td>
                    <select onchange="adminPanel.updateUserRole(${user.id}, this.value)" 
                            ${user.role === 'admin' ? 'style="font-weight: bold; color: #e74c3c;"' : ''}>
                        <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString('cs-CZ')}</td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleDateString('cs-CZ') : 'Nikdy'}</td>
                <td>
                    <input type="checkbox" ${user.is_active ? 'checked' : ''} 
                           onchange="adminPanel.toggleUserActive(${user.id}, this.checked)">
                </td>
                <td>
                    <input type="checkbox" ${user.monica_api_access ? 'checked' : ''} 
                           onchange="adminPanel.toggleMonicaAccess(${user.id}, this.checked)">
                </td>
                <td>
                    <small>
                        ✅ ${user.stats?.correct_answers || 0}<br>
                        📊 ${user.stats?.accuracy || 0}%
                    </small>
                </td>
                <td>
                    <button onclick="adminPanel.editUser(${user.id})" class="btn btn-sm btn-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="adminPanel.deleteUser(${user.id})" class="btn btn-sm btn-danger"
                            ${user.role === 'admin' ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadStatistics() {
        console.log('📈 Loading statistics...');
        
        try {
            const response = await apiClient.getStatistics();
            this.statistics = response.statistics || {};
            
            this.updateStatisticsDisplay();
            
        } catch (error) {
            console.error('❌ Failed to load statistics:', error);
            this.showError('Chyba při načítání statistik');
        }
    }

    updateStatisticsDisplay() {
        // Update dashboard stats
        this.updateElement('totalUsers', this.statistics.users?.total || 0);
        this.updateElement('activeUsers', this.statistics.users?.active || 0);
        this.updateElement('totalQuestions', this.statistics.quiz?.total_questions || 0);
        this.updateElement('successRate', (this.statistics.quiz?.accuracy || 0) + '%');
    }

    updateDashboardStats() {
        const stats = this.statistics;
        
        // Calculate changes (mock for now)
        this.updateElement('usersChange', '+' + (stats.users?.recent_logins || 0) + ' tento týden');
        this.updateElement('activeUsersChange', '+' + (stats.users?.active || 0) + ' aktivních');
        this.updateElement('questionsChange', (stats.quiz?.total_questions || 0) + ' dostupných');
        this.updateElement('successRateChange', '📈 Rostoucí trend');
    }

    loadRecentActivity() {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;
        
        // Mock recent activity data
        const activities = [
            { time: '2 min ago', action: 'Nová registrace', user: 'student123', icon: 'fa-user-plus' },
            { time: '5 min ago', action: 'Dokončen kvíz', user: 'marie.novakova', icon: 'fa-check-circle' },
            { time: '10 min ago', action: 'Přihlášení admin', user: 'admin', icon: 'fa-sign-in-alt' },
            { time: '15 min ago', action: 'Export dat', user: 'admin', icon: 'fa-download' }
        ];
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <i class="fas ${activity.icon}"></i>
                <div>
                    <strong>${activity.action}</strong><br>
                    <small>${activity.user} • ${activity.time}</small>
                </div>
            </div>
        `).join('');
    }

    async loadLogs() {
        console.log('📝 Loading logs...');
        
        // Mock logs for now
        const logsContent = document.getElementById('logsContent');
        if (!logsContent) return;
        
        const mockLogs = [
            { time: new Date().toISOString(), level: 'info', action: 'USER_LOGIN', details: 'admin logged in from 192.168.1.1' },
            { time: new Date(Date.now() - 300000).toISOString(), level: 'info', action: 'QUIZ_COMPLETED', details: 'User student123 completed quiz "Matematika"' },
            { time: new Date(Date.now() - 600000).toISOString(), level: 'warning', action: 'LOGIN_FAILED', details: 'Failed login attempt for user "test"' },
            { time: new Date(Date.now() - 900000).toISOString(), level: 'info', action: 'USER_REGISTERED', details: 'New user registered: marie.novakova' }
        ];
        
        logsContent.innerHTML = mockLogs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="log-time">${new Date(log.time).toLocaleString('cs-CZ')}</span>
                <span class="log-action">${log.action}</span>
                <span class="log-details">${log.details}</span>
            </div>
        `).join('');
    }

    loadSettings() {
        console.log('⚙️ Loading settings...');
        
        // Load current settings (mock for now)
        const settingsData = {
            autoBackups: true,
            monicaTimeout: 30,
            maxLoginAttempts: 5,
            sessionTimeout: 24,
            logIpAddresses: true,
            emailNotifications: false,
            notifyNewUsers: true,
            notifySystemErrors: true
        };
        
        // Update form fields
        Object.keys(settingsData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settingsData[key];
                } else {
                    element.value = settingsData[key];
                }
            }
        });
    }

    // User management methods
    async updateUserRole(userId, newRole) {
        try {
            await apiClient.request(`/api/admin/user/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            
            console.log(`✅ Updated user ${userId} role to ${newRole}`);
            this.showSuccess(`Role uživatele byla změněna na ${newRole}`);
            
            // Refresh users
            await this.loadUsers();
            
        } catch (error) {
            console.error('❌ Failed to update user role:', error);
            this.showError('Chyba při změně role uživatele');
        }
    }

    async toggleUserActive(userId, isActive) {
        try {
            await apiClient.request(`/api/admin/user/${userId}/active`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: isActive })
            });
            
            console.log(`✅ Updated user ${userId} active status to ${isActive}`);
            this.showSuccess(`Stav uživatele byl ${isActive ? 'aktivován' : 'deaktivován'}`);
            
        } catch (error) {
            console.error('❌ Failed to update user status:', error);
            this.showError('Chyba při změně stavu uživatele');
        }
    }

    async toggleMonicaAccess(userId, hasAccess) {
        try {
            await apiClient.request(`/api/admin/user/${userId}/monica-access`, {
                method: 'PUT',
                body: JSON.stringify({ monica_access: hasAccess })
            });
            
            console.log(`✅ Updated user ${userId} Monica access to ${hasAccess}`);
            this.showSuccess(`Monica AI přístup byl ${hasAccess ? 'povolen' : 'zakázán'}`);
            
        } catch (error) {
            console.error('❌ Failed to update Monica access:', error);
            this.showError('Chyba při změně Monica AI přístupu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Opravdu chcete smazat tohoto uživatele?')) {
            return;
        }
        
        try {
            await apiClient.request(`/api/admin/user/${userId}`, {
                method: 'DELETE'
            });
            
            console.log(`✅ Deleted user ${userId}`);
            this.showSuccess('Uživatel byl smazán');
            
            // Refresh users
            await this.loadUsers();
            
        } catch (error) {
            console.error('❌ Failed to delete user:', error);
            this.showError('Chyba při mazání uživatele');
        }
    }

    // Utility methods
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentSection === 'users') {
                this.loadUsers();
            } else if (this.currentSection === 'statistics') {
                this.loadStatistics();
            }
        }, 30000);
    }

    refreshAll() {
        console.log('🔄 Refreshing all data...');
        
        switch (this.currentSection) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
        
        this.showSuccess('Data byla obnovena');
    }

    logout() {
        if (confirm('Opravdu se chcete odhlásit?')) {
            localStorage.removeItem('jwt_token');
            window.location.reload();
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize admin panel
const adminPanel = new AdminPanel();

// Make it globally available for onclick handlers
window.adminPanel = adminPanel;

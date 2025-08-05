// Frontend API Configuration for Web Deployment
const API_CONFIG = {
    // Production URL - aktualizujte po deployment na Render.com
    PRODUCTION_URL: 'https://quiz-web-app-wpls.onrender.com',
    
    // Development URL
    DEVELOPMENT_URL: 'http://localhost:5000',
    
    // Auto-detect environment
    get BASE_URL() {
        // Pokud je hostname localhost nebo obsahuje port, používáme development
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.port) {
            return this.DEVELOPMENT_URL;
        }
        return this.PRODUCTION_URL;
    }
};

class ApiClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('jwt_token');
        
        // Debug log
        console.log('🔧 API Client initialized:', {
            baseUrl: this.baseUrl,
            hasToken: !!this.token,
            environment: this.baseUrl === API_CONFIG.DEVELOPMENT_URL ? 'development' : 'production'
        });
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('jwt_token', token);
        } else {
            localStorage.removeItem('jwt_token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication token
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                console.error(`❌ API Error: ${response.status}`, data);
                
                // Handle authentication errors
                if (response.status === 401) {
                    this.setToken(null);
                    throw new Error('Authentication required');
                }
                
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            console.log(`✅ API Response: ${response.status}`, data);
            return data;
            
        } catch (error) {
            console.error('🔥 API Request failed:', error);
            
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - server might be offline');
            }
            
            throw error;
        }
    }

    // Authentication methods
    async register(username, email, password) {
        const response = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async login(username, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async getProfile() {
        return await this.request('/api/auth/profile');
    }

    // Quiz methods
    async getQuizTables() {
        return await this.request('/api/quiz/tables');
    }

    async getQuestions(tableName) {
        return await this.request(`/api/quiz/questions/${tableName}`);
    }

    async saveAnswer(questionId, answer, quizSessionId = null) {
        return await this.request('/api/quiz/answer', {
            method: 'POST',
            body: JSON.stringify({
                question_id: questionId,
                answer: answer,
                quiz_session_id: quizSessionId
            })
        });
    }

    // Monica AI methods
    async evaluateAnswer(question, correctAnswer, userAnswer) {
        return await this.request('/api/monica/evaluate', {
            method: 'POST',
            body: JSON.stringify({
                question: question,
                correctAnswer: correctAnswer,
                userAnswer: userAnswer
            })
        });
    }

    // Admin methods
    async getUsers() {
        return await this.request('/api/admin/users');
    }

    async getStatistics() {
        return await this.request('/api/admin/statistics');
    }

    // Health check
    async healthCheck() {
        return await this.request('/api/health');
    }
}

// Server status manager for frontend
class ServerStatusManager {
    constructor() {
        this.status = 'checking';
        this.mode = 'unknown';
        this.callbacks = [];
        
        this.checkServerStatus();
        
        // Recheck status every 30 seconds
        setInterval(() => {
            this.checkServerStatus();
        }, 30000);
    }

    async checkServerStatus() {
        try {
            const apiClient = new ApiClient();
            const health = await apiClient.healthCheck();
            
            if (health.status === 'healthy') {
                this.updateStatus('online', 'Server Mode', '🟢');
            } else {
                this.updateStatus('error', 'Server Error', '🟡');
            }
        } catch (error) {
            console.log('Server not available, using local mode');
            this.updateStatus('offline', 'Local Mode', '🔴');
        }
    }

    updateStatus(status, mode, indicator) {
        const oldStatus = this.status;
        this.status = status;
        this.mode = mode;
        
        // Update UI elements
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusIndicatorText');
        const statusMode = document.getElementById('statusMode');
        
        if (statusIndicator) statusIndicator.textContent = indicator;
        if (statusText) statusText.textContent = status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Error';
        if (statusMode) statusMode.textContent = mode;
        
        // Trigger callbacks if status changed
        if (oldStatus !== status) {
            this.callbacks.forEach(callback => callback(status, mode));
        }
    }

    onStatusChange(callback) {
        this.callbacks.push(callback);
    }

    isOnline() {
        return this.status === 'online';
    }
}

// Global instances
const apiClient = new ApiClient();
const serverStatusManager = new ServerStatusManager();

// Update backend mode setting in enhanced integration
if (typeof app !== 'undefined' && app.checkServerAvailability) {
    serverStatusManager.onStatusChange((status, mode) => {
        const backendMode = document.getElementById('backendMode');
        if (backendMode) {
            if (status === 'online') {
                backendMode.value = 'server';
                app.settings.backendMode = 'server';
            } else {
                backendMode.value = 'local';
                app.settings.backendMode = 'local';
            }
        }
    });
}

console.log('🚀 API configuration loaded:', {
    baseUrl: API_CONFIG.BASE_URL,
    environment: API_CONFIG.BASE_URL === API_CONFIG.DEVELOPMENT_URL ? 'development' : 'production'
});

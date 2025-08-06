/**
 * MODULAR QUIZ APP - API CLIENT
 * Centralizovaná komunikace s backend službami
 */

class ModularAPIClient {
    constructor() {
        this.baseURL = this.detectBackendURL();
        this.timeout = 10000; // 10 seconds
        this.retryAttempts = 3;
        this.authToken = this.loadAuthToken();
        
        this.endpoints = {
            // Auth endpoints
            login: '/api/auth/login',
            register: '/api/auth/register',
            refresh: '/api/auth/refresh',
            logout: '/api/auth/logout',
            resetPassword: '/api/auth/reset-password',
            
            // Quiz endpoints
            tables: '/api/quiz/tables',
            questions: '/api/quiz/questions',
            submitAnswer: '/api/quiz/answer',
            
            // User endpoints
            profile: '/api/auth/profile',
            updateProfile: '/api/user/update',
            
            // Admin endpoints
            adminUsers: '/api/admin/users',
            adminStats: '/api/admin/statistics',
            
            // Health check
            health: '/api/health'
        };
        
        this.init();
    }
    
    init() {
        this.setupInterceptors();
        Logger.info('API Client initialized', { baseURL: this.baseURL });
    }
    
    detectBackendURL() {
        // Try to detect the correct backend URL
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000';  // Local development
        } else {
            return 'https://quiz-modular-backend.onrender.com';  // Production on Render.com
        }
    }
    
    setupInterceptors() {
        // Store original fetch
        this.originalFetch = window.fetch;
        
        // Setup request/response logging
        this.logRequests = true;
    }
    
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Add auth token if available
        if (this.authToken) {
            config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Log request
        if (this.logRequests) {
            Logger.debug(`API Request: ${options.method || 'GET'} ${endpoint}`, {
                url,
                config: { ...config, headers: { ...config.headers } }
            });
        }
        
        try {
            const response = await this.fetchWithTimeout(url, config);
            const data = await this.parseResponse(response);
            
            // Log successful response
            Logger.debug(`API Response: ${response.status} ${endpoint}`, {
                status: response.status,
                data: data
            });
            
            return {
                success: true,
                data: data,
                status: response.status,
                headers: response.headers
            };
            
        } catch (error) {
            Logger.error(`API Error: ${endpoint}`, {
                error: error.message,
                endpoint,
                config
            });
            
            return {
                success: false,
                error: error.message,
                status: error.status || 0
            };
        }
    }
    
    async fetchWithTimeout(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                }
            } catch (e) {
                // Use default error message
            }
            
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }
    
    // Authentication methods
    async login(username, password) {
        const response = await this.request(this.endpoints.login, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.success && response.data.token) {
            this.setAuthToken(response.data.token);
            Logger.success('Login successful', { username });
        }
        
        return response;
    }
    
    async register(username, password, email = '') {
        const response = await this.request(this.endpoints.register, {
            method: 'POST',
            body: JSON.stringify({ username, password, email })
        });
        
        if (response.success) {
            Logger.success('Registration successful', { username, email });
        }
        
        return response;
    }
    
    async logout() {
        const response = await this.request(this.endpoints.logout, {
            method: 'POST'
        });
        
        this.clearAuthToken();
        Logger.info('Logout completed');
        
        return response;
    }
    
    async resetPassword(emailOrUsername) {
        return await this.request(this.endpoints.resetPassword, {
            method: 'POST',
            body: JSON.stringify({ email: emailOrUsername })
        });
    }
    
    // Quiz methods
    async getTables() {
        return await this.request(this.endpoints.tables);
    }
    
    async getQuestions(tableName) {
        return await this.request(`${this.endpoints.questions}/${tableName}`);
    }
    
    async submitAnswer(questionId, answer, isCorrect, timeSpent) {
        return await this.request(this.endpoints.submitAnswer, {
            method: 'POST',
            body: JSON.stringify({
                questionId,
                answer,
                isCorrect,
                timeSpent
            })
        });
    }
    
    // User methods
    async getProfile() {
        return await this.request(this.endpoints.profile);
    }
    
    // Alias for compatibility
    async getCurrentUser() {
        const response = await this.getProfile();
        return response.success ? response.data.user : null;
    }
    
    async updateProfile(profileData) {
        return await this.request(this.endpoints.updateProfile, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
    
    // Admin methods
    async getAdminUsers() {
        return await this.request(this.endpoints.adminUsers);
    }
    
    async getAdminStatistics() {
        return await this.request(this.endpoints.adminStats);
    }
    
    // Health check
    async healthCheck() {
        try {
            const response = await this.request(this.endpoints.health);
            return response.success;
        } catch (error) {
            return false;
        }
    }
    
    // Token management
    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('modular_quiz_token', token);
        Logger.debug('Auth token set');
    }
    
    clearAuthToken() {
        this.authToken = null;
        localStorage.removeItem('modular_quiz_token');
        Logger.debug('Auth token cleared');
    }
    
    loadAuthToken() {
        try {
            return localStorage.getItem('modular_quiz_token');
        } catch (error) {
            Logger.warning('Failed to load auth token', error);
            return null;
        }
    }
    
    isAuthenticated() {
        return !!this.authToken;
    }
    
    // Configuration methods
    setBaseURL(url) {
        this.baseURL = url;
        Logger.info('Base URL updated', { baseURL: url });
    }
    
    setTimeout(ms) {
        this.timeout = ms;
    }
    
    setLogging(enabled) {
        this.logRequests = enabled;
    }
    
    // Convenience HTTP methods for compatibility
    async get(endpoint) {
        return await this.request(endpoint, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return await this.request(endpoint, { method: 'DELETE' });
    }
    
    // Utility methods
    async testConnection() {
        Logger.info('Testing API connection...');
        
        const startTime = Date.now();
        const isHealthy = await this.healthCheck();
        const responseTime = Date.now() - startTime;
        
        const result = {
            healthy: isHealthy,
            responseTime: responseTime,
            baseURL: this.baseURL
        };
        
        if (isHealthy) {
            Logger.success('API connection successful', result);
        } else {
            Logger.error('API connection failed', result);
        }
        
        return result;
    }
    
    getConnectionStatus() {
        return {
            baseURL: this.baseURL,
            authenticated: this.isAuthenticated(),
            timeout: this.timeout
        };
    }
}

// Global API client instance
let APIClient = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    APIClient = new ModularAPIClient();
    window.APIClient = APIClient; // Make globally available
    
    // Backward compatibility
    window.enhancedIntegration = {
        loginUser: (username, password) => APIClient.login(username, password),
        registerUser: (username, password, email) => APIClient.register(username, password, email),
        updateBackendUrl: (url) => APIClient.setBaseURL(url)
    };
    
    // Auto-test connection
    setTimeout(() => {
        APIClient.testConnection();
    }, 1000);
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularAPIClient;
}

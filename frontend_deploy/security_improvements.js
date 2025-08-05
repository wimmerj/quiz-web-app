// Bezpečnostní vylepšení pro quiz aplikaci

// 1. Validace vstupů
function validateInput(input, type = 'text', maxLength = 50) {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    
    switch (type) {
        case 'username':
            return /^[a-zA-Z0-9_]{3,20}$/.test(input);
        case 'password':
            return input.length >= 6 && input.length <= 100;
        case 'number':
            return /^\d+$/.test(input) && parseInt(input) > 0;
        default:
            return input.trim().length > 0;
    }
}

// 2. Sanitizace HTML pro prevenci XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 3. Rate limiting pro prevenci spam útoků
class RateLimiter {
    constructor(maxAttempts = 5, timeWindow = 60000) {
        this.attempts = new Map();
        this.maxAttempts = maxAttempts;
        this.timeWindow = timeWindow;
    }
    
    isAllowed(key) {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];
        
        // Vyčistit staré pokusy
        const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);
        
        if (recentAttempts.length >= this.maxAttempts) {
            return false;
        }
        
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        return true;
    }
}

// 4. Šifrování hesla (základní hash)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'quiz_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 5. Validace session
function validateSession() {
    const lastActivity = localStorage.getItem('quiz_app_last_activity');
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hodin
    
    if (lastActivity && Date.now() - parseInt(lastActivity) > sessionTimeout) {
        localStorage.removeItem('quiz_app_last_user');
        return false;
    }
    
    localStorage.setItem('quiz_app_last_activity', Date.now().toString());
    return true;
}

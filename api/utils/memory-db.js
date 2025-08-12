/**
 * SIMPLE JSON DATABASE FOR VERCEL
 * In-memory database with static data
 */

// In-memory data store
const DATABASE = {
    users: [
        {
            id: 1,
            username: "admin",
            email: "admin@quiz.app",
            password_hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            role: "admin",
            avatar: "👨‍💼",
            created_at: "2025-08-12T00:00:00.000Z",
            last_login: null,
            is_active: true,
            settings: {
                theme: "orange",
                notifications: true,
                auto_next: false
            },
            battle_stats: {
                rating: 1500,
                wins: 0,
                losses: 0
            }
        },
        {
            id: 2,
            username: "demo_user",
            email: "demo@quiz.app",
            password_hash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
            role: "student",
            avatar: "👤",
            created_at: "2025-08-12T00:00:00.000Z",
            last_login: null,
            is_active: true,
            settings: {
                theme: "orange",
                notifications: true,
                auto_next: false
            },
            battle_stats: {
                rating: 1500,
                wins: 0,
                losses: 0
            }
        }
    ],
    sessions: [],
    quiz_tables: [
        {
            id: 1,
            name: "_00_Official_2203__2015_",
            display_name: "Oficiální 2203/2015",
            description: "Oficiální otázky podle předpisu 2203/2015",
            question_count: 3,
            category: "official",
            created_at: "2025-08-12T00:00:00.000Z"
        },
        {
            id: 2,
            name: "demo_questions",
            display_name: "Demo Otázky",
            description: "Demonstrační sada otázek pro testování",
            question_count: 3,
            category: "demo",
            created_at: "2025-08-12T00:00:00.000Z"
        }
    ],
    questions: [
        {
            id: 1,
            table_name: "_00_Official_2203__2015_",
            question: "01) Souprava hlavních klíčů obsahuje:",
            answer_a: "Hlavni klíče od zámků výhybek, výkolejek, od uzamykatelných přenosných výměnových zámků a uzamykatelných podložek.",
            answer_b: "hlavni a náhradní klíče od zámků výhybek a výkolejek.",
            answer_c: "hlavni a náhradní klíče od uzamykatelných přenosných výměnových zámků a uzamykatelných podložek.",
            correct_answer: "A",
            explanation: "Podle předpisů",
            difficulty: 2,
            category: "official"
        },
        {
            id: 2,
            table_name: "_00_Official_2203__2015_",
            question: "02) Kdy a koho musí zpravit zaměstnanec, který zjistil, že na světelném návěstidle výhybky se samovratným přestavníkem není návěst JÍZDA ZAJIŠTĚNA?",
            answer_a: "Neprodlené dirigujícího dispečera a strojvedoucí všech vlaků v dopravně D3.",
            answer_b: "Neprodleně pouze výpravčího přilehlé stanice.",
            answer_c: "Neprodleně pouze udržujícího zaměstnance SSZT.",
            correct_answer: "A",
            explanation: "Bezpečnostní opatření",
            difficulty: 3,
            category: "official"
        },
        {
            id: 3,
            table_name: "_00_Official_2203__2015_",
            question: "03) Jaký tvar mají v soupravě hlavních klíčů štítky od výhybek a výkolejek?",
            answer_a: "Kruhový.",
            answer_b: "Obdélníkový.",
            answer_c: "Čtvercový.",
            correct_answer: "A",
            explanation: "Standardní označení",
            difficulty: 1,
            category: "official"
        },
        {
            id: 4,
            table_name: "demo_questions",
            question: "Jaká je maximální rychlost osobního vlaku?",
            answer_a: "120 km/h",
            answer_b: "160 km/h", 
            answer_c: "200 km/h",
            correct_answer: "B",
            explanation: "Podle předpisů je maximální rychlost osobního vlaku 160 km/h.",
            difficulty: 2,
            category: "rychlosti"
        },
        {
            id: 5,
            table_name: "demo_questions",
            question: "Co znamená návěst 'Stůj'?",
            answer_a: "Vlak může pokračovat v jízdě",
            answer_b: "Vlak musí zastavit před návěstidlem",
            answer_c: "Vlak může jet pomalu",
            correct_answer: "B",
            explanation: "Návěst 'Stůj' znamená bezpodmínečné zastavení před návěstidlem.",
            difficulty: 1,
            category: "navesti"
        },
        {
            id: 6,
            table_name: "demo_questions",
            question: "Jaká je minimální vzdálenost mezi vlaky?",
            answer_a: "500 metrů",
            answer_b: "1000 metrů",
            answer_c: "Podle brzdné vzdálenosti",
            correct_answer: "C",
            explanation: "Vzdálenost mezi vlaky se řídí brzdnou vzdáleností a dalšími faktory.",
            difficulty: 3,
            category: "bezpecnost"
        }
    ],
    quiz_results: [],
    metadata: {
        next_user_id: 3,
        next_question_id: 7,
        next_table_id: 3,
        last_updated: new Date().toISOString()
    }
};

/**
 * USERS DATABASE
 */
export class UsersDB {
    static async getAll() {
        return DATABASE.users;
    }
    
    static async findById(id) {
        return DATABASE.users.find(user => user.id === parseInt(id));
    }
    
    static async findByUsername(username) {
        return DATABASE.users.find(user => user.username === username);
    }
    
    static async findByEmail(email) {
        return DATABASE.users.find(user => user.email === email);
    }
    
    static async create(userData) {
        const newUser = {
            id: DATABASE.metadata.next_user_id++,
            ...userData,
            created_at: new Date().toISOString(),
            is_active: true
        };
        
        DATABASE.users.push(newUser);
        DATABASE.metadata.last_updated = new Date().toISOString();
        
        return newUser;
    }
    
    static async update(id, updates) {
        const userIndex = DATABASE.users.findIndex(user => user.id === parseInt(id));
        if (userIndex === -1) return null;
        
        DATABASE.users[userIndex] = { ...DATABASE.users[userIndex], ...updates };
        DATABASE.metadata.last_updated = new Date().toISOString();
        
        return DATABASE.users[userIndex];
    }
}

/**
 * SESSIONS DATABASE
 */
export class SessionsDB {
    static async create(userId, token) {
        const session = {
            user_id: userId,
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        DATABASE.sessions.push(session);
        return session;
    }
    
    static async findByToken(token) {
        const session = DATABASE.sessions.find(s => s.token === token);
        if (!session) return null;
        
        // Check if session is expired
        if (new Date(session.expires_at) < new Date()) {
            await this.delete(token);
            return null;
        }
        
        return session;
    }
    
    static async delete(token) {
        DATABASE.sessions = DATABASE.sessions.filter(s => s.token !== token);
        return true;
    }
}

/**
 * QUESTIONS DATABASE
 */
export class QuestionsDB {
    static async getAllTables() {
        return DATABASE.quiz_tables;
    }
    
    static async getTableByName(name) {
        return DATABASE.quiz_tables.find(table => table.name === name);
    }
    
    static async getQuestionsByTable(tableName) {
        return DATABASE.questions.filter(q => q.table_name === tableName);
    }
    
    static async getQuestionById(id) {
        return DATABASE.questions.find(q => q.id === parseInt(id));
    }
}

/**
 * UTILITY FUNCTIONS
 */
import crypto from 'crypto';

export function hashPassword(password) {
    return crypto.pbkdf2Sync(password, 'quiz-salt-2025', 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * CORS HEADERS
 */
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

/**
 * RESPONSE HELPERS
 */
export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

export function errorResponse(message, status = 400) {
    return jsonResponse({ 
        error: message, 
        timestamp: new Date().toISOString() 
    }, status);
}

export function successResponse(data, message = 'Success') {
    return jsonResponse({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
}

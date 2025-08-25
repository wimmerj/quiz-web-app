/**
 * JSON DATABASE SYSTEM FOR VERCEL
 * Jednoduchý a rychlý databázový systém založený na JSON souborech
 * Optimalizovaný pro Vercel Edge Functions
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { githubReadFile, githubWriteFile } from './github-storage.js';

// Základní cesty k JSON souborům
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    questions: path.join(DATA_DIR, 'questions.json'),
    sessions: path.join(DATA_DIR, 'sessions.json'),
    quiz_progress: path.join(DATA_DIR, 'quiz_progress.json')
};

// GitHub storage config (nastavte v prostředí)
const GITHUB_ENABLED = process.env.GITHUB_STORAGE === '1';
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'wimmerj';
const GITHUB_REPO = process.env.GITHUB_REPO || 'quiz-web-app';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Načte JSON soubor
 */
async function loadJSON(filePath, githubPath) {
    try {
        if (GITHUB_ENABLED && githubPath && GITHUB_TOKEN) {
            const raw = await githubReadFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: githubPath, token: GITHUB_TOKEN });
            return JSON.parse(raw);
        } else {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error loading JSON file ${filePath}:`, error);
        return null;
    }
}

/**
 * Uloží data do JSON souboru
 */
async function saveJSON(filePath, data, githubPath) {
    try {
        if (GITHUB_ENABLED && githubPath && GITHUB_TOKEN) {
            await githubWriteFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: githubPath, content: JSON.stringify(data, null, 2), token: GITHUB_TOKEN });
            return true;
        } else {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        }
    } catch (error) {
        console.error(`Error saving JSON file ${filePath}:`, error);
        return false;
    }
}

/**
 * USERS DATABASE
 */
export class UsersDB {
    static async getAll() {
    const data = await loadJSON(DB_FILES.users, 'data/users.json');
        return data?.users || [];
    }
    
    static async findById(id) {
        const users = await this.getAll();
        return users.find(user => user.id === parseInt(id));
    }
    
    static async findByUsername(username) {
        const users = await this.getAll();
        return users.find(user => user.username === username);
    }
    
    static async findByEmail(email) {
        const users = await this.getAll();
        return users.find(user => user.email === email);
    }
    
    static async create(userData) {
        const data = await loadJSON(DB_FILES.users);
        if (!data) return null;
        
        const newUser = {
            id: data.next_id,
            ...userData,
            created_at: new Date().toISOString(),
            is_active: true
        };
        
        data.users.push(newUser);
        data.next_id += 1;
        data.metadata.last_updated = new Date().toISOString();
        
    const saved = await saveJSON(DB_FILES.users, data, 'data/users.json');
        return saved ? newUser : null;
    }
    
    static async update(id, updates) {
    const data = await loadJSON(DB_FILES.users, 'data/users.json');
        if (!data) return null;
        
        const userIndex = data.users.findIndex(user => user.id === parseInt(id));
        if (userIndex === -1) return null;
        
        data.users[userIndex] = { ...data.users[userIndex], ...updates };
        data.metadata.last_updated = new Date().toISOString();
        
    const saved = await saveJSON(DB_FILES.users, data, 'data/users.json');
        return saved ? data.users[userIndex] : null;
    }
    
    static async delete(id) {
    const data = await loadJSON(DB_FILES.users, 'data/users.json');
        if (!data) return false;
        
        const userIndex = data.users.findIndex(user => user.id === parseInt(id));
        if (userIndex === -1) return false;
        
        data.users.splice(userIndex, 1);
        data.metadata.last_updated = new Date().toISOString();
        
    return await saveJSON(DB_FILES.users, data, 'data/users.json');
    }
}

/**
 * SESSIONS DATABASE
 */
export class SessionsDB {
    static async create(userId, token) {
    const data = await loadJSON(DB_FILES.sessions, 'data/sessions.json');
        if (!data) return null;
        
        const session = {
            user_id: userId,
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        
        data.sessions.push(session);
        
    const saved = await saveJSON(DB_FILES.sessions, data, 'data/sessions.json');
        return saved ? session : null;
    }
    
    static async findByToken(token) {
    const data = await loadJSON(DB_FILES.sessions, 'data/sessions.json');
        if (!data) return null;
        
    const session = data.sessions.find(s => s.token === token);
        if (!session) return null;
        
        // Check if session is expired
        if (new Date(session.expires_at) < new Date()) {
            await this.delete(token);
            return null;
        }
        
    return session;
    }
    
    static async delete(token) {
    const data = await loadJSON(DB_FILES.sessions, 'data/sessions.json');
        if (!data) return false;
        
    data.sessions = data.sessions.filter(s => s.token !== token);
    return await saveJSON(DB_FILES.sessions, data, 'data/sessions.json');
    }
    
    static async cleanup() {
    const data = await loadJSON(DB_FILES.sessions, 'data/sessions.json');
        if (!data) return false;
        
        const now = new Date();
        data.sessions = data.sessions.filter(s => new Date(s.expires_at) > now);
        
    return await saveJSON(DB_FILES.sessions, data, 'data/sessions.json');
    }
}

/**
 * QUESTIONS DATABASE
 */
export class QuestionsDB {
    static async getAllTables() {
        const data = await loadJSON(DB_FILES.questions);
        return data?.quiz_tables || [];
    }
    
    static async getTableByName(name) {
        const tables = await this.getAllTables();
        return tables.find(table => table.name === name);
    }
    
    static async getQuestionsByTable(tableName) {
        const data = await loadJSON(DB_FILES.questions);
        if (!data) return [];
        
        return data.questions.filter(q => q.table_name === tableName);
    }
    
    static async getQuestionById(id) {
        const data = await loadJSON(DB_FILES.questions);
        if (!data) return null;
        
        return data.questions.find(q => q.id === parseInt(id));
    }
    
    static async addQuestions(tableName, questions) {
        const data = await loadJSON(DB_FILES.questions);
        if (!data) return false;
        
        // Add questions with new IDs
        questions.forEach(question => {
            const newQuestion = {
                id: data.next_question_id,
                table_name: tableName,
                ...question
            };
            data.questions.push(newQuestion);
            data.next_question_id += 1;
        });
        
        data.metadata.total_questions = data.questions.length;
        data.metadata.last_updated = new Date().toISOString();
        
        return await saveJSON(DB_FILES.questions, data);
    }
    
    static async addTable(tableData) {
        const data = await loadJSON(DB_FILES.questions);
        if (!data) return null;
        
        const newTable = {
            id: data.next_table_id,
            ...tableData,
            created_at: new Date().toISOString()
        };
        
        data.quiz_tables.push(newTable);
        data.next_table_id += 1;
        data.metadata.total_tables = data.quiz_tables.length;
        data.metadata.last_updated = new Date().toISOString();
        
        const saved = await saveJSON(DB_FILES.questions, data);
        return saved ? newTable : null;
    }
}

/**
 * QUIZ PROGRESS DATABASE
 */
export class QuizProgressDB {
    static async saveResult(userId, result) {
        const data = await loadJSON(DB_FILES.quiz_progress);
        if (!data) return false;
        
        const quizResult = {
            id: Date.now(), // Simple ID based on timestamp
            user_id: userId,
            ...result,
            created_at: new Date().toISOString()
        };
        
        data.quiz_results.push(quizResult);
        data.metadata.last_cleanup = new Date().toISOString();
        
        return await saveJSON(DB_FILES.quiz_progress, data);
    }
    
    static async getUserResults(userId) {
        const data = await loadJSON(DB_FILES.quiz_progress);
        if (!data) return [];
        
        return data.quiz_results.filter(result => result.user_id === parseInt(userId));
    }
    
    static async getUserProgress(userId, tableName) {
        const data = await loadJSON(DB_FILES.quiz_progress);
        if (!data) return [];
        
        return data.user_progress.filter(
            progress => progress.user_id === parseInt(userId) && 
                       progress.table_name === tableName
        );
    }
}

/**
 * UTILITY FUNCTIONS
 */
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

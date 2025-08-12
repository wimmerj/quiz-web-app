/**
 * VERCEL KV DATABASE SYSTEM
 * Persistent storage for multi-device access
 */

import { kv } from '@vercel/kv';
import crypto from 'crypto';

// Database keys
const KEYS = {
    users: 'users:all',
    userById: (id) => `user:${id}`,
    userByUsername: (username) => `user:username:${username}`,
    userByEmail: (email) => `user:email:${email}`,
    sessions: 'sessions:all',
    sessionByToken: (token) => `session:${token}`,
    questions: 'questions:all',
    metadata: 'metadata'
};

// Initialize default data if not exists
export async function initializeDatabase() {
    try {
        // Check if metadata exists
        const metadata = await kv.get(KEYS.metadata);
        
        if (!metadata) {
            console.log('Initializing Vercel KV database...');
            
            // Set initial metadata
            await kv.set(KEYS.metadata, {
                next_user_id: 3,
                next_session_id: 1,
                last_updated: new Date().toISOString(),
                version: '1.0.0-kv'
            });
            
            // Create default admin user
            const adminUser = {
                id: 1,
                username: "admin",
                email: "admin@quiz.app",
                password_hash: "c4b311c98dad7d4e28a6ae0f2d462c1198c9e44cf417b501b1cbbdac43cfc24f655b00ccc91a47f2cac52703f1bc0bb5304e575f7d470aa8a399864ba3013baa",
                role: "admin",
                avatar: "👨‍💼",
                created_at: new Date().toISOString(),
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
            };
            
            // Create default student user
            const studentUser = {
                id: 2,
                username: "student",
                email: "student@quiz.app", 
                password_hash: "c4b311c98dad7d4e28a6ae0f2d462c1198c9e44cf417b501b1cbbdac43cfc24f655b00ccc91a47f2cac52703f1bc0bb5304e575f7d470aa8a399864ba3013baa",
                role: "student",
                avatar: "👨‍🎓",
                created_at: new Date().toISOString(),
                last_login: null,
                is_active: true,
                settings: {
                    theme: "blue",
                    notifications: true,
                    auto_next: true
                },
                battle_stats: {
                    rating: 1200,
                    wins: 0,
                    losses: 0
                }
            };
            
            // Store users
            await kv.set(KEYS.userById(1), adminUser);
            await kv.set(KEYS.userById(2), studentUser);
            await kv.set(KEYS.userByUsername('admin'), 1);
            await kv.set(KEYS.userByUsername('student'), 2);
            await kv.set(KEYS.userByEmail('admin@quiz.app'), 1);
            await kv.set(KEYS.userByEmail('student@quiz.app'), 2);
            
            // Store user list
            await kv.set(KEYS.users, [1, 2]);
            
            // Initialize quiz tables (basic set)
            const quizTables = [
                {
                    id: 1,
                    name: "Základy elektřiny",
                    category: "Elektrotechnika",
                    description: "Základní pojmy z elektrotechniky",
                    question_count: 50,
                    difficulty: "beginner",
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Bezpečnost práce",
                    category: "Bezpečnost",
                    description: "Pravidla bezpečnosti práce",
                    question_count: 30,
                    difficulty: "beginner", 
                    created_at: new Date().toISOString()
                }
            ];
            
            await kv.set(KEYS.questions, quizTables);
            
            console.log('Vercel KV database initialized successfully');
        }
        
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

// Users Database Class
export class UsersDB {
    static async findById(id) {
        try {
            return await kv.get(KEYS.userById(id));
        } catch (error) {
            console.error('UsersDB.findById error:', error);
            return null;
        }
    }
    
    static async findByUsername(username) {
        try {
            const userId = await kv.get(KEYS.userByUsername(username));
            if (!userId) return null;
            return await kv.get(KEYS.userById(userId));
        } catch (error) {
            console.error('UsersDB.findByUsername error:', error);
            return null;
        }
    }
    
    static async findByEmail(email) {
        try {
            const userId = await kv.get(KEYS.userByEmail(email));
            if (!userId) return null;
            return await kv.get(KEYS.userById(userId));
        } catch (error) {
            console.error('UsersDB.findByEmail error:', error);
            return null;
        }
    }
    
    static async create(userData) {
        try {
            // Get next user ID
            const metadata = await kv.get(KEYS.metadata);
            const newUserId = metadata.next_user_id;
            
            const newUser = {
                id: newUserId,
                ...userData,
                created_at: new Date().toISOString(),
                is_active: true
            };
            
            // Store user
            await kv.set(KEYS.userById(newUserId), newUser);
            await kv.set(KEYS.userByUsername(userData.username), newUserId);
            if (userData.email) {
                await kv.set(KEYS.userByEmail(userData.email), newUserId);
            }
            
            // Update user list
            const userIds = await kv.get(KEYS.users) || [];
            userIds.push(newUserId);
            await kv.set(KEYS.users, userIds);
            
            // Update metadata
            await kv.set(KEYS.metadata, {
                ...metadata,
                next_user_id: newUserId + 1,
                last_updated: new Date().toISOString()
            });
            
            return newUser;
        } catch (error) {
            console.error('UsersDB.create error:', error);
            return null;
        }
    }
    
    static async getAll() {
        try {
            const userIds = await kv.get(KEYS.users) || [];
            const users = [];
            
            for (const id of userIds) {
                const user = await kv.get(KEYS.userById(id));
                if (user) users.push(user);
            }
            
            return users;
        } catch (error) {
            console.error('UsersDB.getAll error:', error);
            return [];
        }
    }
}

// Sessions Database Class
export class SessionsDB {
    static async create(userId, token) {
        try {
            const session = {
                id: Date.now(),
                user_id: userId,
                token: token,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            };
            
            await kv.set(KEYS.sessionByToken(token), session);
            return session;
        } catch (error) {
            console.error('SessionsDB.create error:', error);
            return null;
        }
    }
    
    static async findByToken(token) {
        try {
            const session = await kv.get(KEYS.sessionByToken(token));
            if (!session) return null;
            
            // Check expiration
            if (new Date(session.expires_at) < new Date()) {
                await kv.del(KEYS.sessionByToken(token));
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('SessionsDB.findByToken error:', error);
            return null;
        }
    }
    
    static async delete(token) {
        try {
            await kv.del(KEYS.sessionByToken(token));
            return true;
        } catch (error) {
            console.error('SessionsDB.delete error:', error);
            return false;
        }
    }
}

// Questions Database Class
export class QuestionsDB {
    static async getAllTables() {
        try {
            return await kv.get(KEYS.questions) || [];
        } catch (error) {
            console.error('QuestionsDB.getAllTables error:', error);
            return [];
        }
    }
}

// Utility functions
export function hashPassword(password) {
    return crypto.pbkdf2Sync(password, 'quiz-salt-2025', 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// CORS Headers
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

// Response helpers
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
    return new Response(JSON.stringify({
        success: false,
        error: message
    }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

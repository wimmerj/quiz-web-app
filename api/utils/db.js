// Database connection utility for Vercel Edge Functions
import { neon } from '@neondatabase/serverless';

let sql = null;

export function getDB() {
    if (!sql) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        sql = neon(process.env.DATABASE_URL);
    }
    return sql;
}

// Simple password hashing (not bcrypt for Edge Functions compatibility)
import crypto from 'crypto';

export function hashPassword(password) {
    return crypto.pbkdf2Sync(password, 'quiz-salt', 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// Generate session token
export function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Session management
export async function createSession(userId) {
    const db = getDB();
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await db`
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (${userId}, ${token}, ${expiresAt})
    `;
    
    return token;
}

export async function verifySession(token) {
    if (!token) return null;
    
    const db = getDB();
    const result = await db`
        SELECT u.*, s.expires_at
        FROM users u
        JOIN user_sessions s ON u.id = s.user_id
        WHERE s.session_token = ${token}
        AND s.expires_at > NOW()
    `;
    
    return result.length > 0 ? result[0] : null;
}

export async function deleteSession(token) {
    const db = getDB();
    await db`DELETE FROM user_sessions WHERE session_token = ${token}`;
}

// CORS headers
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Response helpers
export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

export function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

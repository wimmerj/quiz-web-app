/**
 * CONSOLIDATED AUTH API
 * Handles: /api/auth (login, register, profile, logout)
 * Saves serverless function count for Vercel Hobby plan
 */

import { UsersDB, SessionsDB, verifyPassword, hashPassword, generateToken, corsHeaders, jsonResponse, errorResponse } from './utils/memory-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // Parse URL to determine action
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1]; // login, register, profile
    
    try {
        switch (action) {
            case 'login':
                return await handleLogin(request);
            case 'register':
                return await handleRegister(request);
            case 'profile':
                return await handleProfile(request);
            case 'logout':
                return await handleLogout(request);
            default:
                return errorResponse('Invalid auth action', 404);
        }
    } catch (error) {
        console.error('Auth API error:', error);
        return errorResponse('Internal server error', 500);
    }
}

async function handleLogin(request) {
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    const { username, password } = await request.json();
    
    if (!username || !password) {
        return errorResponse('Username and password are required');
    }
    
    // Find user
    const user = await UsersDB.findByUsername(username);
    
    if (!user) {
        return errorResponse('Invalid username or password', 401);
    }
    
    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
        return errorResponse('Invalid username or password', 401);
    }
    
    // Update last login
    await UsersDB.update(user.id, {
        last_login: new Date().toISOString()
    });
    
    // Create session
    const token = generateToken();
    await SessionsDB.create(user.id, token);
    
    return jsonResponse({
        success: true,
        message: 'Login successful',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        },
        token
    });
}

async function handleRegister(request) {
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    const { username, password, email } = await request.json();
    
    if (!username || !password) {
        return errorResponse('Username and password are required');
    }
    
    // Check if user already exists
    const existingUser = await UsersDB.findByUsername(username);
    if (existingUser) {
        return errorResponse('Username already exists', 409);
    }
    
    if (email) {
        const existingEmail = await UsersDB.findByEmail(email);
        if (existingEmail) {
            return errorResponse('Email already exists', 409);
        }
    }
    
    // Create new user
    const newUser = await UsersDB.create({
        username,
        email: email || null,
        password_hash: hashPassword(password),
        role: 'student',
        avatar: '👤',
        settings: {
            theme: 'orange',
            notifications: true,
            auto_next: false
        },
        battle_stats: {
            rating: 1500,
            wins: 0,
            losses: 0
        }
    });
    
    if (!newUser) {
        return errorResponse('Failed to create user');
    }
    
    // Create session
    const token = generateToken();
    await SessionsDB.create(newUser.id, token);
    
    return jsonResponse({
        success: true,
        message: 'Registration successful',
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            avatar: newUser.avatar
        },
        token
    });
}

async function handleProfile(request) {
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return errorResponse('No authentication token provided', 401);
    }
    
    // Verify session
    const session = await SessionsDB.findByToken(token);
    
    if (!session) {
        return errorResponse('Invalid or expired token', 401);
    }
    
    // Get user details
    const user = await UsersDB.findById(session.user_id);
    
    if (!user) {
        return errorResponse('User not found', 404);
    }
    
    return jsonResponse({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            settings: user.settings,
            battle_stats: user.battle_stats
        }
    });
}

async function handleLogout(request) {
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
        await SessionsDB.delete(token);
    }
    
    return jsonResponse({
        success: true,
        message: 'Logout successful'
    });
}

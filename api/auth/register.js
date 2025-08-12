import { UsersDB, SessionsDB, hashPassword, generateToken, corsHeaders, jsonResponse, errorResponse } from '../utils/memory-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    try {
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
        
    } catch (error) {
        console.error('Registration error:', error);
        return errorResponse('Registration failed');
    }
}

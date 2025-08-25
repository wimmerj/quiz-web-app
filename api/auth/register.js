// Vercel API endpoint pro registraci uživatelů
import { UsersDB, hashPassword, generateToken, corsHeaders, jsonResponse, errorResponse } from '../utils/json-db.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { username, password, email, avatar } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Check if user exists
        const existingUser = await UsersDB.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        // Check email if provided
        if (email) {
            const existingEmail = await UsersDB.findByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }
        
        // Create user
        const userData = {
            username,
            email: email || null,
            password_hash: hashPassword(password),
            role: 'student',
            avatar: avatar || '👤'
        };
        
        const newUser = await UsersDB.create(userData);
        if (!newUser) {
            return res.status(500).json({ error: 'Failed to create user' });
        }
        
        // Generate token
        const token = generateToken();
        
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    avatar: newUser.avatar
                },
                token
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

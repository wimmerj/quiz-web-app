import { getDB, hashPassword, createSession, corsHeaders, jsonResponse, errorResponse } from '../utils/db.js';

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
        
        const db = getDB();
        
        // Check if user already exists
        const existing = await db`
            SELECT id FROM users WHERE username = ${username}
        `;
        
        if (existing.length > 0) {
            return errorResponse('User already exists');
        }
        
        // Create new user
        const passwordHash = hashPassword(password);
        const result = await db`
            INSERT INTO users (username, email, password_hash)
            VALUES (${username}, ${email || ''}, ${passwordHash})
            RETURNING id, username, email, is_admin
        `;
        
        const user = result[0];
        const token = await createSession(user.id);
        
        return jsonResponse({
            success: true,
            message: 'Registration successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            },
            token
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        return errorResponse('Registration failed');
    }
}

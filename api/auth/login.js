import { getDB, verifyPassword, createSession, corsHeaders, jsonResponse, errorResponse } from '../utils/db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return errorResponse('Username and password are required');
        }
        
        const db = getDB();
        
        // Find user
        const result = await db`
            SELECT id, username, email, password_hash, is_admin
            FROM users 
            WHERE username = ${username}
        `;
        
        if (result.length === 0) {
            return errorResponse('Invalid username or password', 401);
        }
        
        const user = result[0];
        
        // Verify password
        if (!verifyPassword(password, user.password_hash)) {
            return errorResponse('Invalid username or password', 401);
        }
        
        // Update last login
        await db`
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ${user.id}
        `;
        
        // Create session
        const token = await createSession(user.id);
        
        return jsonResponse({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            },
            token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Login failed');
    }
}

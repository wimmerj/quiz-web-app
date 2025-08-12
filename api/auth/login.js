import { UsersDB, SessionsDB, verifyPassword, generateToken, corsHeaders, jsonResponse, errorResponse } from '../utils/memory-db.js';

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
        
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Login failed');
    }
}

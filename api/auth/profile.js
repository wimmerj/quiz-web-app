import { UsersDB, SessionsDB, corsHeaders, jsonResponse, errorResponse } from '../utils/json-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    try {
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
        
    } catch (error) {
        console.error('Profile error:', error);
        return errorResponse('Failed to get profile');
    }
}

import { verifySession, corsHeaders, jsonResponse, errorResponse } from '../utils/db.js';

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
        const user = await verifySession(token);
        
        if (!user) {
            return errorResponse('Invalid or expired token', 401);
        }
        
        return jsonResponse({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        return errorResponse('Failed to get profile');
    }
}

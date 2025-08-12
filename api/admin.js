/**
 * CONSOLIDATED ADMIN API - KV VERSION  
 * Handles: /api/admin (users, statistics, import, system)
 * Uses Vercel KV for persistent storage
 */

import { UsersDB, SessionsDB, QuestionsDB, corsHeaders, jsonResponse, errorResponse, initializeDatabase } from './utils/kv-db.js';

export default async function handler(request) {
    // Initialize database if needed
    await initializeDatabase();
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // Check admin authorization first
    const authResult = await checkAdminAuth(request);
    if (authResult.error) {
        return authResult.response;
    }
    
    // Parse URL to determine action
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];
    
    try {
        switch (action) {
            case 'users':
                return await handleUsers(request);
            case 'statistics':
                return await handleStatistics(request);
            case 'import':
                return await handleImport(request);
            case 'system':
                return await handleSystem(request);
            default:
                return errorResponse('Invalid admin action', 404);
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return errorResponse('Internal server error', 500);
    }
}

async function checkAdminAuth(request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return {
            error: true,
            response: errorResponse('Authentication required', 401)
        };
    }
    
    const session = await SessionsDB.findByToken(token);
    if (!session) {
        return {
            error: true,
            response: errorResponse('Invalid or expired token', 401)
        };
    }
    
    const user = await UsersDB.findById(session.user_id);
    if (!user || user.role !== 'admin') {
        return {
            error: true,
            response: errorResponse('Admin access required', 403)
        };
    }
    
    return { error: false, user };
}

async function handleUsers(request) {
    if (request.method === 'GET') {
        const users = await UsersDB.getAll();
        return jsonResponse({
            success: true,
            data: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                created_at: user.created_at,
                last_login: user.last_login,
                is_active: user.is_active
            }))
        });
    }
    
    return errorResponse('Method not allowed', 405);
}

async function handleStatistics(request) {
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    const users = await UsersDB.getAll();
    const tables = await QuestionsDB.getAllTables();
    
    const stats = {
        users: {
            total: users.length,
            active: users.filter(u => u.is_active).length,
            admins: users.filter(u => u.role === 'admin').length,
            students: users.filter(u => u.role === 'student').length
        },
        quiz: {
            tables: tables.length,
            total_questions: tables.reduce((sum, table) => sum + table.question_count, 0),
            categories: [...new Set(tables.map(t => t.category))]
        },
        system: {
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            node_version: process.version,
            environment: process.env.NODE_ENV || 'development'
        }
    };
    
    return jsonResponse({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
    });
}

async function handleImport(request) {
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    // This would handle quiz data import
    // For now, return placeholder
    return jsonResponse({
        success: true,
        message: 'Import functionality not yet implemented',
        timestamp: new Date().toISOString()
    });
}

async function handleSystem(request) {
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    return jsonResponse({
        success: true,
        system: {
            status: 'healthy',
            database: 'Memory JSON',
            functions: 'Consolidated',
            vercel_region: process.env.VERCEL_REGION || 'unknown',
            deployment_url: process.env.VERCEL_URL || 'local',
            timestamp: new Date().toISOString()
        }
    });
}

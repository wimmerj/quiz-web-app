/**
 * CONSOLIDATED API TESTER
 * Tests all consolidated endpoints
 */

import { corsHeaders, jsonResponse, errorResponse } from './utils/memory-db.js';

export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    const availableEndpoints = {
        auth: {
            path: '/api/auth',
            actions: ['login', 'register', 'profile', 'logout'],
            methods: ['POST', 'GET'],
            description: 'Consolidated authentication endpoints'
        },
        quiz: {
            path: '/api/quiz', 
            actions: ['tables', 'questions', 'submit-answer'],
            methods: ['GET', 'POST'],
            description: 'Consolidated quiz endpoints'
        },
        admin: {
            path: '/api/admin',
            actions: ['users', 'statistics', 'import', 'system'],
            methods: ['GET', 'POST'],
            description: 'Consolidated admin endpoints'
        },
        standalone: {
            paths: ['/api/monica', '/api/public-monica', '/api/test', '/api/health'],
            description: 'Individual specialized endpoints'
        }
    };
    
    return jsonResponse({
        success: true,
        message: 'Quiz App API - Consolidated for Vercel Hobby Plan',
        timestamp: new Date().toISOString(),
        total_functions: 7, // Down from 12+
        endpoints: availableEndpoints,
        usage: {
            example_auth: '/api/auth?action=login',
            example_quiz: '/api/quiz?action=tables',
            example_admin: '/api/admin?action=statistics'
        },
        vercel_info: {
            region: process.env.VERCEL_REGION || 'unknown',
            deployment_url: process.env.VERCEL_URL || 'local'
        }
    });
}

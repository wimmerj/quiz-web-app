/**
 * HEALTH CHECK ENDPOINT
 * GET /api/health
 */

import { corsHeaders, jsonResponse } from './utils/json-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    return jsonResponse({
        status: 'healthy',
        service: 'Quiz Web App API',
        database: 'JSON Files',
        timestamp: new Date().toISOString(),
        version: '2.0.0-json',
        environment: process.env.NODE_ENV || 'development'
    });
}

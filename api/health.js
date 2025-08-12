/**
 * HEALTH CHECK ENDPOINT
 * GET /api/health
 */

export default async function handler(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    const healthData = {
        status: 'healthy',
        service: 'Quiz Web App API',
        database: 'JSON Files',
        timestamp: new Date().toISOString(),
        version: '2.0.0-json',
        environment: process.env.NODE_ENV || 'development',
        vercel: {
            region: process.env.VERCEL_REGION || 'unknown',
            deployment: process.env.VERCEL_URL || 'local'
        }
    };
    
    return new Response(JSON.stringify(healthData, null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

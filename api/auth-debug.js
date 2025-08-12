/**
 * DEBUG AUTH ENDPOINT
 * Simple test for registration debugging
 */

export default async function handler(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
        // Parse request
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        
        console.log('Debug auth request:', { method: request.method, action });
        
        if (request.method === 'POST') {
            const body = await request.json();
            console.log('Request body:', body);
            
            if (action === 'register') {
                // Test basic registration response
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Debug registration test',
                    received: {
                        action,
                        body,
                        timestamp: new Date().toISOString()
                    }
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Debug endpoint - only handles registration test',
            action,
            method: request.method
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        console.error('Debug auth error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Debug endpoint error',
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

/**
 * Jednoduchý test Monica API - bez složitého promptu
 */

export default async function handler(request, response) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    };

    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
    });

    if (request.method === 'OPTIONS') {
        return response.status(200).json({ status: 'ok' });
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🧪 Monica API Simple Test');
        
        // Test s GPT-4 modelem pro Monica AI
        const testRequest = {
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: 'Hello, respond with just "OK"'
            }],
            max_tokens: 10
        };

        console.log('📡 Calling Monica API...');
        
        const monicaResponse = await fetch('https://openapi.monica.im/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MONICA_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuizApp-Test/1.0'
            },
            body: JSON.stringify(testRequest)
        });

        console.log(`📊 Monica API Response: ${monicaResponse.status} ${monicaResponse.statusText}`);

        if (!monicaResponse.ok) {
            const errorText = await monicaResponse.text();
            console.error(`❌ Monica API Error: ${errorText}`);
            
            return response.status(500).json({
                error: 'Monica API Error',
                status: monicaResponse.status,
                message: monicaResponse.statusText,
                details: errorText.substring(0, 200),
                timestamp: new Date().toISOString()
            });
        }

        const data = await monicaResponse.json();
        console.log('✅ Monica API Success');

        return response.status(200).json({
            success: true,
            message: 'Monica API test successful',
            response: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Test Error:', error);
        
        return response.status(500).json({
            error: 'Test failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

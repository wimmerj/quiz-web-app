// Vercel API endpoint pro health check
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        return res.status(200).json({
            status: 'healthy',
            github_storage: process.env.GITHUB_STORAGE === '1',
            github_token_set: !!process.env.GITHUB_TOKEN,
            timestamp: new Date().toISOString(),
            version: '2.0.0-github-storage'
        });
        
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Jednoduchý HTTP server pro lokální testování
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

// GitHub storage config (pro testování)
// Poznámka: Nezadávejte zde žádné tajné tokeny! Použijte proměnné prostředí.
process.env.GITHUB_STORAGE = process.env.GITHUB_STORAGE || '1';
// process.env.GITHUB_TOKEN musí být nastaven z vašeho prostředí (neukládat do repozitáře)
if (!process.env.GITHUB_TOKEN) {
    console.warn('[local-server] GITHUB_TOKEN není nastaven – GitHub storage zápis bude vypnutý');
}
process.env.GITHUB_OWNER = process.env.GITHUB_OWNER || 'wimmerj';
process.env.GITHUB_REPO = process.env.GITHUB_REPO || 'quiz-web-app';

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API Routes
    if (pathname.startsWith('/api/')) {
        try {
            if (pathname === '/api/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'healthy',
                    github_storage: process.env.GITHUB_STORAGE === '1',
                    github_token_set: !!process.env.GITHUB_TOKEN,
                    timestamp: new Date().toISOString(),
                    version: '2.0.0-local-test'
                }));
                return;
            }
            
            if (pathname === '/api/auth/register' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        // Pro demo - jen potvrdíme registraci
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'User registered successfully (DEMO)',
                            data: {
                                user: {
                                    id: Math.floor(Math.random() * 1000),
                                    username: data.username,
                                    email: data.email,
                                    role: 'student',
                                    avatar: data.avatar || '👤'
                                },
                                token: 'demo_token_' + Date.now()
                            }
                        }));
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
                return;
            }
            
            if (pathname === '/api/auth/login' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        // Pro demo - zkontrolujeme základní přihlašovací údaje
                        if (data.username === 'admin' && data.password === 'admin123') {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                message: 'Login successful (DEMO)',
                                data: {
                                    user: {
                                        id: 1,
                                        username: 'admin',
                                        email: 'admin@quiz.app',
                                        role: 'admin',
                                        avatar: '⚙️'
                                    },
                                    token: 'demo_admin_token_' + Date.now()
                                }
                            }));
                        } else {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid credentials (try admin/admin123)' }));
                        }
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
                return;
            }
            
            // 404 pro neexistující API endpointy
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
            
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }
    
    // Static file serving
    let filePath = pathname === '/' ? '/modular-app/frontend/index.html' : pathname;
    
    // Pokud nezačíná /modular-app/frontend, přidáme to
    if (!filePath.startsWith('/modular-app/frontend')) {
        filePath = '/modular-app/frontend' + filePath;
    }
    
    const fullPath = path.join(__dirname, filePath);
    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    try {
        const data = await fs.promises.readFile(fullPath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Pro SPA - pokud soubor neexistuje, vrátíme index.html
            try {
                const indexPath = path.join(__dirname, 'modular-app/frontend/index.html');
                const indexData = await fs.promises.readFile(indexPath);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexData);
            } catch (indexError) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            }
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server error');
        }
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
    console.log(`📱 Test auth at http://localhost:${PORT}/pages/auth/login.html`);
    console.log(`🔧 API health: http://localhost:${PORT}/api/health`);
    console.log(`👤 Demo login: admin / admin123`);
});

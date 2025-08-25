// CommonJS verze json-db pro lokální testování
const fs = require('fs').promises;
const crypto = require('crypto');
const fetch = require('node-fetch');

// GitHub storage functions
async function githubReadFile({ owner, repo, path, token }) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3.raw'
        }
    });
    if (!res.ok) throw new Error(`GitHub read error: ${res.status}`);
    return await res.text();
}

async function githubWriteFile({ owner, repo, path, content, token, message = 'Update via API' }) {
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    let sha = undefined;
    let exists = false;
    
    const getRes = await fetch(getUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        exists = true;
    }
    
    const body = {
        message,
        content: Buffer.from(content).toString('base64'),
        ...(exists ? { sha } : {})
    };
    
    const putRes = await fetch(getUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!putRes.ok) throw new Error(`GitHub write error: ${putRes.status}`);
    return await putRes.json();
}

// GitHub storage config
const GITHUB_ENABLED = process.env.GITHUB_STORAGE === '1';
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'wimmerj';
const GITHUB_REPO = process.env.GITHUB_REPO || 'quiz-web-app';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function loadJSON(filePath, githubPath) {
    try {
        if (GITHUB_ENABLED && githubPath && GITHUB_TOKEN) {
            const raw = await githubReadFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: githubPath, token: GITHUB_TOKEN });
            return JSON.parse(raw);
        } else {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error loading JSON file ${filePath}:`, error);
        return null;
    }
}

async function saveJSON(filePath, data, githubPath) {
    try {
        if (GITHUB_ENABLED && githubPath && GITHUB_TOKEN) {
            await githubWriteFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: githubPath, content: JSON.stringify(data, null, 2), token: GITHUB_TOKEN });
            return true;
        } else {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        }
    } catch (error) {
        console.error(`Error saving JSON file ${filePath}:`, error);
        return false;
    }
}

class UsersDB {
    static async getAll() {
        const data = await loadJSON('data/users.json', 'data/users.json');
        return data?.users || [];
    }
    
    static async findById(id) {
        const users = await this.getAll();
        return users.find(user => user.id === parseInt(id));
    }
    
    static async findByUsername(username) {
        const users = await this.getAll();
        return users.find(user => user.username === username);
    }
    
    static async findByEmail(email) {
        const users = await this.getAll();
        return users.find(user => user.email === email);
    }
    
    static async create(userData) {
        const data = await loadJSON('data/users.json', 'data/users.json');
        if (!data) return null;
        
        const newUser = {
            id: data.next_id,
            ...userData,
            created_at: new Date().toISOString(),
            is_active: true
        };
        
        data.users.push(newUser);
        data.next_id += 1;
        data.metadata.last_updated = new Date().toISOString();
        
        const saved = await saveJSON('data/users.json', data, 'data/users.json');
        return saved ? newUser : null;
    }
}

class SessionsDB {
    static async create(userId, token) {
        const data = await loadJSON('data/sessions.json', 'data/sessions.json');
        if (!data) return null;
        
        const session = {
            user_id: userId,
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        data.sessions.push(session);
        
        const saved = await saveJSON('data/sessions.json', data, 'data/sessions.json');
        return saved ? session : null;
    }
    
    static async findByToken(token) {
        const data = await loadJSON('data/sessions.json', 'data/sessions.json');
        if (!data) return null;
        
        const session = data.sessions.find(s => s.token === token);
        if (!session) return null;
        
        if (new Date(session.expires_at) < new Date()) {
            await this.delete(token);
            return null;
        }
        
        return session;
    }
    
    static async delete(token) {
        const data = await loadJSON('data/sessions.json', 'data/sessions.json');
        if (!data) return false;
        
        data.sessions = data.sessions.filter(s => s.token !== token);
        return await saveJSON('data/sessions.json', data, 'data/sessions.json');
    }
}

function hashPassword(password) {
    return crypto.pbkdf2Sync(password, 'quiz-salt-2025', 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    UsersDB,
    SessionsDB,
    hashPassword,
    verifyPassword,
    generateToken
};

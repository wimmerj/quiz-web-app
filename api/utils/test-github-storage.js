import { githubReadFile, githubWriteFile } from './github-storage.js';

const owner = process.env.GITHUB_OWNER || 'wimmerj';
const repo = process.env.GITHUB_REPO || 'quiz-web-app';
const token = process.env.GITHUB_TOKEN || 'quiz_user:O4z6nafEKCacD92p09ZwgOQGOlI1h7pC';
const path = 'data/users.json';

async function testGithubStorage() {
    if (!token) {
        console.error('GITHUB_TOKEN není nastaven!');
        return;
    }
    // 1. Načtení dat
    let raw;
    try {
        raw = await githubReadFile({ owner, repo, path, token });
        console.log('Načteno z GitHubu:', raw.slice(0, 200));
    } catch (e) {
        console.error('Chyba při čtení:', e);
        return;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error('Chyba při parsování JSON:', e);
        return;
    }
    // 2. Přidání testovacího uživatele
    const testUser = {
        id: data.next_id,
        username: 'test_github_user',
        email: 'test@github.com',
        created_at: new Date().toISOString(),
        is_active: true
    };
    data.users.push(testUser);
    data.next_id += 1;
    data.metadata.last_updated = new Date().toISOString();
    // 3. Zápis zpět
    try {
        await githubWriteFile({ owner, repo, path, content: JSON.stringify(data, null, 2), token, message: 'Test: přidán testovací uživatel' });
        console.log('Zápis na GitHub úspěšný!');
    } catch (e) {
        console.error('Chyba při zápisu:', e);
        return;
    }
    // 4. Ověření
    try {
        const verifyRaw = await githubReadFile({ owner, repo, path, token });
        const verifyData = JSON.parse(verifyRaw);
        const found = verifyData.users.find(u => u.username === 'test_github_user');
        if (found) {
            console.log('Testovací uživatel úspěšně přidán:', found);
        } else {
            console.error('Testovací uživatel nebyl nalezen!');
        }
    } catch (e) {
        console.error('Chyba při ověření:', e);
    }
}

testGithubStorage();

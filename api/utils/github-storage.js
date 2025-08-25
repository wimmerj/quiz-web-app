/**
 * GitHub Storage API for JSON files
 * Umožňuje čtení a zápis souborů do GitHub repozitáře přes REST API
 * Kompatibilní s Vercel Edge Functions
 */

const GITHUB_API_URL = 'https://api.github.com';

export async function githubReadFile({ owner, repo, path, token }) {
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3.raw'
        }
    });
    if (!res.ok) throw new Error(`GitHub read error: ${res.status}`);
    return await res.text();
}

export async function githubWriteFile({ owner, repo, path, content, token, message = 'Update via API' }) {
    // Nejprve zjistíme SHA existujícího souboru (nutné pro update)
    const getUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`;
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
    // Připravíme payload
    const putUrl = getUrl;
    const body = {
        message,
        content: Buffer.from(content).toString('base64'),
        ...(exists ? { sha } : {})
    };
    const putRes = await fetch(putUrl, {
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

/**
 * Příklad použití:
 * await githubReadFile({ owner: 'wimmerj', repo: 'quiz-web-app', path: 'data/users.json', token: 'ghp_xxx' })
 * await githubWriteFile({ owner: 'wimmerj', repo: 'quiz-web-app', path: 'data/users.json', content: '{...}', token: 'ghp_xxx' })
 */

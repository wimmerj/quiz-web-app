# GitHub JSON Storage - Nastavení a použití

Tento projekt umožňuje ukládat data (např. uživatele) do souborů v GitHub repozitáři pomocí GitHub API. Vhodné pro hobby projekty na Vercel, kde není persistentní disk.

## 1. Vytvoření GitHub Personal Access Tokenu

1. Jděte na [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens).
2. Vytvořte nový token (doporučuji "Fine-grained token") s právy:
   - Repo: Contents (čtení/zápis)
3. Uložte si token (začíná `ghp_...`).

## 2. Nastavení proměnných prostředí

Ve Vercel nebo lokálně nastavte:
- `GITHUB_STORAGE=1` (aktivuje GitHub storage)
- `GITHUB_TOKEN=ghp_xxx` (váš token)
- `GITHUB_OWNER=wimmerj` (vlastník repo)
- `GITHUB_REPO=quiz-web-app` (název repo)

## 3. Struktura dat

- Data se ukládají do souborů v adresáři `data/` v repozitáři, např. `data/users.json`.
- Formát souboru musí odpovídat očekávání aplikace (viz `json-db.js`).

## 4. Použití v kódu

Všechny operace s uživateli, sessions apod. automaticky používají GitHub storage, pokud je aktivováno.

Např. vytvoření uživatele:
```js
await UsersDB.create({ username: 'test', ... });
```

## 5. Omezení
- Zápis/čtení je pomalejší než lokální disk.
- GitHub API má rate limit (60/min pro neautorizované, 5000/hod pro token).
- Token nikdy nesdílejte veřejně!

## 6. Debugging
- Chyby se logují do konzole.
- Pokud není token nebo je špatně nastaveno prostředí, používá se lokální disk.

## 7. Příklad ručního volání
```js
import { githubReadFile, githubWriteFile } from './github-storage.js';
const raw = await githubReadFile({ owner: 'wimmerj', repo: 'quiz-web-app', path: 'data/users.json', token: 'ghp_xxx' });
await githubWriteFile({ owner: 'wimmerj', repo: 'quiz-web-app', path: 'data/users.json', content: raw, token: 'ghp_xxx' });
```

---

Pokud potřebujete další soubory (sessions, questions), nastavte cestu např. `data/sessions.json`.

**Váš backend je nyní připraven na GitHub storage!**

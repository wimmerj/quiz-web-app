# 🔄 API Proxy Solutions - Alternativy k Python Backend

## 🎯 Problém
- CORS blokuje API klíče v prohlížeči
- Render.com Python backend je drahý jen pro API proxy
- Potřebujeme bezpečné řešení pro API klíče

## 💡 Řešení 1: Vercel Edge Functions (DOPORUČENÉ)
**Výhody**: Zdarma, rychlé, auto-scale
**Náklady**: 0 USD/měsíc

### Setup:
```bash
npm install -g vercel
vercel init quiz-api-proxy
```

### Struktura:
```
quiz-api-proxy/
├── api/
│   ├── monica.js        # Monica AI proxy
│   └── health.js        # Health check
├── vercel.json          # Konfigurace
└── package.json
```

### Monica API Proxy (`api/monica.js`):
```javascript
export default async function handler(request, response) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', 'https://wimmerj.github.io');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, correctAnswer, userAnswer } = request.body;

    // Volání Monica API s API klíčem (bezpečně na serveru)
    const monicaResponse = await fetch('https://openapi.monica.im/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MONICA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Vyhodnoť odpověď studenta:
            
OTÁZKA: ${question}
SPRÁVNÁ ODPOVĚĎ: ${correctAnswer}  
ODPOVĚĎ STUDENTA: ${userAnswer}

Vrať JSON s hodnocením.`
        }],
        max_tokens: 500
      })
    });

    const result = await monicaResponse.json();
    response.status(200).json(result);

  } catch (error) {
    console.error('Monica API Error:', error);
    response.status(500).json({ error: 'API call failed' });
  }
}
```

### Deployment:
```bash
vercel --prod
# Výsledek: https://quiz-api-proxy.vercel.app
```

---

## 💡 Řešení 2: Netlify Functions 
**Výhody**: Zdarma, integrované s Git
**Náklady**: 0 USD/měsíc

### Setup:
```bash
npm install -g netlify-cli
netlify init
```

### Monica Function (`netlify/functions/monica.js`):
```javascript
exports.handler = async (event, context) => {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': 'https://wimmerj.github.io',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { question, correctAnswer, userAnswer } = JSON.parse(event.body);

    const response = await fetch('https://openapi.monica.im/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MONICA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Vyhodnoť odpověď: ${question} | Správně: ${correctAnswer} | Student: ${userAnswer}`
        }]
      })
    });

    const result = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API call failed' })
    };
  }
};
```

---

## 💡 Řešení 3: Cloudflare Workers (Pro pokročilé)
**Výhody**: Nejrychlejší, edge computing
**Náklady**: 0-5 USD/měsíc

### Monica Worker (`worker.js`):
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://wimmerj.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { question, correctAnswer, userAnswer } = await request.json();

    const monicaResponse = await fetch('https://openapi.monica.im/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MONICA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ 
          role: 'user', 
          content: `Vyhodnoť: ${question} → ${userAnswer} (správně: ${correctAnswer})`
        }]
      })
    });

    const result = await monicaResponse.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'API failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

---

## 💡 Řešení 4: GitHub Actions + GitHub Pages API
**Výhody**: Zdarma, integrované s GitHub
**Náklady**: 0 USD/měsíc

### Workflow (`.github/workflows/api-proxy.yml`):
```yaml
name: API Proxy
on:
  repository_dispatch:
    types: [monica-api-call]

jobs:
  proxy-call:
    runs-on: ubuntu-latest
    steps:
      - name: Call Monica API
        env:
          MONICA_API_KEY: ${{ secrets.MONICA_API_KEY }}
        run: |
          curl -X POST https://openapi.monica.im/v1/chat/completions \
            -H "Authorization: Bearer $MONICA_API_KEY" \
            -H "Content-Type: application/json" \
            -d "${{ github.event.client_payload.data }}" \
            > response.json
            
      - name: Save response
        run: |
          mkdir -p api-responses
          cp response.json api-responses/${{ github.event.client_payload.id }}.json
          
      - name: Deploy to Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: api-responses
```

---

## 🎯 Porovnání řešení

| Řešení | Náklady | Složitost | Latence | Spolehlivost |
|--------|---------|-----------|---------|--------------|
| **Vercel Edge** | 0€ | ⭐⭐ | 50ms | ⭐⭐⭐⭐⭐ |
| **Netlify Fns** | 0€ | ⭐⭐ | 100ms | ⭐⭐⭐⭐ |
| **Cloudflare** | 0-5€ | ⭐⭐⭐ | 20ms | ⭐⭐⭐⭐⭐ |
| **GitHub Actions** | 0€ | ⭐⭐⭐⭐ | 30s | ⭐⭐⭐ |

## 🚀 Implementace do modulární aplikace

### Frontend Update (`oral-exam.js`):
```javascript
class OralExamModule {
    constructor() {
        // Detekce API proxy URL
        this.proxyURL = this.detectProxyURL();
    }
    
    detectProxyURL() {
        if (window.location.hostname.includes('github.io')) {
            return 'https://quiz-api-proxy.vercel.app/api/monica'; // Production
        }
        return 'http://localhost:5000/api/monica'; // Development
    }
    
    async evaluateWithAI(question, correctAnswer, userAnswer) {
        try {
            const response = await fetch(this.proxyURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question,
                    correctAnswer,
                    userAnswer
                })
            });
            
            if (!response.ok) {
                throw new Error(`API proxy error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('API Proxy Error:', error);
            // Fallback na local evaluation
            return this.evaluateLocally(question, correctAnswer, userAnswer);
        }
    }
}
```

---

## 📊 Doporučení

### 🥇 **Pro začátek: Vercel Edge Functions**
- ✅ Zdarma až 100GB/měsíc
- ✅ Auto-scale
- ✅ Rychlé nasazení
- ✅ Dobrá dokumentace

### 🥈 **Pro růst: Cloudflare Workers**  
- ✅ Nejrychlejší (edge computing)
- ✅ Velmi levné
- ⚠️ Trochu složitější setup

### 🥉 **Pro experimenty: Netlify**
- ✅ Jednoduché
- ✅ Git integrace
- ⚠️ Pomalejší cold start

## 🔄 Migrace z Python Backend

1. **Deploy proxy na Vercel**
2. **Update frontend API URLs**  
3. **Test funkcionalita**
4. **Shutdown Python backend**

**Úspory**: $84/rok → $0/rok 💰

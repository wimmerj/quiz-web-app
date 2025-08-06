# 🚀 Backend Setup Guide - Modular Quiz App

> Kompletní návod pro nastavení backend serveru na Render.com s integrací Monica AI

## 📋 Přehled

Tento návod vás provede nastavením **moderního backend API** pro náš modulární Quiz systém:
- 🖥️ **Flask API** na Render.com s PostgreSQL databází
- 🤖 **Monica AI integrace** pro pokročilé funkce
- 🔐 **JWT autentifikace** s role-based přístupem
- 🌐 **CORS konfigurace** pro GitHub Pages frontend
- 📊 **Real-time analytics** a monitoring
- ⚔️ **Battle Mode API** pro multiplayer funkce
- 🎙️ **Voice API** pro Oral Exam modul

## 🏗️ Krok 1: Aktualizace Backend Struktury

### 1.1 Nová struktura pro modulární systém

```
web_backend/
├── app.py                 # Hlavní Flask aplikace
├── models/               # Database modely
│   ├── __init__.py
│   ├── user.py          # User management
│   ├── quiz.py          # Quiz & Questions
│   ├── battle.py        # Battle system
│   └── admin.py         # Admin funkcionalita
├── routes/              # API endpoints
│   ├── __init__.py
│   ├── auth.py          # Authentication
│   ├── quiz.py          # Quiz APIs
│   ├── battle.py        # Battle APIs
│   ├── admin.py         # Admin APIs
│   ├── oral_exam.py     # Voice/Oral APIs
│   └── settings.py      # Settings APIs
├── services/            # Business logika
│   ├── __init__.py
│   ├── monica_ai.py     # Monica AI integrace
│   ├── battle_engine.py # Real-time battle logika
│   └── analytics.py     # Statistiky a analytics
├── config.py           # Konfigurace
├── requirements.txt    # Dependencies
├── render.yaml        # Render.com deployment
└── migrations/        # Database migrace
```

### 1.2 Proč tato struktura?

- **Modulární rozdělení** - každý frontend modul má vlastní API endpoints
- **Škálovatelnost** - snadné přidávání nových funkcí
- **Maintainability** - čistý a organizovaný kód
- **Monica AI ready** - připraveno pro AI integraci

## 🤖 Krok 2: Monica AI Integrace

### 2.1 Co je Monica AI?

Monica AI je pokročilá AI platforma, kterou budeme používat pro:
- **🎙️ Oral Exam AI** - hodnocení ústních odpovědí
- **🧠 Smart Hints** - inteligentní nápovědy v kvízech
- **📊 Analytics AI** - pokročilé analýzy výkonu
- **⚔️ Battle AI** - AI protivníci v Battle módu

### 2.2 Získání Monica API klíče

1. **Registrace**: Jděte na [monica.im](https://monica.im)
2. **Aktivace API**: Přejděte do Settings > Developer
3. **Získání klíče**: Zkopírujte váš API klíč
4. **Kredity**: Ujistěte se, že máte dostatek kreditů

### 2.3 Monica API funkce

```python
# Příklad použití Monica AI
async def evaluate_oral_answer(question, user_answer, correct_answer):
    prompt = f'''
    Vyhodnoť následující ústní odpověď na otázku:
    
    OTÁZKA: {question}
    SPRÁVNÁ ODPOVĚĎ: {correct_answer}
    ODPOVĚĎ STUDENTA: {user_answer}
    
    Ohodnoť odpověď v JSON formátu:
    {{
        "score": 0-100,
        "feedback": "detailní zpětná vazba",
        "correctness": "správné/částečně správné/nesprávné",
        "suggestions": ["návrh1", "návrh2"]
    }}
    '''
    
    response = await monica_client.chat(prompt)
    return json.loads(response.content)
```

## 🖥️ Krok 3: Deployment na Render.com

### 3.1 Vytvoření PostgreSQL databáze

1. **Přihlášení** na [render.com](https://render.com)
2. **New PostgreSQL** database:
   - **Name**: `quiz-modular-db`
   - **Database**: `quiz_modular`
   - **User**: `quiz_admin`
   - **Region**: `Frankfurt` (rychlejší z ČR)
   - **Plan**: `Free` nebo `Starter` ($7/měsíc)

### 3.2 Nastavení Web Service

1. **New Web Service** z GitHub repo
2. **Konfigurace**:
   - **Name**: `quiz-modular-backend`
   - **Region**: `Frankfurt`
   - **Branch**: `main`
   - **Root Directory**: `web_backend`
   - **Runtime**: `Python 3.11`
   - **Build Command**: 
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     python init_db.py && gunicorn app:app --worker-class gevent --workers 2
     ```

### 3.3 Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | [Auto from DB] | PostgreSQL connection |
| `SECRET_KEY` | [Generate] | JWT secret key |
| `FLASK_ENV` | `production` | Production mode |
| `MONICA_API_KEY` | `your-key-here` | Monica AI API klíč |
| `CORS_ORIGINS` | `https://wimmerj.github.io` | GitHub Pages URL |
| `RATE_LIMIT_ENABLED` | `true` | Rate limiting |
| `ANALYTICS_ENABLED` | `true` | Analytics tracking |

## 🔧 Krok 4: Frontend Konfigurace

### 4.1 Aktualizace API konfigurace

```javascript
// modular-app/frontend/shared/api-client.js
const API_CONFIG = {
    // Váš Render.com backend URL
    PRODUCTION_URL: 'https://quiz-modular-backend-xxx.onrender.com',
    DEVELOPMENT_URL: 'http://localhost:5000',
    
    // Auto-detekce prostředí
    getBaseURL() {
        if (window.location.hostname.includes('github.io')) {
            return this.PRODUCTION_URL;
        }
        return this.DEVELOPMENT_URL;
    },
    
    // API endpoints pro jednotlivé moduly
    ENDPOINTS: {
        AUTH: '/api/auth',
        QUIZ: '/api/quiz',
        BATTLE: '/api/battle',
        ADMIN: '/api/admin',
        ORAL_EXAM: '/api/oral-exam',
        SETTINGS: '/api/settings',
        ANALYTICS: '/api/analytics'
    }
};
```

### 4.2 Testování API připojení

```javascript
// Test backend připojení
async function testBackendConnection() {
    try {
        const response = await fetch(API_CONFIG.getBaseURL() + '/api/health');
        const data = await response.json();
        console.log('✅ Backend connected:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}
```

## ⚔️ Krok 5: Battle Mode Backend

### 5.1 Real-time Battle API

Battle mód vyžaduje speciální backend podporu:

```python
# WebSocket support pro real-time battles
from flask_socketio import SocketIO, emit, join_room, leave_room

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('join_battle')
def on_join_battle(data):
    battle_id = data['battle_id']
    user_id = data['user_id']
    
    join_room(battle_id)
    emit('battle_joined', {
        'battle_id': battle_id,
        'user_id': user_id,
        'timestamp': datetime.now().isoformat()
    }, room=battle_id)

@socketio.on('battle_answer')
def on_battle_answer(data):
    # Zpracování odpovědi v real-time
    battle_id = data['battle_id']
    answer_data = process_battle_answer(data)
    
    emit('answer_result', answer_data, room=battle_id)
```

### 5.2 Matchmaking algoritmus

```python
class MatchmakingService:
    def find_opponent(self, user_rating, battle_mode):
        # Najde protivníka s podobným ratingem
        rating_range = 200  # ±200 bodů
        
        opponent = BattleQueue.query.filter(
            BattleQueue.rating.between(
                user_rating - rating_range,
                user_rating + rating_range
            ),
            BattleQueue.mode == battle_mode,
            BattleQueue.status == 'waiting'
        ).first()
        
        return opponent
```

## 🎙️ Krok 6: Oral Exam AI Backend

### 6.1 Speech-to-Text processing

```python
@app.route('/api/oral-exam/process-audio', methods=['POST'])
def process_audio():
    audio_file = request.files['audio']
    question_id = request.form['question_id']
    
    # Převod řeči na text (můžeme použít externí službu)
    transcript = speech_to_text(audio_file)
    
    # AI hodnocení pomocí Monica
    evaluation = evaluate_with_monica(question_id, transcript)
    
    return jsonify({
        'transcript': transcript,
        'evaluation': evaluation,
        'score': evaluation['score'],
        'feedback': evaluation['feedback']
    })
```

### 6.2 Monica AI hodnocení

```python
async def evaluate_with_monica(question_id, user_answer):
    question = Question.query.get(question_id)
    
    prompt = f"""
    Vyhodnoť ústní odpověď studenta na otázku:
    
    OTÁZKA: {question.text}
    SPRÁVNÁ ODPOVĚĎ: {question.correct_answer}
    ODPOVĚĎ STUDENTA: {user_answer}
    
    Vrať JSON s hodnocením:
    {{
        "score": 0-100,
        "correctness": "correct/partial/incorrect",
        "feedback": "konstruktivní zpětná vazba",
        "suggestions": ["doporučení pro zlepšení"],
        "pronunciation_score": 0-100,
        "grammar_score": 0-100
    }}
    """
    
    response = await monica_ai_service.chat(prompt)
    return json.loads(response.content)
```

## 📊 Krok 7: Analytics a Monitoring

### 7.1 Real-time statistiky

```python
@app.route('/api/analytics/dashboard')
@admin_required
def analytics_dashboard():
    stats = {
        'active_users': User.query.filter_by(is_active=True).count(),
        'total_questions': Question.query.count(),
        'battles_today': Battle.query.filter(
            Battle.created_at >= datetime.now().date()
        ).count(),
        'oral_exams_completed': OralExam.query.filter_by(
            status='completed'
        ).count(),
        'monica_api_calls_today': get_monica_usage_today(),
        'performance_metrics': get_performance_metrics()
    }
    
    return jsonify(stats)
```

### 7.2 Usage monitoring

```python
def track_monica_usage(user_id, feature, tokens_used):
    usage = MonicaUsage(
        user_id=user_id,
        feature=feature,
        tokens_used=tokens_used,
        timestamp=datetime.now()
    )
    db.session.add(usage)
    db.session.commit()
```

## 🔒 Krok 8: Bezpečnost

### 8.1 Rate limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"]
)

# API-specific limits
@app.route('/api/monica/chat')
@limiter.limit("50 per hour")  # Monica AI má omezené volání
def monica_chat():
    pass

@app.route('/api/battle/join')
@limiter.limit("10 per minute")  # Prevence spam joinů
def battle_join():
    pass
```

### 8.2 JWT security

```python
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm=JWT_ALGORITHM)
```

## 💰 Krok 9: Náklady a Optimalizace

### 9.1 Render.com náklady

| Služba | Plan | Cena/měsíc | Poznámka |
|--------|------|------------|----------|
| **Web Service** | Free | $0 | 750 hodin |
| **Web Service** | Starter | $7 | Unlimited + custom domain |
| **PostgreSQL** | Free | $0 | 1GB storage |
| **PostgreSQL** | Starter | $7 | 10GB + backups |

### 9.2 Monica AI náklady

| Usage | Cena | Poznámka |
|-------|------|----------|
| **Basic plan** | $10/měsíc | 100K tokens |
| **Pro plan** | $20/měsíc | 300K tokens |
| **API calls** | ~$0.002/call | Pro oral exam |

### 9.3 Optimalizace nákladů

- **Caching**: Redis/Memcached pro časté dotazy
- **Database indexing**: Optimalizace SQL dotazů
- **Monica API batching**: Skupinové volání AI
- **CDN**: Statické soubory přes GitHub Pages

## 🚀 Krok 10: Deployment Checklist

### ✅ Před deploymentem

- [ ] Monica AI klíč nastaven
- [ ] PostgreSQL databáze vytvořena
- [ ] Environment variables nastaveny
- [ ] CORS konfigurace pro GitHub Pages
- [ ] Rate limiting nakonfigurován
- [ ] SSL certificates (automaticky přes Render.com)

### ✅ Po deploymentu

- [ ] Test všech API endpoints
- [ ] Monica AI integrace funguje
- [ ] Battle mode real-time připojení
- [ ] Oral exam audio processing
- [ ] Admin panel přístup
- [ ] Analytics dashboard
- [ ] Error monitoring nastaveno

## 📞 Podpora a Troubleshooting

### Časté problémy:

**1. Monica AI nefunguje**
```bash
# Test Monica API
curl -X POST https://openapi.monica.im/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

**2. Database connection issues**
```python
# Test DB připojení
from app import db
db.create_all()  # Pokud funguje, DB je OK
```

**3. CORS problémy**
```javascript
// V browser console
fetch('https://your-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

## 🎯 Výsledek

Po dokončení budete mít:

✅ **Plně funkční backend API na Render.com**  
✅ **Monica AI integraci pro pokročilé funkce**  
✅ **Real-time Battle system s WebSockets**  
✅ **Oral Exam AI s speech processing**  
✅ **Kompletní admin panel s analytics**  
✅ **Bezpečnou autentifikaci a rate limiting**  
✅ **Škálovatelnou architekturu připravenou na růst**

---

*Připraveno pro budoucnost s AI! 🤖✨*

**URL příklady:**
- Backend API: `https://quiz-modular-backend-xxx.onrender.com`
- Frontend: `https://wimmerj.github.io/quiz-web-app/modular-app/`
- Admin: `https://wimmerj.github.io/quiz-web-app/modular-app/frontend/pages/admin/`

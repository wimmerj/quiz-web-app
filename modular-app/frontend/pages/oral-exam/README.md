# Oral Exam Module - AI Integration

## Přehled
Tento modul poskytuje pokročilé ústní zkoušení s podporou AI vyhodnocení odpovědí pomocí Monica AI služby.

## Funkce
- **Rozpoznávání řeči**: Web Speech API pro převod hlasu na text
- **Syntéza řeči**: Text-to-speech pro přečtení otázek  
- **AI vyhodnocení**: Monica AI API pro inteligentní hodnocení odpovědí
- **Lokální fallback**: Základní hodnocení bez AI kdy není dostupná
- **Vizualizace hlasu**: Grafické zobrazení zvukového vstupu
- **Podrobná zpětná vazba**: Strukturovaná analýza odpovědí

## AI Vyhodnocení

### Požadavky
1. **Backend**: Modulární backend s Monica AI integrací
2. **API klíč**: Konfigurovaný MONICA_API_KEY v prostředí
3. **Přihlášení**: Uživatel musí být přihlášen pro AI features

### Jak funguje
1. **Primární**: Pokus o AI vyhodnocení přes `/api/monica/evaluate`
2. **Fallback**: Lokální vyhodnocení při nedostupnosti AI
3. **Analýza**: Vrací skóre, pozitiva, negativa a doporučení

### API Response Format
```json
{
  "summary": "Shrnutí odpovědi",
  "score": 85,
  "positives": ["Správné klíčové pojmy", "Dobrá struktura"],
  "negatives": ["Chybějící detaily"],
  "recommendations": ["Rozveďte více konkrétní příklady"],
  "grade": "B",
  "scoreBreakdown": {
    "factual": 80,
    "completeness": 75,
    "clarity": 90,
    "structure": 85
  },
  "method": "ai-monica"
}
```

## Konfigurace

### Environment Variables
```bash
MONICA_API_KEY=your-monica-api-key-here
MONICA_API_URL=https://openapi.monica.im/v1/chat/completions
```

### Frontend Settings
Uživatel může upravit nastavení v pokročilých možnostech:
- **Režim hodnocení**: strict/fuzzy/semantic
- **Práh podobnosti**: 0.5-1.0
- **Rozpoznávání řeči**: jazyk, průběžné výsledky
- **Syntéza řeči**: rychlost, výška, hlasitost

## Použití

### Základní workflow
1. **Spuštění**: Vybrat tabulku otázek a spustit zkoušku
2. **Otázka**: Systém přečte otázku pomocí TTS
3. **Odpověď**: Uživatel odpovídá hlasem nebo textem
4. **Vyhodnocení**: AI analyzuje odpověď a poskytne feedback
5. **Pokračování**: Přechod na další otázku

### Testování
- Použijte API Test tlačítko pro ověření funkcí
- Zkontrolujte konzoli pro debug informace
- Ověřte stav indikátoru připojení

## Komponenty

### OralExamModule
Hlavní třída spravující celý průběh ústního zkoušení.

**Klíčové metody:**
- `evaluateWithAI()`: AI vyhodnocení odpovědi
- `evaluateAnswer()`: Hlavní metoda pro hodnocení s fallbackem
- `showAnswerFeedback()`: Zobrazení strukturované zpětné vazby

### APIClient Integration
Rozšířený APIClient s metodou `evaluateAnswer()` pro komunikaci s backend AI službou.

### Monica AI Service
Backend služba poskytující proxy pro Monica AI API s rate limiting a error handling.

## Troubleshooting

### AI nedostupná
- **Symptom**: "Using local evaluation" v odpovědi
- **Řešení**: Zkontrolovat MONICA_API_KEY a backend dostupnost

### Rozpoznávání řeči nefunguje
- **Symptom**: Prázdné transkripce nebo chyby
- **Řešení**: Povolit mikrofon, používat HTTPS, testovat v Chrome/Edge

### Nízké skóre hodnocení
- **Symptom**: Neočekávané nízké skóre za správné odpovědi
- **Řešení**: Upravit similarity threshold v nastavení

## Příklad kódu

### Ruční AI vyhodnocení
```javascript
const evaluation = await window.oralExamModule.evaluateWithAI(
    "Co je JavaScript?",
    "JavaScript je programovací jazyk",
    "JavaScript je jazyk pro webové stránky"
);

console.log(evaluation.score); // 85
console.log(evaluation.summary); // "Dobrá odpověď s správnými pojmy"
```

### Backend API volání
```python
# Python backend
evaluation = monica_ai.evaluate_oral_answer(
    question_text="Co je JavaScript?",
    correct_answer="JavaScript je programovací jazyk",
    user_answer="JS je jazyk pro web"
)
```

## Bezpečnost
- API klíče jsou uloženy pouze na serveru
- Frontend komunikuje přes autentizované API endpointy
- Žádné citlivé údaje nejsou logován v prohlížeči
- Rate limiting chrání před nadmérným použitím AI API

## Výkon
- AI vyhodnocení ~2-5 sekund
- Lokální fallback <100ms
- Cachování pro opakované dotazy
- Progresivní loading pro lepší UX

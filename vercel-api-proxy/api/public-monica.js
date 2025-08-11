/**
 * Monica AI API Proxy - Public Endpoint (bez autentifikace)
 * Pro veřejné API volání z frontendu
 */

export default async function handler(request, response) {
    // CORS headers pro všechny domény (veřejný endpoint)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // Povoleno pro všechny domény
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };

    // Nastavení CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
    });

    // Předběžný CORS požadavek
    if (request.method === 'OPTIONS') {
        return response.status(200).json({ status: 'ok', cors: 'enabled' });
    }

    // Povolujeme pouze POST požadavky
    if (request.method !== 'POST') {
        return response.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['POST'],
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Validace požadavku
        const { question, correctAnswer, userAnswer, explanation } = request.body;
        
        if (!question || !correctAnswer || !userAnswer) {
            return response.status(400).json({
                error: 'Missing required fields',
                required: ['question', 'correctAnswer', 'userAnswer'],
                received: { 
                    question: !!question, 
                    correctAnswer: !!correctAnswer, 
                    userAnswer: !!userAnswer 
                }
            });
        }

        console.log('🎯 Monica API Public Proxy - Processing request');

        // Sestavení promptu pro Monica AI
        const prompt = `Vyhodnoť odpověď studenta na následující otázku:

OTÁZKA: ${question}
SPRÁVNÁ ODPOVĚĎ: ${correctAnswer}
ODPOVĚĎ STUDENTA: ${userAnswer}
${explanation ? `VYSVĚTLENÍ: ${explanation}` : ''}

Prosím, vrať hodnocení v následujícím JSON formátu:
{
  "summary": "krátké shrnutí odpovědi studenta",
  "score": "číselné hodnocení 0-100",
  "feedback": "konstruktivní zpětná vazba",
  "correctness": "správnost odpovědi (correct/partial/incorrect)",
  "suggestions": ["seznam návrhů pro zlepšení"],
  "praise": "pozitivní komentář (pokud je co chválit)"
}`;

        // Volání Monica AI API
        const monicaResponse = await fetch('https://openapi.monica.im/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MONICA_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuizApp-Public/1.0'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'Jsi učitel, který hodnotí odpovědi studentů. Buď konstruktivní a povzbuzující.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        // Kontrola odpovědi z Monica API
        if (!monicaResponse.ok) {
            console.error('Monica API Error:', monicaResponse.status, monicaResponse.statusText);
            
            // Rate limit handling
            if (monicaResponse.status === 429) {
                return response.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Příliš mnoho požadavků. Zkuste za chvíli.',
                    retryAfter: 60
                });
            }
            
            // Auth error
            if (monicaResponse.status === 401) {
                return response.status(500).json({
                    error: 'API authentication failed',
                    message: 'Problém s API klíčem'
                });
            }
            
            throw new Error(`Monica API returned ${monicaResponse.status}`);
        }

        const monicaData = await monicaResponse.json();
        
        // Extrakce odpovědi z Monica API
        const aiContent = monicaData.choices?.[0]?.message?.content;
        
        if (!aiContent) {
            throw new Error('No content received from Monica AI');
        }

        // Pokus o parsování JSON z odpovědi
        let evaluationResult;
        try {
            // Najít JSON v odpovědi
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluationResult = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback pokud není JSON format
                evaluationResult = {
                    summary: aiContent.substring(0, 150) + '...',
                    score: 75,
                    feedback: aiContent,
                    correctness: 'partial',
                    suggestions: ['Zkuste odpověď více rozvinout'],
                    praise: 'Pokračujte v učení!'
                };
            }
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            
            // Backup struktura
            evaluationResult = {
                summary: 'AI hodnocení dokončeno',
                score: 70,
                feedback: aiContent,
                correctness: 'partial',
                suggestions: ['Zkontrolujte odpověď a doplňte detaily'],
                praise: 'Dobrá snaha!'
            };
        }

        // Validace a sanitizace výsledku
        const sanitizedResult = {
            summary: evaluationResult.summary || 'Hodnocení dokončeno',
            score: Math.max(0, Math.min(100, parseInt(evaluationResult.score) || 50)),
            feedback: evaluationResult.feedback || 'Zpětná vazba zpracována',
            correctness: evaluationResult.correctness || 'partial',
            suggestions: Array.isArray(evaluationResult.suggestions) ? 
                evaluationResult.suggestions.slice(0, 5) : ['Pokračujte v přípravě'],
            praise: evaluationResult.praise || 'Výborná práce!',
            timestamp: new Date().toISOString(),
            method: 'monica-ai-public-proxy',
            responseTime: Date.now() - (request.startTime || Date.now())
        };

        console.log('✅ Monica API Public Proxy - Success');
        
        return response.status(200).json({
            success: true,
            evaluation: sanitizedResult,
            usage: monicaData.usage || null,
            endpoint: 'public'
        });

    } catch (error) {
        console.error('❌ Monica API Public Proxy Error:', error);
        
        return response.status(500).json({
            error: 'Internal server error',
            message: 'Proxy volání na Monica AI selhalo',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
            timestamp: new Date().toISOString(),
            endpoint: 'public'
        });
    }
}

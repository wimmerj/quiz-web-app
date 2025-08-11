/**
 * Monica AI API Proxy - Vercel Edge Function
 * Řeší CORS problém pro API klíče v prohlížeči
 */

export default async function handler(request, response) {
    // CORS headers pro vaši aplikaci
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://wimmerj.github.io', // Změňte na váš GitHub Pages URL
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
        return response.status(200).end();
    }

    // Povolujeme pouze POST požadavky
    if (request.method !== 'POST') {
        return response.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
    }

    try {
        // Validace požadavku
        const { question, correctAnswer, userAnswer, explanation } = request.body;
        
        if (!question || !correctAnswer || !userAnswer) {
            return response.status(400).json({
                error: 'Missing required fields',
                required: ['question', 'correctAnswer', 'userAnswer']
            });
        }

        console.log('🎯 Monica API Proxy - Processing request');

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
                'User-Agent': 'QuizApp/1.0'
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
            
            // Různé error handling podle status kódu
            if (monicaResponse.status === 401) {
                return response.status(500).json({
                    error: 'API authentication failed',
                    message: 'Zkontrolujte API klíč pro Monica AI'
                });
            }
            
            if (monicaResponse.status === 429) {
                return response.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Příliš mnoho požadavků na API. Zkuste za chvíli.'
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
            // Najít JSON v odpovědi (může být zabalený v textu)
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluationResult = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback pokud není JSON format
                evaluationResult = {
                    summary: aiContent.substring(0, 100) + '...',
                    score: 75, // Default score
                    feedback: aiContent,
                    correctness: 'partial',
                    suggestions: ['Zkuste odpověď více rozvinout'],
                    praise: 'Snaha je viditelná!'
                };
            }
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            
            // Backup struktura pokud JSON parsing selže
            evaluationResult = {
                summary: 'Hodnocení dokončeno',
                score: 70,
                feedback: aiContent,
                correctness: 'partial',
                suggestions: ['Zkontrolujte odpověď a zkuste ji přeformulovat'],
                praise: 'Pokračujte v učení!'
            };
        }

        // Validace a sanitizace výsledku
        const sanitizedResult = {
            summary: evaluationResult.summary || 'Hodnocení zpracováno',
            score: Math.max(0, Math.min(100, parseInt(evaluationResult.score) || 50)),
            feedback: evaluationResult.feedback || 'Zpětná vazba není dostupná',
            correctness: evaluationResult.correctness || 'partial',
            suggestions: Array.isArray(evaluationResult.suggestions) ? 
                evaluationResult.suggestions : ['Pokračujte v přípravě'],
            praise: evaluationResult.praise || 'Dobrá práce!',
            timestamp: new Date().toISOString(),
            method: 'Monica AI via Vercel Proxy'
        };

        console.log('✅ Monica API Proxy - Success');
        
        return response.status(200).json({
            success: true,
            evaluation: sanitizedResult,
            usage: monicaData.usage || null
        });

    } catch (error) {
        console.error('❌ Monica API Proxy Error:', error);
        
        return response.status(500).json({
            error: 'Internal server error',
            message: 'Proxy volání na Monica AI selhalo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}

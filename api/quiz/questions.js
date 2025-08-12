import { QuestionsDB, corsHeaders, jsonResponse, errorResponse } from '../utils/json-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const tableName = pathParts[pathParts.length - 1]; // Get table name from URL
        
        if (!tableName || tableName === 'questions') {
            return errorResponse('Table name is required');
        }
        
        // Verify table exists
        const table = await QuestionsDB.getTableByName(tableName);
        
        if (!table) {
            return errorResponse('Table not found', 404);
        }
        
        // Get questions for the table
        const questions = await QuestionsDB.getQuestionsByTable(tableName);
        
        return jsonResponse({
            success: true,
            table_name: tableName,
            data: questions.map(q => ({
                id: q.id,
                otazka: q.question,
                odpoved_a: q.answer_a,
                odpoved_b: q.answer_b,
                odpoved_c: q.answer_c,
                spravna_odpoved: q.correct_answer,
                vysvetleni: q.explanation,
                difficulty: q.difficulty,
                category: q.category
            }))
        });
        
    } catch (error) {
        console.error('Questions error:', error);
        return errorResponse('Failed to fetch questions');
    }
}

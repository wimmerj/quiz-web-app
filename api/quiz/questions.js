import { getDB, corsHeaders, jsonResponse, errorResponse } from '../utils/db.js';

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
        
        const db = getDB();
        
        // Verify table exists
        const tableExists = await db`
            SELECT id FROM quiz_tables WHERE name = ${tableName}
        `;
        
        if (tableExists.length === 0) {
            return errorResponse('Table not found', 404);
        }
        
        // Get questions for the table
        const questions = await db`
            SELECT id, question, answer, options, difficulty, created_at
            FROM questions
            WHERE table_name = ${tableName}
            ORDER BY id
        `;
        
        return jsonResponse({
            success: true,
            tableName,
            questions: questions.map(q => ({
                id: q.id,
                question: q.question,
                answer: q.answer,
                options: q.options,
                difficulty: q.difficulty,
                createdAt: q.created_at
            }))
        });
        
    } catch (error) {
        console.error('Questions error:', error);
        return errorResponse('Failed to fetch questions');
    }
}

/**
 * CONSOLIDATED QUIZ API - KV VERSION
 * Handles: /api/quiz (tables, questions, submit-answer)
 * Uses Vercel KV for persistent storage
 */

import { QuestionsDB, SessionsDB, UsersDB, corsHeaders, jsonResponse, errorResponse, initializeDatabase } from './utils/kv-db.js';

export default async function handler(request) {
    // Initialize database if needed
    await initializeDatabase();
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // Parse URL to determine action
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1]; // tables, questions, submit-answer
    
    try {
        switch (action) {
            case 'tables':
                return await handleTables(request);
            case 'questions':
                // Check if it's a specific table request
                const tableName = pathParts[pathParts.length - 2];
                if (tableName && tableName !== 'quiz') {
                    return await handleQuestions(request, tableName);
                }
                return errorResponse('Table name is required', 400);
            case 'submit-answer':
                return await handleSubmitAnswer(request);
            default:
                // Check if it's a dynamic route like /quiz/questions/tablename
                if (pathParts[pathParts.length - 2] === 'questions') {
                    return await handleQuestions(request, action);
                }
                return errorResponse('Invalid quiz action', 404);
        }
    } catch (error) {
        console.error('Quiz API error:', error);
        return errorResponse('Internal server error', 500);
    }
}

async function handleTables(request) {
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    // Get all quiz tables with question counts
    const tables = await QuestionsDB.getAllTables();
    
    return jsonResponse({
        success: true,
        data: tables.map(table => ({
            name: table.name,
            display_name: table.display_name,
            description: table.description,
            question_count: table.question_count,
            category: table.category,
            created_at: table.created_at
        }))
    });
}

async function handleQuestions(request, tableName) {
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
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
}

async function handleSubmitAnswer(request) {
    if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
    }
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return errorResponse('Authentication required', 401);
    }
    
    // Verify session
    const session = await SessionsDB.findByToken(token);
    if (!session) {
        return errorResponse('Invalid or expired token', 401);
    }
    
    const { question_id, answer, is_correct, time_spent } = await request.json();
    
    if (!question_id || !answer) {
        return errorResponse('Question ID and answer are required');
    }
    
    // Here you would typically save the result to database
    // For now, just return success
    
    return jsonResponse({
        success: true,
        message: 'Answer submitted successfully',
        data: {
            question_id,
            answer,
            is_correct: is_correct || false,
            time_spent: time_spent || 0,
            submitted_at: new Date().toISOString()
        }
    });
}

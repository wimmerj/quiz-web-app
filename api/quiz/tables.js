import { QuestionsDB, corsHeaders, jsonResponse, errorResponse } from '../utils/memory-db.js';

export default async function handler(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    if (request.method !== 'GET') {
        return errorResponse('Method not allowed', 405);
    }
    
    try {
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
        
    } catch (error) {
        console.error('Tables error:', error);
        return errorResponse('Failed to fetch tables');
    }
}

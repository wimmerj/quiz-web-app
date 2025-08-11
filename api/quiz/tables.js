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
        const db = getDB();
        
        // Get all quiz tables with question counts
        const tables = await db`
            SELECT 
                qt.*,
                COUNT(q.id) as question_count
            FROM quiz_tables qt
            LEFT JOIN questions q ON qt.name = q.table_name
            GROUP BY qt.id, qt.name, qt.display_name, qt.description, qt.created_at
            ORDER BY qt.display_name
        `;
        
        return jsonResponse({
            success: true,
            tables: tables.map(table => ({
                name: table.name,
                displayName: table.display_name,
                description: table.description,
                questionCount: parseInt(table.question_count),
                createdAt: table.created_at
            }))
        });
        
    } catch (error) {
        console.error('Tables error:', error);
        return errorResponse('Failed to fetch tables');
    }
}

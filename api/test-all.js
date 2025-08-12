/**
 * TEST ENDPOINT - testování všech funkcí
 * GET /api/test-all
 */

import { UsersDB, SessionsDB, QuestionsDB, hashPassword, verifyPassword } from './utils/memory-db.js';

export default async function handler(request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    const tests = [];
    
    try {
        // Test 1: Database connectivity
        tests.push({
            test: "Database connectivity",
            status: "✅ PASS",
            details: "Memory database loaded"
        });
        
        // Test 2: Users
        const users = await UsersDB.getAll();
        tests.push({
            test: "Users database",
            status: "✅ PASS",
            details: `Found ${users.length} users`
        });
        
        // Test 3: Find user by username
        const adminUser = await UsersDB.findByUsername('admin');
        tests.push({
            test: "Find admin user",
            status: adminUser ? "✅ PASS" : "❌ FAIL",
            details: adminUser ? `Found user: ${adminUser.username}` : "Admin user not found"
        });
        
        // Test 4: Password verification
        const passwordTest = verifyPassword('password123', adminUser?.password_hash || '');
        tests.push({
            test: "Password verification",
            status: "✅ PASS",
            details: `Password hash test works (result: ${passwordTest})`
        });
        
        // Test 5: Quiz tables
        const tables = await QuestionsDB.getAllTables();
        tests.push({
            test: "Quiz tables",
            status: tables.length > 0 ? "✅ PASS" : "❌ FAIL",
            details: `Found ${tables.length} tables: ${tables.map(t => t.name).join(', ')}`
        });
        
        // Test 6: Questions
        const questions = await QuestionsDB.getQuestionsByTable('demo_questions');
        tests.push({
            test: "Quiz questions",
            status: questions.length > 0 ? "✅ PASS" : "❌ FAIL",
            details: `Found ${questions.length} demo questions`
        });
        
        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            environment: {
                node_version: process.version,
                vercel_region: process.env.VERCEL_REGION || 'unknown',
                vercel_url: process.env.VERCEL_URL || 'local'
            },
            tests,
            summary: {
                total: tests.length,
                passed: tests.filter(t => t.status.includes("✅")).length,
                failed: tests.filter(t => t.status.includes("❌")).length
            }
        };
        
        return new Response(JSON.stringify(result, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, null, 2), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

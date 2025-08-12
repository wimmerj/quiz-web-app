/**
 * IMPORT SCRIPT - převod otázek z admin_import_ready do JSON databáze
 * Spuštění: node scripts/import-questions.js
 */

import fs from 'fs/promises';
import path from 'path';

const ADMIN_IMPORT_DIR = path.join(process.cwd(), 'admin_import_ready');
const DATA_DIR = path.join(process.cwd(), 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

async function importQuestions() {
    console.log('🔄 Starting questions import...');
    
    try {
        // Load current questions data
        let questionsData;
        try {
            const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
            questionsData = JSON.parse(data);
        } catch (error) {
            console.log('Creating new questions.json file...');
            questionsData = {
                quiz_tables: [],
                questions: [],
                next_table_id: 1,
                next_question_id: 1,
                metadata: {
                    total_questions: 0,
                    total_tables: 0,
                    last_updated: new Date().toISOString(),
                    version: "1.0.0"
                }
            };
        }
        
        // Read import index
        const indexPath = path.join(ADMIN_IMPORT_DIR, '_import_index.json');
        const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
        
        console.log(`📋 Found ${indexData.files.length} files to import`);
        
        // Import each file
        for (const fileInfo of indexData.files) {
            const filePath = path.join(ADMIN_IMPORT_DIR, fileInfo.file);
            
            try {
                const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Create table entry
                const table = {
                    id: questionsData.next_table_id,
                    name: fileInfo.table,
                    display_name: fileData.name || fileInfo.table,
                    description: fileData.description || `Importovaná tabulka (${fileInfo.questions} otázek)`,
                    question_count: fileInfo.questions,
                    category: detectCategory(fileInfo.table),
                    created_at: new Date().toISOString()
                };
                
                questionsData.quiz_tables.push(table);
                questionsData.next_table_id++;
                
                // Import questions
                let importedCount = 0;
                for (const question of fileData.questions) {
                    const newQuestion = {
                        id: questionsData.next_question_id,
                        table_name: fileInfo.table,
                        question: question.question,
                        answer_a: question.answer_a,
                        answer_b: question.answer_b,
                        answer_c: question.answer_c,
                        correct_answer: question.correct_answer,
                        explanation: question.explanation || 'Bez vysvětlení',
                        difficulty: detectDifficulty(question.question),
                        category: detectCategory(fileInfo.table)
                    };
                    
                    questionsData.questions.push(newQuestion);
                    questionsData.next_question_id++;
                    importedCount++;
                }
                
                console.log(`✅ Imported ${importedCount} questions from ${fileInfo.file}`);
                
            } catch (error) {
                console.error(`❌ Error importing ${fileInfo.file}:`, error.message);
            }
        }
        
        // Update metadata
        questionsData.metadata.total_questions = questionsData.questions.length;
        questionsData.metadata.total_tables = questionsData.quiz_tables.length;
        questionsData.metadata.last_updated = new Date().toISOString();
        
        // Save updated data
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questionsData, null, 2));
        
        console.log('🎉 Import completed!');
        console.log(`📊 Total tables: ${questionsData.metadata.total_tables}`);
        console.log(`📊 Total questions: ${questionsData.metadata.total_questions}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    }
}

function detectCategory(tableName) {
    if (tableName.includes('Official')) return 'official';
    if (tableName.includes('ČSN')) return 'csn';
    if (tableName.includes('SŽ')) return 'sz';
    if (tableName.includes('TNŽ')) return 'tnz';
    if (tableName.includes('UTZ')) return 'utz';
    return 'other';
}

function detectDifficulty(question) {
    // Simple heuristic based on question length and complexity
    const length = question.length;
    if (length < 100) return 1; // Easy
    if (length < 200) return 2; // Medium
    return 3; // Hard
}

// Run import if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    importQuestions();
}

export { importQuestions };

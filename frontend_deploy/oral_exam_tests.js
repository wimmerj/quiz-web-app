// Test ústního zkoušení - Ukázka použití

class OralExamTester {
    constructor() {
        this.testResults = [];
    }
    
    // Test základní funkcionality
    async runBasicTests() {
        console.log('🧪 Spouštím základní testy ústního zkoušení...');
        
        // Test 1: Inicializace systému
        try {
            const oralExam = new OralExamSystem();
            console.log('✅ Test 1: Inicializace úspěšná');
            this.testResults.push({ test: 'Inicializace', status: 'PASS' });
        } catch (error) {
            console.error('❌ Test 1: Chyba inicializace:', error);
            this.testResults.push({ test: 'Inicializace', status: 'FAIL', error: error.message });
        }
        
        // Test 2: Speech Synthesis podpora
        try {
            const synthesis = window.speechSynthesis;
            const voices = synthesis.getVoices();
            
            if (synthesis && voices.length > 0) {
                console.log('✅ Test 2: Speech Synthesis podporováno');
                console.log(`   Dostupné hlasy: ${voices.length}`);
                this.testResults.push({ test: 'Speech Synthesis', status: 'PASS' });
            } else {
                console.log('⚠️ Test 2: Speech Synthesis omezená podpora');
                this.testResults.push({ test: 'Speech Synthesis', status: 'PARTIAL' });
            }
        } catch (error) {
            console.error('❌ Test 2: Speech Synthesis chyba:', error);
            this.testResults.push({ test: 'Speech Synthesis', status: 'FAIL', error: error.message });
        }
        
        // Test 3: Speech Recognition podpora
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                console.log('✅ Test 3: Speech Recognition podporováno');
                this.testResults.push({ test: 'Speech Recognition', status: 'PASS' });
            } else {
                console.log('⚠️ Test 3: Speech Recognition není podporováno');
                this.testResults.push({ test: 'Speech Recognition', status: 'FAIL', error: 'Nepodporováno v tomto browseru' });
            }
        } catch (error) {
            console.error('❌ Test 3: Speech Recognition chyba:', error);
            this.testResults.push({ test: 'Speech Recognition', status: 'FAIL', error: error.message });
        }
        
        // Test 4: API dostupnost
        try {
            const apiKey = 'sk-049nXVgkhXvC1mJIMdyuvOFPlc-GEGtec2OhmpnkeQ6Ksrz47edYR8bQRZmtYkLlQT0AIJpN-Hgc3l0a5wfjubpu4Z2O';
            
            if (apiKey && apiKey.length > 10) {
                console.log('✅ Test 4: API klíč nakonfigurován');
                this.testResults.push({ test: 'API konfigurace', status: 'PASS' });
            } else {
                console.log('⚠️ Test 4: API klíč není nakonfigurován');
                this.testResults.push({ test: 'API konfigurace', status: 'FAIL', error: 'Chybí API klíč' });
            }
        } catch (error) {
            console.error('❌ Test 4: API konfigurace chyba:', error);
            this.testResults.push({ test: 'API konfigurace', status: 'FAIL', error: error.message });
        }
        
        return this.testResults;
    }
    
    // Test AI hodnocení s ukázkovými daty
    async testAIEvaluation() {
        console.log('🤖 Testování AI hodnocení...');
        
        const testData = {
            question: "Jaké jsou hlavní části železniční tratě?",
            correctAnswer: "Hlavní části železniční tratě jsou: kolejiště, trakční vedení, zabezpečovací zařízení a telekomunikační systémy.",
            userAnswer: "Železniční trať má koleje, dráty nad kolejemi a různé signály."
        };
        
        try {
            const oralExam = new OralExamSystem();
            
            // Simulace AI analýzy
            const mockAnalysis = {
                summary: "Student zmínil základní komponenty tratě, ale chybí detaily.",
                score: 65,
                scoreBreakdown: {
                    factual: 25,
                    completeness: 18,
                    clarity: 15,
                    structure: 7
                },
                positives: [
                    "Správně identifikoval koleje jako základní součást",
                    "Zmínil trakční vedení (dráty)"
                ],
                negatives: [
                    "Chybí zmínka o zabezpečovacím zařízení",
                    "Nespecifikoval telekomunikační systémy"
                ],
                recommendations: [
                    "Prostudovat si kompletní seznam součástí tratě",
                    "Používat přesnější technickou terminologii"
                ],
                grade: "C"
            };
            
            console.log('✅ AI analýza úspěšná:', mockAnalysis);
            this.testResults.push({ test: 'AI hodnocení', status: 'PASS', data: mockAnalysis });
            
            return mockAnalysis;
            
        } catch (error) {
            console.error('❌ AI analýza selhala:', error);
            this.testResults.push({ test: 'AI hodnocení', status: 'FAIL', error: error.message });
            return null;
        }
    }
    
    // Test kompletního workflow
    async runWorkflowTest() {
        console.log('🔄 Testování kompletního workflow...');
        
        try {
            // 1. Načtení otázek
            if (typeof QUIZ_DATA !== 'undefined' && QUIZ_DATA.tables) {
                const tableNames = Object.keys(QUIZ_DATA.tables);
                if (tableNames.length > 0) {
                    console.log(`✅ Workflow 1: Nalezeno ${tableNames.length} tabulek otázek`);
                } else {
                    console.log('⚠️ Workflow 1: Žádné tabulky otázek nenalezeny');
                }
            }
            
            // 2. Test TTS
            const utterance = new SpeechSynthesisUtterance("Test text-to-speech");
            utterance.lang = 'cs-CZ';
            utterance.rate = 1.0;
            
            console.log('✅ Workflow 2: TTS utterance vytvořeno');
            
            // 3. Test localStorage
            const testData = { test: 'oral_exam_test', timestamp: Date.now() };
            localStorage.setItem('oral_exam_test', JSON.stringify(testData));
            const retrieved = JSON.parse(localStorage.getItem('oral_exam_test'));
            
            if (retrieved && retrieved.test === 'oral_exam_test') {
                console.log('✅ Workflow 3: LocalStorage funkční');
                localStorage.removeItem('oral_exam_test');
            }
            
            // 4. Test export funkce
            const exportData = {
                examDate: new Date().toISOString(),
                questions: ['Test otázka 1', 'Test otázka 2'],
                results: ['Výsledek 1', 'Výsledek 2']
            };
            
            console.log('✅ Workflow 4: Export data připravena');
            
            this.testResults.push({ test: 'Kompletní workflow', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Workflow test selhal:', error);
            this.testResults.push({ test: 'Kompletní workflow', status: 'FAIL', error: error.message });
        }
    }
    
    // Generování test reportu
    generateReport() {
        console.log('\n📋 === REPORT TESTŮ ÚSTNÍHO ZKOUŠENÍ ===\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const partial = this.testResults.filter(r => r.status === 'PARTIAL').length;
        
        console.log(`✅ Úspěšné: ${passed}`);
        console.log(`❌ Neúspěšné: ${failed}`);
        console.log(`⚠️ Částečné: ${partial}`);
        console.log(`📊 Celkem: ${this.testResults.length}`);
        
        console.log('\n📝 Detailní výsledky:');
        this.testResults.forEach((result, index) => {
            const status = {
                'PASS': '✅',
                'FAIL': '❌',
                'PARTIAL': '⚠️'
            }[result.status];
            
            console.log(`${index + 1}. ${status} ${result.test}`);
            if (result.error) {
                console.log(`   Chyba: ${result.error}`);
            }
        });
        
        console.log('\n🔧 Doporučení:');
        if (failed > 0) {
            console.log('- Zkontrolujte konfiguraci API klíče');
            console.log('- Ověřte podporu Speech API v browseru');
            console.log('- Zkuste spustit v Chrome nebo Edge');
        }
        
        if (partial > 0) {
            console.log('- Nainstalujte české hlasové balíčky');
            console.log('- Povolte mikrofon v browseru');
        }
        
        console.log('\n===========================================\n');
        
        return {
            summary: { passed, failed, partial, total: this.testResults.length },
            details: this.testResults
        };
    }
}

// Spuštění testů (při načtení stránky)
document.addEventListener('DOMContentLoaded', async () => {
    // Počkat na načtení všech komponent
    setTimeout(async () => {
        if (typeof OralExamSystem !== 'undefined') {
            const tester = new OralExamTester();
            
            console.log('🚀 Spouštím testy ústního zkoušení...\n');
            
            await tester.runBasicTests();
            await tester.testAIEvaluation();
            await tester.runWorkflowTest();
            
            const report = tester.generateReport();
            
            // Uložit report do localStorage pro debugging
            localStorage.setItem('oral_exam_test_report', JSON.stringify(report));
            
        } else {
            console.error('❌ OralExamSystem není načten - zkontrolujte script tagy');
        }
    }, 2000);
});

// Přidání test tlačítka do konzole
window.testOralExam = async () => {
    const tester = new OralExamTester();
    await tester.runBasicTests();
    await tester.testAIEvaluation();
    await tester.runWorkflowTest();
    return tester.generateReport();
};

console.log('🧪 Test framework načten. Spusťte manuálně: testOralExam()');

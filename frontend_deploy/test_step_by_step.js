// Minimální test ústního zkoušení
console.clear();
console.log('🧪 SPOUŠTÍM TEST ÚSTNÍHO ZKOUŠENÍ');

// Step 1: Ověřit dostupnost základních součástí
console.log('\n1️⃣ Ověřuji základní komponenty...');

if (typeof QUIZ_DATA === 'undefined') {
    console.error('❌ QUIZ_DATA není dostupná');
} else {
    console.log('✅ QUIZ_DATA dostupná');
    const tableCount = Object.keys(QUIZ_DATA.tables || {}).length;
    console.log(`   📊 Počet tabulek: ${tableCount}`);
}

if (typeof OralExamSystem === 'undefined') {
    console.error('❌ OralExamSystem není dostupná');
} else {
    console.log('✅ OralExamSystem dostupná');
}

// Step 2: Vytvořit instanci a testovat její funkčnost
console.log('\n2️⃣ Vytvářím testovací instanci...');

try {
    window.testOralExam = new OralExamSystem();
    console.log('✅ Instance vytvořena');
    
    // Step 3: Zkontrolovat, že se vytvořilo modal
    setTimeout(() => {
        console.log('\n3️⃣ Kontroluji DOM elementy...');
        
        const modal = document.getElementById('oralExamModal');
        const select = document.getElementById('oralExamTable');
        const startBtn = document.getElementById('startOralExam');
        
        console.log('   Modal existuje:', !!modal);
        console.log('   Select existuje:', !!select);
        console.log('   Start button existuje:', !!startBtn);
        
        if (modal && select && startBtn) {
            console.log('\n4️⃣ Testuji zobrazení modálu...');
            
            // Zobrazit modal
            window.testOralExam.showModal();
            
            const isVisible = !modal.classList.contains('hidden');
            console.log('   Modal je viditelný:', isVisible);
            
            // Zkontrolovat naplnění selectu
            setTimeout(() => {
                console.log('\n5️⃣ Kontroluji naplnění selectu...');
                console.log('   Počet opcí:', select.options.length);
                
                if (select.options.length > 1) {
                    console.log('   První opce:', select.options[1].textContent);
                    
                    // Simulovat výběr tabulky
                    select.selectedIndex = 1;
                    console.log('   Vybrána tabulka:', select.value);
                    
                    console.log('\n6️⃣ Testuji spuštění zkoušení...');
                    
                    // Zachytit chyby při spuštění
                    window.originalConsoleError = console.error;
                    let capturedErrors = [];
                    console.error = function(...args) {
                        capturedErrors.push(args.join(' '));
                        window.originalConsoleError(...args);
                    };
                    
                    // Spustit zkoušení
                    window.testOralExam.startOralExam();
                    
                    // Kontrola výsledku po krátké pauze
                    setTimeout(() => {
                        console.log('\n7️⃣ Výsledky testu:');
                        
                        const settingsHidden = document.getElementById('oralExamSettings').classList.contains('hidden');
                        const sessionVisible = !document.getElementById('oralExamSession').classList.contains('hidden');
                        const resultsVisible = !document.getElementById('oralExamResults').classList.contains('hidden');
                        
                        console.log('   Nastavení skryto:', settingsHidden);
                        console.log('   Session zobrazena:', sessionVisible);
                        console.log('   Výsledky zobrazeny:', resultsVisible);
                        
                        if (capturedErrors.length > 0) {
                            console.log('   🚨 Zachycené chyby:');
                            capturedErrors.forEach(error => console.log('     ', error));
                        }
                        
                        // Obnovit původní console.error
                        console.error = window.originalConsoleError;
                        
                        // Závěrečný verdikt
                        if (settingsHidden && sessionVisible && !resultsVisible) {
                            console.log('\n🎉 TEST ÚSPĚŠNÝ - Ústní zkoušení funguje správně!');
                        } else if (resultsVisible) {
                            console.log('\n❌ PROBLÉM NALEZEN - Aplikace přeskočila přímo na výsledky!');
                            console.log('   Možné příčiny:');
                            console.log('   - Nepodařilo se načíst otázky');
                            console.log('   - Chyba v logice loadCurrentQuestion()');
                            console.log('   - Problém s validací dat');
                        } else {
                            console.log('\n❓ NEOČEKÁVANÝ STAV - UI není v očekávaném stavu');
                        }
                        
                    }, 1000);
                    
                } else {
                    console.error('❌ Select nebyl naplněn opcemi');
                }
            }, 300);
            
        } else {
            console.error('❌ Některé DOM elementy chybí');
        }
    }, 100);
    
} catch (error) {
    console.error('❌ Chyba při vytváření instance:', error);
}

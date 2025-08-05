// Quick debug script pro ústní zkoušení
// Spustit v konzoli prohlížeče pro debug

console.log('=== DEBUGGING ÚSTNÍHO ZKOUŠENÍ ===');

// 1. Zkontrolovat základní závislosti
console.log('1. Kontrola základních závislostí:');
console.log('   QUIZ_DATA dostupná:', typeof QUIZ_DATA !== 'undefined');
console.log('   OralExamSystem dostupná:', typeof OralExamSystem !== 'undefined');

if (typeof QUIZ_DATA !== 'undefined') {
    console.log('   Počet tabulek:', Object.keys(QUIZ_DATA.tables || {}).length);
    const firstTable = Object.keys(QUIZ_DATA.tables || {})[0];
    if (firstTable) {
        console.log('   První tabulka:', firstTable);
        console.log('   Počet otázek v první tabulce:', QUIZ_DATA.tables[firstTable].questions?.length || 0);
    }
}

// 2. Zkontrolovat DOM elementy
console.log('2. Kontrola DOM elementů:');
const modalExists = !!document.getElementById('oralExamModal');
const selectExists = !!document.getElementById('oralExamTable');
console.log('   Modal existuje:', modalExists);
console.log('   Select existuje:', selectExists);

// 3. Pokusit se vytvořit instanci
console.log('3. Test vytvoření instance:');
try {
    const testInstance = new OralExamSystem();
    console.log('   ✅ Instance vytvořena úspěšně');
    
    // 4. Test zobrazení modálního okna
    console.log('4. Test zobrazení modálního okna:');
    testInstance.showModal();
    console.log('   ✅ showModal() zavolána bez chyby');
    
    // 5. Zkontrolovat naplnění selectu
    setTimeout(() => {
        const select = document.getElementById('oralExamTable');
        console.log('   Počet opcí v selectu:', select ? select.options.length : 'select neexistuje');
        
        if (select && select.options.length > 1) {
            // 6. Test spuštění zkoušení
            console.log('6. Test spuštění zkoušení:');
            select.selectedIndex = 1; // Vybrat první dostupnou tabulku
            console.log('   Vybraná tabulka:', select.value);
            
            // Zkusit spustit zkoušení
            setTimeout(() => {
                console.log('   Spouštím startOralExam()...');
                testInstance.startOralExam();
            }, 100);
        }
    }, 200);
    
} catch (error) {
    console.error('   ❌ Chyba při vytváření instance:', error);
}

console.log('=== KONEC DEBUGINGU ===');

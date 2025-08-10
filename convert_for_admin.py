#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Konvertor exportovaných quiz dat pro admin panel
Vytvoří jednotlivé JSON soubory pro každou tabulku ve formátu admin panelu
"""

import json
import os

def convert_for_admin_import():
    """Převede exportovaná data do formátu pro admin panel"""
    
    export_dir = "exported_quiz_data"
    output_dir = "admin_import_ready"
    
    # Vytvoř výstupní adresář
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    print("🔄 Konvertuji data pro admin panel...\n")
    
    converted_files = []
    total_tables = 0
    
    # Zpracuj každý exportní soubor
    for file_name in ["Otazky_Quiz_export.json", "Otazky_Quiz_2_export.json"]:
        file_path = os.path.join(export_dir, file_name)
        
        if not os.path.exists(file_path):
            continue
            
        print(f"📋 Zpracovávám: {file_name}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Převeď každou tabulku do samostatného souboru
            for table_name, table_data in data['tables'].items():
                
                # Připrav data ve formátu admin panelu
                admin_format = {
                    'name': table_name,
                    'description': f"{table_data['description']} ({table_data['question_count']} otázek)",
                    'questions': []
                }
                
                # Převeď otázky do admin formátu (bez original_id a original_correct_answer)
                for question in table_data['questions']:
                    admin_question = {
                        'question': question['question'],
                        'answer_a': question['answer_a'],
                        'answer_b': question['answer_b'], 
                        'answer_c': question['answer_c'],
                        'correct_answer': question['correct_answer'],
                        'explanation': question['explanation']
                    }
                    admin_format['questions'].append(admin_question)
                
                # Ulož do samostatného souboru
                safe_name = table_name.replace('/', '_').replace('\\', '_').replace(':', '_')
                output_file = os.path.join(output_dir, f"{safe_name}.json")
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(admin_format, f, ensure_ascii=False, indent=2)
                
                converted_files.append({
                    'file': f"{safe_name}.json", 
                    'table': table_name,
                    'questions': len(admin_format['questions'])
                })
                
                total_tables += 1
                print(f"  ✅ {table_name}: {len(admin_format['questions'])} otázek -> {safe_name}.json")
        
        except Exception as e:
            print(f"  ❌ Chyba při zpracování {file_name}: {e}")
    
    # Vytvoř index soubor
    index_data = {
        'conversion_info': {
            'timestamp': '2025-08-10T23:30:00',
            'converted_tables': total_tables,
            'total_files': len(converted_files)
        },
        'import_instructions': {
            'step_1': 'Otevřete admin panel v prohlížeči',
            'step_2': 'Přejděte na záložku Tabulky',
            'step_3': 'Klikněte Import databáze',
            'step_4': 'Vyberte JSON soubor z adresáře admin_import_ready',
            'step_5': 'Nebo použijte drag & drop přímo do okna prohlížeče'
        },
        'files': converted_files
    }
    
    index_file = os.path.join(output_dir, '_import_index.json')
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n" + "="*50)
    print(f"✅ KONVERZE DOKONČENA")
    print("="*50)
    print(f"📊 Převedeno tabulek: {total_tables}")
    print(f"📁 Výstupní adresář: {output_dir}")
    print(f"📋 Index soubor: {index_file}")
    
    print(f"\n📝 Převedené soubory:")
    for file_info in converted_files:
        print(f"  • {file_info['file']} ({file_info['questions']} otázek)")
    
    print(f"\n💡 NÁVOD PRO IMPORT:")
    print(f"1. Otevřete admin panel")
    print(f"2. Záložka 'Tabulky' -> 'Import databáze'")
    print(f"3. Vyberte libovolný .json soubor z: {output_dir}")
    print(f"4. Doporučuji začít s menší tabulkou pro test")
    
    # Doporučené pořadí importu
    print(f"\n📋 DOPORUČENÉ POŘADÍ IMPORTU:")
    small_files = [f for f in converted_files if f['questions'] < 50]
    medium_files = [f for f in converted_files if 50 <= f['questions'] < 100]  
    large_files = [f for f in converted_files if f['questions'] >= 100]
    
    if small_files:
        print(f"  🔸 Začněte s menšími (testovací):")
        for f in small_files[:3]:
            print(f"    • {f['file']}")
    
    if medium_files:
        print(f"  🔸 Pokračujte středními:")
        for f in medium_files[:3]:
            print(f"    • {f['file']}")
    
    if large_files:
        print(f"  🔸 Nakonec velké tabulky:")
        for f in large_files[:3]:
            print(f"    • {f['file']}")

if __name__ == "__main__":
    convert_for_admin_import()

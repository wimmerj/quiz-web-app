#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script pro validaci exportovaných quiz dat
Ověří formát a konzistenci dat před importem
"""

import json
import os

def validate_quiz_data():
    """Validuje exportovaná quiz data"""
    
    export_dir = "exported_quiz_data"
    
    print("🔍 Validuji exportovaná quiz data...\n")
    
    # Načti summary
    try:
        with open(os.path.join(export_dir, "import_summary.json"), 'r', encoding='utf-8') as f:
            summary = json.load(f)
        print(f"📊 Summary: {summary['export_info']['exported_tables']} tabulek, {summary['export_info']['exported_questions']} otázek")
    except Exception as e:
        print(f"❌ Chyba při načítání summary: {e}")
        return
    
    # Validuj každý exportní soubor
    for file_name in summary['files_created']:
        file_path = os.path.join(export_dir, file_name)
        print(f"\n📋 Validuji: {file_name}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"  📁 Zdroj: {data['source_database']}")
            print(f"  📅 Export: {data['export_timestamp']}")
            print(f"  📊 Tabulek: {len(data['tables'])}")
            
            total_questions = 0
            for table_name, table_data in data['tables'].items():
                question_count = len(table_data['questions'])
                total_questions += question_count
                print(f"    📝 {table_name}: {question_count} otázek")
                
                # Validuj prvních 3 otázek
                for i, question in enumerate(table_data['questions'][:3]):
                    if not all(key in question for key in ['question', 'answer_a', 'answer_b', 'answer_c', 'correct_answer']):
                        print(f"    ❌ Otázka {i+1} má chybějící pole")
                        break
                    if question['correct_answer'] not in ['A', 'B', 'C']:
                        print(f"    ❌ Otázka {i+1} má neplatnou správnou odpověď: {question['correct_answer']}")
                else:
                    print(f"    ✅ Struktura otázek OK")
            
            print(f"  📝 Celkem otázek: {total_questions}")
            
        except Exception as e:
            print(f"  ❌ Chyba při validaci {file_name}: {e}")
    
    print(f"\n🎉 Validace dokončena!")
    print(f"\n💡 Pro import v admin panelu:")
    print(f"1. Otevřete admin panel")
    print(f"2. Jděte na záložku 'Tabulky'")
    print(f"3. Klikněte 'Import databáze'")  
    print(f"4. Vyberte soubor: {export_dir}/Otazky_Quiz_export.json")
    print(f"5. Nebo: {export_dir}/Otazky_Quiz_2_export.json")
    
    # Ukázka API formátu pro jednu tabulku
    print(f"\n📋 Ukázka API formátu pro import jedné tabulky:")
    try:
        with open(os.path.join(export_dir, "Otazky_Quiz_export.json"), 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Vem první tabulku
        first_table = list(data['tables'].values())[0]
        api_format = {
            'name': first_table['name'],
            'description': first_table['description'],
            'questions': first_table['questions'][:2]  # Jen 2 otázky jako ukázka
        }
        
        print(json.dumps(api_format, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"❌ Chyba při vytváření API ukázky: {e}")

if __name__ == "__main__":
    validate_quiz_data()

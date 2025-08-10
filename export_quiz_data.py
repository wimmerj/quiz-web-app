#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lokální export quiz dat do JSON formátu pro import do admin panelu
Převede SQLite databáze na strukturované JSON soubory
"""

import sqlite3
import json
import os
from datetime import datetime

# Konfigurace
LOCAL_DB_PATH = "backend_local/DB"
OUTPUT_DIR = "exported_quiz_data"

class LocalQuizExporter:
    def __init__(self):
        self.local_databases = [
            "Otazky_Quiz.db",
            "Otazky_Quiz_2.db"  
        ]
        self.stats = {
            'exported_tables': 0,
            'exported_questions': 0,
            'errors': []
        }
        
        # Vytvoř výstupní adresář
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
    
    def connect_to_local_db(self, db_name):
        """Připojí se k lokální SQLite databázi"""
        db_path = os.path.join(LOCAL_DB_PATH, db_name)
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Databáze {db_path} neexistuje")
        return sqlite3.connect(db_path)
    
    def extract_questions_from_table(self, cursor, table_name):
        """Extrahuje otázky z lokální tabulky"""
        try:
            cursor.execute(f"SELECT * FROM `{table_name}`")
            rows = cursor.fetchall()
            
            # Získej názvy sloupců
            cursor.execute(f"PRAGMA table_info(`{table_name}`)")
            columns = [col[1] for col in cursor.fetchall()]
            
            questions = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                
                # Standardizace názvu správné odpovědi
                correct_answer = row_dict.get('spravna_odpoved', '')
                options_a = row_dict.get('odpoved_a', '')
                options_b = row_dict.get('odpoved_b', '')
                options_c = row_dict.get('odpoved_c', '')
                
                if correct_answer and len(correct_answer) == 1 and correct_answer in ['A', 'B', 'C']:
                    correct_key = correct_answer
                elif 'A)' in correct_answer:
                    correct_key = 'A'
                elif 'B)' in correct_answer:
                    correct_key = 'B'  
                elif 'C)' in correct_answer:
                    correct_key = 'C'
                else:
                    # Pokus se najít správnou odpověď porovnáním s možnostmi
                    if correct_answer == options_a or correct_answer.replace('A) ', '') == options_a:
                        correct_key = 'A'
                    elif correct_answer == options_b or correct_answer.replace('B) ', '') == options_b:
                        correct_key = 'B'
                    elif correct_answer == options_c or correct_answer.replace('C) ', '') == options_c:
                        correct_key = 'C'
                    else:
                        correct_key = 'A'  # Fallback
                
                # Vyčisti možnosti od prefixů A), B), C)
                clean_a = options_a.replace('A) ', '') if options_a.startswith('A) ') else options_a
                clean_b = options_b.replace('B) ', '') if options_b.startswith('B) ') else options_b
                clean_c = options_c.replace('C) ', '') if options_c.startswith('C) ') else options_c
                
                question_data = {
                    'original_id': row_dict.get('id', ''),
                    'question': row_dict.get('otazka', ''),
                    'answer_a': clean_a,
                    'answer_b': clean_b,
                    'answer_c': clean_c,
                    'correct_answer': correct_key,
                    'explanation': row_dict.get('vysvetleni', ''),
                    'original_correct_answer': correct_answer  # Pro debug
                }
                questions.append(question_data)
            
            return questions
            
        except Exception as e:
            error_msg = f"Chyba při čtení tabulky {table_name}: {str(e)}"
            self.stats['errors'].append(error_msg)
            print(f"❌ {error_msg}")
            return []
    
    def export_database(self, db_name):
        """Exportuje všechny relevantní tabulky z jedné databáze"""
        print(f"\n=== Export databáze: {db_name} ===")
        
        try:
            conn = self.connect_to_local_db(db_name)
            cursor = conn.cursor()
            
            # Získej seznam tabulek
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            
            db_export = {
                'source_database': db_name,
                'export_timestamp': datetime.now().isoformat(),
                'tables': {}
            }
            
            for (table_name,) in tables:
                print(f"\n  📋 Exportuji tabulku: {table_name}")
                
                # Extrahuj otázky
                questions = self.extract_questions_from_table(cursor, table_name)
                
                if not questions:
                    print(f"    ❌ Žádné otázky v tabulce {table_name}")
                    continue
                
                print(f"    ✅ Exportováno {len(questions)} otázek")
                
                # Přidej do exportu
                db_export['tables'][table_name] = {
                    'name': table_name,
                    'description': f'Exportovaná tabulka z {db_name}',
                    'question_count': len(questions),
                    'questions': questions
                }
                
                self.stats['exported_tables'] += 1
                self.stats['exported_questions'] += len(questions)
            
            conn.close()
            
            # Ulož jako JSON
            if db_export['tables']:
                output_file = os.path.join(OUTPUT_DIR, f"{db_name.replace('.db', '')}_export.json")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(db_export, f, ensure_ascii=False, indent=2)
                print(f"  💾 Uloženo do: {output_file}")
            
        except Exception as e:
            error_msg = f"Chyba při exportu databáze {db_name}: {str(e)}"
            print(f"❌ {error_msg}")
            self.stats['errors'].append(error_msg)
    
    def create_import_summary(self):
        """Vytvoří souhrnný JSON pro import"""
        summary = {
            'export_info': {
                'timestamp': datetime.now().isoformat(),
                'exported_tables': self.stats['exported_tables'],
                'exported_questions': self.stats['exported_questions'],
                'errors': len(self.stats['errors'])
            },
            'import_instructions': {
                'method_1': 'Použijte admin panel - záložka Tabulky - Import databáze',
                'method_2': 'API endpoint: POST /api/admin/tables',
                'format': 'JSON files obsahují pole questions s otázkami ve formátu {question, answer_a, answer_b, answer_c, correct_answer, explanation}'
            },
            'files_created': []
        }
        
        # Seznam vytvořených souborů
        for file in os.listdir(OUTPUT_DIR):
            if file.endswith('.json') and file != 'import_summary.json':
                summary['files_created'].append(file)
        
        summary_file = os.path.join(OUTPUT_DIR, 'import_summary.json')
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        return summary_file
    
    def run_export(self):
        """Spustí kompletní export všech databází"""
        print("📦 Spouštím lokální export quiz dat...")
        print(f"📁 Výstupní adresář: {OUTPUT_DIR}")
        
        start_time = datetime.now()
        
        # Exportuj každou databázi
        for db_name in self.local_databases:
            if os.path.exists(os.path.join(LOCAL_DB_PATH, db_name)):
                self.export_database(db_name)
            else:
                print(f"⚠️  Databáze {db_name} nenalezena, přeskakuji...")
        
        # Vytvoř souhrn pro import
        summary_file = self.create_import_summary()
        
        # Výsledné statistiky
        end_time = datetime.now()
        duration = end_time - start_time
        
        print(f"\n" + "="*60)
        print("📈 SOUHRN EXPORTU")
        print("="*60)
        print(f"⏱️  Doba trvání: {duration}")
        print(f"📊 Exportovaných tabulek: {self.stats['exported_tables']}")
        print(f"📝 Exportovaných otázek: {self.stats['exported_questions']}")  
        print(f"💾 Výstupní adresář: {OUTPUT_DIR}")
        print(f"📋 Souhrn pro import: {summary_file}")
        print(f"❌ Chyb: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            print(f"\n🔍 DETAILY CHYB:")
            for i, error in enumerate(self.stats['errors'], 1):
                print(f"  {i}. {error}")
        
        print(f"\n💡 NÁVOD PRO IMPORT:")
        print(f"1. Otevřte admin panel v prohlížeči")
        print(f"2. Přejděte na záložku 'Tabulky'") 
        print(f"3. Použijte tlačítko 'Import databáze'")
        print(f"4. Vyberte JSON soubory z adresáře: {OUTPUT_DIR}")
        print(f"5. Nebo použijte API endpoint: POST /api/admin/tables")
        
        print(f"\n🎉 Export dokončen!")

def main():
    """Hlavní funkce"""
    exporter = LocalQuizExporter()
    exporter.run_export()

if __name__ == "__main__":
    main()

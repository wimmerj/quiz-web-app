#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pro migraci otázek z lokálních SQLite databází do produkčního systému
Zachovává existující uživatele a system data, přidává pouze quiz otázky
"""

import sqlite3
import requests
import json
import sys
import os
from datetime import datetime

# Konfigurace API
API_BASE_URL = "https://quiz-web-app.onrender.com/api"
LOCAL_DB_PATH = "backend_local/DB"

class QuizDataMigrator:
    def __init__(self):
        self.local_databases = [
            "Otazky_Quiz.db",
            "Otazky_Quiz_2.db"
        ]
        self.stats = {
            'processed_tables': 0,
            'processed_questions': 0,
            'created_tables': 0,
            'errors': []
        }
    
    def connect_to_local_db(self, db_name):
        """Připojí se k lokální SQLite databázi"""
        db_path = os.path.join(LOCAL_DB_PATH, db_name)
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Databáze {db_path} neexistuje")
        return sqlite3.connect(db_path)
    
    def get_table_info(self, cursor, table_name):
        """Získá informace o struktuře tabulky"""
        cursor.execute(f"PRAGMA table_info({table_name})")
        return cursor.fetchall()
    
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
                    if correct_answer == row_dict.get('odpoved_a', ''):
                        correct_key = 'A'
                    elif correct_answer == row_dict.get('odpoved_b', ''):
                        correct_key = 'B'
                    elif correct_answer == row_dict.get('odpoved_c', ''):
                        correct_key = 'C'
                    else:
                        correct_key = 'A'  # Fallback
                
                question_data = {
                    'question': row_dict.get('otazka', ''),
                    'answer_a': row_dict.get('odpoved_a', ''),
                    'answer_b': row_dict.get('odpoved_b', ''),
                    'answer_c': row_dict.get('odpoved_c', ''),
                    'correct_answer': correct_key,
                    'explanation': row_dict.get('vysvetleni', '')
                }
                questions.append(question_data)
            
            return questions
            
        except Exception as e:
            self.stats['errors'].append(f"Chyba při čtení tabulky {table_name}: {str(e)}")
            return []
    
    def create_table_via_api(self, table_name, questions):
        """Vytvoří tabulku přes API s otázkami"""
        try:
            # Připrav data pro API
            table_data = {
                'name': table_name,
                'description': f'Migrovaná tabulka z lokální databáze - {table_name}',
                'questions': questions
            }
            
            # Zavolej API pro vytvoření tabulky
            response = requests.post(
                f"{API_BASE_URL}/admin/tables",
                json=table_data,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response.status_code == 201:
                self.stats['created_tables'] += 1
                return True, "Tabulka úspěšně vytvořena"
            else:
                error_msg = f"API chyba {response.status_code}: {response.text}"
                self.stats['errors'].append(error_msg)
                return False, error_msg
                
        except Exception as e:
            error_msg = f"Chyba při vytváření tabulky {table_name}: {str(e)}"
            self.stats['errors'].append(error_msg)
            return False, error_msg
    
    def check_table_exists(self, table_name):
        """Zkontroluje, zda tabulka už existuje v produkčním systému"""
        try:
            response = requests.get(
                f"{API_BASE_URL}/admin/tables",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                tables = data.get('tables', []) if isinstance(data, dict) else data
                
                for table in tables:
                    if table.get('name') == table_name:
                        return True
            
            return False
            
        except Exception as e:
            print(f"Varování: Nelze zkontrolovat existenci tabulky {table_name}: {e}")
            return False
    
    def migrate_database(self, db_name):
        """Migruje všechny relevantní tabulky z jedné databáze"""
        print(f"\n=== Migrace databáze: {db_name} ===")
        
        try:
            conn = self.connect_to_local_db(db_name)
            cursor = conn.cursor()
            
            # Získej seznam tabulek
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            
            for (table_name,) in tables:
                print(f"\nZpracovávám tabulku: {table_name}")
                
                # Zkontroluj, zda tabulka už existuje
                if self.check_table_exists(table_name):
                    print(f"  ⏭️  Tabulka {table_name} už existuje, přeskakuji...")
                    continue
                
                # Extrahuj otázky
                questions = self.extract_questions_from_table(cursor, table_name)
                
                if not questions:
                    print(f"  ❌ Žádné otázky v tabulce {table_name}")
                    continue
                
                print(f"  📝 Nalezeno {len(questions)} otázek")
                
                # Vytvoř tabulku přes API
                success, message = self.create_table_via_api(table_name, questions)
                
                if success:
                    print(f"  ✅ {message}")
                    self.stats['processed_questions'] += len(questions)
                else:
                    print(f"  ❌ {message}")
                
                self.stats['processed_tables'] += 1
            
            conn.close()
            
        except Exception as e:
            error_msg = f"Chyba při migraci databáze {db_name}: {str(e)}"
            print(f"❌ {error_msg}")
            self.stats['errors'].append(error_msg)
    
    def run_migration(self):
        """Spustí kompletní migraci všech databází"""
        print("🚀 Spouštím migraci quiz dat...")
        print(f"📊 API endpoint: {API_BASE_URL}")
        
        start_time = datetime.now()
        
        # Zkontroluj připojení k API s prodlouženým timeoutem
        print("⏳ Probouzím API server (může trvat až 60 sekund)...")
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=60)
            print(f"✅ API je dostupné (status: {response.status_code})")
        except Exception as e:
            print(f"❌ API není dostupné: {e}")
            print("💡 Zkuste spustit script znovu za chvíli (server možná potřebuje více času)")
            return
        
        # Migruj každou databázi
        for db_name in self.local_databases:
            if os.path.exists(os.path.join(LOCAL_DB_PATH, db_name)):
                self.migrate_database(db_name)
            else:
                print(f"⚠️  Databáze {db_name} nenalezena, přeskakuji...")
        
        # Výsledné statistiky
        end_time = datetime.now()
        duration = end_time - start_time
        
        print(f"\n" + "="*60)
        print("📈 SOUHRN MIGRACE")
        print("="*60)
        print(f"⏱️  Doba trvání: {duration}")
        print(f"📊 Zpracovaných tabulek: {self.stats['processed_tables']}")
        print(f"✅ Vytvořených tabulek: {self.stats['created_tables']}")
        print(f"📝 Migrovaných otázek: {self.stats['processed_questions']}")
        print(f"❌ Chyb: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            print(f"\n🔍 DETAILY CHYB:")
            for i, error in enumerate(self.stats['errors'], 1):
                print(f"  {i}. {error}")
        
        print(f"\n🎉 Migrace dokončena!")

def main():
    """Hlavní funkce"""
    if len(sys.argv) > 1 and sys.argv[1] == '--dry-run':
        print("🧪 DRY RUN režim - pouze zobrazím data bez migrace")
        # Implementace dry-run módu
        return
    
    migrator = QuizDataMigrator()
    migrator.run_migration()

if __name__ == "__main__":
    main()

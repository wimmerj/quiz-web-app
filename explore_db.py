#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database exploration script
"""
import sqlite3
import json
import os

def explore_database(db_path):
    """Explore SQLite database structure and content"""
    print(f"\n=== Exploring: {db_path} ===")
    
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables found: {tables}")
        
        for table in tables:
            print(f"\n--- Table: {table} ---")
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            print("Columns:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]}) {'PRIMARY KEY' if col[5] else ''}")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Row count: {count}")
            
            # Get sample data (first 3 rows)
            if count > 0:
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                sample_data = cursor.fetchall()
                print("Sample data:")
                for i, row in enumerate(sample_data, 1):
                    print(f"  Row {i}: {row}")
        
        conn.close()
        return tables
        
    except Exception as e:
        print(f"Error exploring database: {e}")
        return []

def main():
    db_dir = r"C:\Users\honza\Documents\13_Programming\Python\03_PyToHTML\02_Quiz\quiz-web-app\backend_local\DB"
    
    db_files = [
        os.path.join(db_dir, "Otazky_Quiz.db"),
        os.path.join(db_dir, "Otazky_Quiz_2.db")
    ]
    
    all_tables = {}
    
    for db_file in db_files:
        tables = explore_database(db_file)
        all_tables[db_file] = tables
    
    print(f"\n=== Summary ===")
    for db_file, tables in all_tables.items():
        print(f"{os.path.basename(db_file)}: {tables}")

if __name__ == "__main__":
    main()

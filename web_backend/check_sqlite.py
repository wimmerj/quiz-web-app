#!/usr/bin/env python3
"""
Check SQLite database structure
"""

import sqlite3
import os

def check_sqlite():
    """Check SQLite database structure and data"""
    sqlite_path = '../backend_local/enhanced_quiz.db'
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite database not found: {sqlite_path}")
        return
    
    print(f"📂 Checking SQLite: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    # List all tables
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = sqlite_cursor.fetchall()
    
    print(f"📊 Found {len(tables)} tables:")
    for table in tables:
        table_name = table['name']
        print(f"   - {table_name}")
        
        # Count records in each table
        try:
            sqlite_cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
            count = sqlite_cursor.fetchone()[0]
            print(f"     └─ {count} records")
            
            # Show sample data from users table
            if table_name == 'users':
                sqlite_cursor.execute(f"SELECT username, role, is_active, monica_api_access FROM `{table_name}` LIMIT 3")
                users = sqlite_cursor.fetchall()
                for user in users:
                    user_dict = dict(user)
                    print(f"     └─ User: {user_dict['username']} | role: {user_dict['role']} | active: {user_dict.get('is_active')} | monica: {user_dict.get('monica_api_access')}")
        except Exception as e:
            print(f"     └─ Error: {e}")
    
    sqlite_conn.close()

if __name__ == '__main__':
    check_sqlite()

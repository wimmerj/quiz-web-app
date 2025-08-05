#!/usr/bin/env python3
"""
Detailed database check
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def detailed_check():
    """Detailed PostgreSQL database check"""
    postgres_url = os.environ.get('DATABASE_URL')
    if not postgres_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    if postgres_url.startswith('postgres://'):
        postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        postgres_conn = psycopg2.connect(postgres_url)
        postgres_cursor = postgres_conn.cursor(cursor_factory=RealDictCursor)
        
        # Check each table
        tables = ['users', 'questions', 'user_answers', 'system_logs']
        
        for table in tables:
            try:
                postgres_cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                result = postgres_cursor.fetchone()
                count = result['count']
                print(f"📊 {table}: {count} records")
                
                if table == 'users' and count > 0:
                    postgres_cursor.execute("SELECT username, email, role FROM users LIMIT 3")
                    users = postgres_cursor.fetchall()
                    for user in users:
                        print(f"   👤 {user['username']} ({user['email']}) - {user['role']}")
                        
                elif table == 'questions' and count > 0:
                    postgres_cursor.execute("SELECT table_name, question_text FROM questions LIMIT 2")
                    questions = postgres_cursor.fetchall()
                    for q in questions:
                        print(f"   ❓ {q['table_name']}: {q['question_text'][:50]}...")
                        
            except Exception as e:
                print(f"❌ Error checking {table}: {e}")
        
        postgres_conn.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == '__main__':
    detailed_check()

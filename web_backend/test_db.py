#!/usr/bin/env python3
"""
Test database connection and check current state
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def test_database():
    """Test PostgreSQL connection and show current state"""
    postgres_url = os.environ.get('DATABASE_URL')
    if not postgres_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    if postgres_url.startswith('postgres://'):
        postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        print("🔌 Testing PostgreSQL connection...")
        postgres_conn = psycopg2.connect(postgres_url)
        postgres_cursor = postgres_conn.cursor(cursor_factory=RealDictCursor)
        
        # List all tables
        postgres_cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = postgres_cursor.fetchall()
        
        print(f"📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        # Check users table
        try:
            postgres_cursor.execute("SELECT COUNT(*) FROM users")
            user_count = postgres_cursor.fetchone()[0]
            print(f"👥 Users table: {user_count} records")
            
            # Show sample users
            postgres_cursor.execute("SELECT username, role FROM users LIMIT 5")
            users = postgres_cursor.fetchall()
            for user in users:
                print(f"   - {user['username']} ({user['role']})")
                
        except Exception as e:
            print(f"❌ Error checking users table: {e}")
        
        # Check questions table
        try:
            postgres_cursor.execute("SELECT COUNT(*) FROM questions")
            question_count = postgres_cursor.fetchone()[0]
            print(f"❓ Questions table: {question_count} records")
        except Exception as e:
            print(f"❌ Error checking questions table: {e}")
        
        postgres_conn.close()
        print("✅ Database connection test successful!")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == '__main__':
    test_database()

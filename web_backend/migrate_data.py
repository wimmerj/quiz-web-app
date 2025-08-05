#!/usr/bin/env python3
"""
Data migration script from SQLite to PostgreSQL
Usage: python migrate_data.py
"""

import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import sys
from datetime import datetime
import hashlib
import secrets

def migrate_sqlite_to_postgres():
    """Migrate data from SQLite to PostgreSQL"""
    
    # SQLite connection
    sqlite_path = '../backend_local/enhanced_quiz.db'
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite database not found: {sqlite_path}")
        return False
    
    print(f"📂 Connecting to SQLite: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    
    # PostgreSQL connection
    postgres_url = os.environ.get('DATABASE_URL')
    if not postgres_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
    
    if postgres_url.startswith('postgres://'):
        postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)
    
    print(f"🐘 Connecting to PostgreSQL...")
    try:
        postgres_conn = psycopg2.connect(postgres_url)
        postgres_cursor = postgres_conn.cursor(cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return False
    
    print("🔄 Starting data migration...")
    
    try:
        # Migrate users
        print("👥 Migrating users...")
        sqlite_cursor = sqlite_conn.cursor()
        
        # Get users from SQLite
        try:
            sqlite_cursor.execute("SELECT * FROM users")
            users = sqlite_cursor.fetchall()
            print(f"   Found {len(users)} users in SQLite")
        except sqlite3.OperationalError as e:
            print(f"   ⚠️ Error reading users table: {e}")
            users = []
        
        users_migrated = 0
        for user in users:
            try:
                # Convert Row to dict for easier access
                user_dict = dict(user)
                
                # Ensure we have a salt field
                salt = user_dict.get('salt', secrets.token_hex(16))
                
                postgres_cursor.execute("""
                    INSERT INTO users (username, email, password_hash, salt, role, created_at, is_active, monica_api_access, last_login)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (username) DO UPDATE SET
                        email = EXCLUDED.email,
                        role = EXCLUDED.role,
                        is_active = EXCLUDED.is_active,
                        monica_api_access = EXCLUDED.monica_api_access
                """, (
                    user_dict['username'],
                    user_dict.get('email', f"{user_dict['username']}@quiz.com") or f"{user_dict['username']}@quiz.com",
                    user_dict['password_hash'],
                    salt,
                    user_dict.get('user_role', 'student'),
                    user_dict.get('created_at', datetime.now().isoformat()),
                    bool(user_dict.get('is_active', True)),  # Convert to boolean
                    bool(user_dict.get('monica_api_access', False)),  # Convert to boolean
                    user_dict.get('last_login')
                ))
                users_migrated += 1
            except Exception as e:
                print(f"   ⚠️ Error migrating user {user_dict.get('username', 'unknown') if 'user_dict' in locals() else 'unknown'}: {e}")
        
        print(f"   ✅ Migrated {users_migrated} users")
        
        # Migrate questions from original database
        print("❓ Migrating questions...")
        original_db_path = '../backend_local/DB/Otazky_Quiz.db'
        
        questions_migrated = 0
        if os.path.exists(original_db_path):
            original_conn = sqlite3.connect(original_db_path)
            original_conn.row_factory = sqlite3.Row
            original_cursor = original_conn.cursor()
            
            # Get table names
            original_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = original_cursor.fetchall()
            
            for table in tables:
                table_name = table['name']
                if table_name == 'sqlite_sequence':
                    continue
                
                print(f"   Processing table: {table_name}")
                
                try:
                    original_cursor.execute(f"SELECT * FROM `{table_name}`")
                    questions = original_cursor.fetchall()
                    
                    for question in questions:
                        # Convert Row to dict for easier access
                        question_dict = dict(question)
                        
                        postgres_cursor.execute("""
                            INSERT INTO questions (table_name, question_text, option_a, option_b, option_c, correct_answer, explanation)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                        """, (
                            table_name,
                            question_dict.get('otazka', question_dict.get('question', '')),
                            question_dict.get('a', question_dict.get('option_a', '')),
                            question_dict.get('b', question_dict.get('option_b', '')),
                            question_dict.get('c', question_dict.get('option_c', '')),
                            question_dict.get('spravna_odpoved', question_dict.get('correct_answer', 'A')),
                            question_dict.get('vysvetleni', question_dict.get('explanation', ''))
                        ))
                        questions_migrated += 1
                        
                except Exception as e:
                    print(f"   ⚠️ Error processing table {table_name}: {e}")
            
            original_conn.close()
        else:
            print(f"   ⚠️ Original database not found: {original_db_path}")
        
        print(f"   ✅ Migrated {questions_migrated} questions")
        
        # Migrate user answers
        print("✅ Migrating user answers...")
        answers_migrated = 0
        
        try:
            sqlite_cursor.execute("SELECT * FROM user_answers")
            answers = sqlite_cursor.fetchall()
            print(f"   Found {len(answers)} answers in SQLite")
            
            for answer in answers:
                try:
                    # Convert Row to dict for easier access
                    answer_dict = dict(answer)
                    
                    postgres_cursor.execute("""
                        INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, answered_at, quiz_session_id)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        answer_dict['user_id'],
                        answer_dict['question_id'],
                        answer_dict['user_answer'],
                        answer_dict['is_correct'],
                        answer_dict.get('answered_at', datetime.now().isoformat()),
                        answer_dict.get('quiz_session_id')
                    ))
                    answers_migrated += 1
                except Exception as e:
                    print(f"   ⚠️ Error migrating answer: {e}")
                    
        except sqlite3.OperationalError as e:
            print(f"   ⚠️ No user_answers table found: {e}")
        
        print(f"   ✅ Migrated {answers_migrated} answers")
        
        # Migrate system logs
        print("📝 Migrating system logs...")
        logs_migrated = 0
        
        try:
            sqlite_cursor.execute("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 1000")
            logs = sqlite_cursor.fetchall()
            print(f"   Found {len(logs)} recent logs in SQLite")
            
            for log in logs:
                try:
                    # Convert Row to dict for easier access
                    log_dict = dict(log)
                    
                    postgres_cursor.execute("""
                        INSERT INTO system_logs (user_id, action, details, ip_address, user_agent, severity, timestamp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        log_dict.get('user_id'),
                        log_dict['action'],
                        log_dict.get('details', ''),
                        log_dict.get('ip_address', ''),
                        log_dict.get('user_agent', ''),
                        log_dict.get('severity', 'info'),
                        log_dict.get('timestamp', datetime.now().isoformat())
                    ))
                    logs_migrated += 1
                except Exception as e:
                    print(f"   ⚠️ Error migrating log: {e}")
                    
        except sqlite3.OperationalError as e:
            print(f"   ⚠️ No system_logs table found: {e}")
        
        print(f"   ✅ Migrated {logs_migrated} logs")
        
        # Commit all changes
        postgres_conn.commit()
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        postgres_cursor.execute("SELECT COUNT(*) FROM users")
        user_count = postgres_cursor.fetchone()[0]
        
        postgres_cursor.execute("SELECT COUNT(*) FROM questions")
        question_count = postgres_cursor.fetchone()[0]
        
        postgres_cursor.execute("SELECT COUNT(*) FROM user_answers")
        answer_count = postgres_cursor.fetchone()[0]
        
        print(f"   PostgreSQL now contains:")
        print(f"   👥 Users: {user_count}")
        print(f"   ❓ Questions: {question_count}")
        print(f"   ✅ Answers: {answer_count}")
        
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        postgres_conn.rollback()
        return False
        
    finally:
        sqlite_conn.close()
        postgres_conn.close()

def create_admin_user():
    """Create admin user in PostgreSQL"""
    postgres_url = os.environ.get('DATABASE_URL')
    if not postgres_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    if postgres_url.startswith('postgres://'):
        postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        postgres_conn = psycopg2.connect(postgres_url)
        postgres_cursor = postgres_conn.cursor()
        
        # Check if admin exists
        postgres_cursor.execute("SELECT id FROM users WHERE username = 'admin'")
        if postgres_cursor.fetchone():
            print("👨‍💼 Admin user already exists")
            return
        
        # Create admin user
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', 'admin123'.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        
        postgres_cursor.execute("""
            INSERT INTO users (username, email, password_hash, salt, role, created_at, is_active, monica_api_access)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            'admin',
            'admin@quiz.com',
            password_hash,
            salt,
            'admin',
            datetime.now().isoformat(),
            True,
            True
        ))
        
        postgres_conn.commit()
        print("👨‍💼 Admin user created successfully")
        print("   Username: admin")
        print("   Password: admin123")
        
    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")
    finally:
        postgres_conn.close()

if __name__ == '__main__':
    print("🚀 Quiz App Data Migration Tool")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--admin-only':
        create_admin_user()
    else:
        success = migrate_sqlite_to_postgres()
        if success:
            create_admin_user()
        else:
            print("❌ Migration failed, admin user not created")
    
    print("\n" + "=" * 50)
    print("🏁 Migration completed")

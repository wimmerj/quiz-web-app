#!/usr/bin/env python3
"""
Enhanced Quiz Database Setup
Vytvoří novou centralizovanou databázi pro ukládání uživatelských dat
"""

import sqlite3
import os
import hashlib
import secrets
from datetime import datetime

def create_enhanced_database(db_path="enhanced_quiz.db"):
    """Vytvoří novou databázi s rozšířenou strukturou"""
    
    # Pokud databáze existuje, vytvořit backup
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(db_path, backup_path)
        print(f"Existing database backed up to: {backup_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Uživatelé
    cursor.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        monica_api_access BOOLEAN DEFAULT FALSE,
        monica_api_key VARCHAR(255),
        total_questions_answered INTEGER DEFAULT 0,
        total_correct_answers INTEGER DEFAULT 0,
        registration_ip VARCHAR(45),
        user_role VARCHAR(20) DEFAULT 'student'
    )
    ''')
    
    # Uživatelské výsledky
    cursor.execute('''
    CREATE TABLE user_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        table_name VARCHAR(100) NOT NULL,
        question_id INTEGER NOT NULL,
        question_text TEXT,
        selected_answer VARCHAR(10),
        correct_answer VARCHAR(10),
        is_correct BOOLEAN NOT NULL,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_id VARCHAR(50),
        time_taken_seconds INTEGER,
        answer_text TEXT
    )
    ''')
    
    # Uživatelské relace
    cursor.execute('''
    CREATE TABLE user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        session_id VARCHAR(50) UNIQUE NOT NULL,
        table_name VARCHAR(100),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        total_questions INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        score_percentage DECIMAL(5,2),
        session_type VARCHAR(20) DEFAULT 'normal'
    )
    ''')
    
    # Bitvy (multiplayer)
    cursor.execute('''
    CREATE TABLE battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id VARCHAR(50) UNIQUE NOT NULL,
        creator_user_id INTEGER REFERENCES users(id),
        table_name VARCHAR(100) NOT NULL,
        question_count INTEGER NOT NULL,
        time_limit_minutes INTEGER NOT NULL,
        max_players INTEGER DEFAULT 8,
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP
    )
    ''')
    
    # Účastníci bitev
    cursor.execute('''
    CREATE TABLE battle_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id VARCHAR(50) REFERENCES battles(battle_id),
        user_id INTEGER REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        final_score INTEGER DEFAULT 0,
        final_position INTEGER,
        is_active BOOLEAN DEFAULT TRUE
    )
    ''')
    
    # Systémové logy
    cursor.execute('''
    CREATE TABLE system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        severity VARCHAR(20) DEFAULT 'info'
    )
    ''')
    
    # Nastavení uživatelů
    cursor.execute('''
    CREATE TABLE user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        max_question_font_size INTEGER DEFAULT 28,
        max_answer_font_size INTEGER DEFAULT 26,
        show_only_unanswered BOOLEAN DEFAULT FALSE,
        use_test_db BOOLEAN DEFAULT FALSE,
        theme VARCHAR(20) DEFAULT 'default',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        sound_enabled BOOLEAN DEFAULT TRUE,
        auto_next_question BOOLEAN DEFAULT FALSE
    )
    ''')
    
    # Monica API volání
    cursor.execute('''
    CREATE TABLE monica_api_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        request_type VARCHAR(50) NOT NULL,
        tokens_used INTEGER,
        cost_estimate DECIMAL(10,6),
        response_time_ms INTEGER,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Indexy pro výkon
    cursor.execute('CREATE INDEX idx_user_results_user_id ON user_results(user_id)')
    cursor.execute('CREATE INDEX idx_user_results_table ON user_results(table_name)')
    cursor.execute('CREATE INDEX idx_user_results_session ON user_results(session_id)')
    cursor.execute('CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id)')
    cursor.execute('CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp)')
    cursor.execute('CREATE INDEX idx_system_logs_user_id ON system_logs(user_id)')
    cursor.execute('CREATE INDEX idx_battle_participants_battle ON battle_participants(battle_id)')
    cursor.execute('CREATE INDEX idx_monica_calls_user_id ON monica_api_calls(user_id)')
    
    # Vytvoření admin uživatele
    admin_salt = secrets.token_hex(16)
    admin_password = "admin123"  # Změnit v produkci!
    admin_hash = hashlib.pbkdf2_hmac('sha256', admin_password.encode('utf-8'), admin_salt.encode('utf-8'), 100000)
    
    cursor.execute('''
    INSERT INTO users (username, password_hash, salt, monica_api_access, user_role, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', ('admin', admin_hash.hex(), admin_salt, True, 'admin', True))
    
    admin_user_id = cursor.lastrowid
    
    # Nastavení pro admin uživatele
    cursor.execute('''
    INSERT INTO user_settings (user_id) VALUES (?)
    ''', (admin_user_id,))
    
    # Systémový log o vytvoření
    cursor.execute('''
    INSERT INTO system_logs (user_id, action, details, severity)
    VALUES (?, ?, ?, ?)
    ''', (admin_user_id, 'DATABASE_CREATED', 'Enhanced database structure created', 'info'))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Enhanced database created: {db_path}")
    print(f"🔑 Admin user created: username='admin', password='admin123'")
    print(f"⚠️  Please change admin password in production!")
    
    return db_path

def migrate_existing_data(old_db_path="DB/Otazky_Quiz.db", new_db_path="enhanced_quiz.db"):
    """Migrace existujících otázek z původní databáze"""
    
    if not os.path.exists(old_db_path):
        print(f"❌ Original database not found: {old_db_path}")
        return
    
    if not os.path.exists(new_db_path):
        print(f"❌ Enhanced database not found: {new_db_path}")
        return
    
    # Připojení k oběma databázím
    old_conn = sqlite3.connect(old_db_path)
    new_conn = sqlite3.connect(new_db_path)
    
    old_cursor = old_conn.cursor()
    new_cursor = new_conn.cursor()
    
    # Získání seznamu tabulek z původní databáze
    old_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
    tables = [table[0] for table in old_cursor.fetchall()]
    
    print(f"📊 Found {len(tables)} question tables to migrate")
    
    # Vytvoření tabulky pro otázky v nové databázi
    new_cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name VARCHAR(100) NOT NULL,
        original_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        answer_a TEXT NOT NULL,
        answer_b TEXT NOT NULL,
        answer_c TEXT NOT NULL,
        correct_answer VARCHAR(10) NOT NULL,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
    )
    ''')
    
    # Index pro otázky
    new_cursor.execute('CREATE INDEX IF NOT EXISTS idx_questions_table ON questions(table_name)')
    
    total_questions = 0
    
    # Migrace dat z každé tabulky
    for table_name in tables:
        try:
            old_cursor.execute(f"SELECT * FROM `{table_name}`")
            questions = old_cursor.fetchall()
            
            for question in questions:
                # Struktura: id, otazka, odpoved_a, odpoved_b, odpoved_c, spravna_odpoved, vysvetleni
                new_cursor.execute('''
                INSERT INTO questions (table_name, original_id, question_text, answer_a, answer_b, answer_c, correct_answer, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    table_name,
                    question[0],  # original id
                    question[1],  # otazka
                    question[2],  # odpoved_a
                    question[3],  # odpoved_b
                    question[4],  # odpoved_c
                    question[5],  # spravna_odpoved
                    question[6] if len(question) > 6 else ''  # vysvetleni
                ))
            
            print(f"✅ Migrated {len(questions)} questions from table: {table_name}")
            total_questions += len(questions)
            
        except Exception as e:
            print(f"❌ Error migrating table {table_name}: {e}")
    
    new_conn.commit()
    old_conn.close()
    new_conn.close()
    
    print(f"🎉 Migration completed! Total questions migrated: {total_questions}")

def create_sample_data(db_path="enhanced_quiz.db"):
    """Vytvoří ukázková data pro testování"""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Vytvoření testovacích uživatelů
    test_users = [
        ('student1', 'password123', 'student1@example.com', 'student'),
        ('teacher1', 'password123', 'teacher1@example.com', 'teacher'),
        ('testuser', 'password123', 'test@example.com', 'student')
    ]
    
    for username, password, email, role in test_users:
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        
        try:
            cursor.execute('''
            INSERT INTO users (username, password_hash, salt, email, user_role, monica_api_access)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (username, password_hash.hex(), salt, email, role, role in ['teacher', 'admin']))
            
            user_id = cursor.lastrowid
            
            # Nastavení pro uživatele
            cursor.execute('''
            INSERT INTO user_settings (user_id) VALUES (?)
            ''', (user_id,))
            
            print(f"✅ Created test user: {username}")
            
        except sqlite3.IntegrityError:
            print(f"⚠️  User {username} already exists")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    print("🚀 Creating Enhanced Quiz Database...")
    
    # Vytvoření nové databáze
    db_path = create_enhanced_database()
    
    # Migrace existujících dat
    print("\n📦 Migrating existing question data...")
    migrate_existing_data()
    
    # Vytvoření ukázkových dat
    print("\n👥 Creating sample users...")
    create_sample_data()
    
    print("\n🎉 Database setup completed!")
    print(f"📁 Database location: {os.path.abspath(db_path)}")
    print("\n🔐 Test accounts:")
    print("  - admin / admin123 (admin)")
    print("  - teacher1 / password123 (teacher)")
    print("  - student1 / password123 (student)")
    print("  - testuser / password123 (student)")

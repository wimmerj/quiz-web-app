#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database initialization and migration script for Modular Quiz App
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate, init, migrate, upgrade
import secrets
import hashlib
import json

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the main app and database
from app import app, db, User, Question, QuizProgress, BattleResult, OralExam, SystemLog, MonicaUsage

def init_database():
    """Initialize database with tables and sample data"""
    print("🔄 Initializing database...")
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Create admin user if not exists
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                salt = secrets.token_hex(16)
                password_hash = hashlib.pbkdf2_hmac(
                    'sha256', 
                    'admin123'.encode('utf-8'), 
                    salt.encode('utf-8'), 
                    100000
                ).hex()
                
                admin = User(
                    username='admin',
                    email='admin@quiz.app',
                    password_hash=password_hash,
                    salt=salt,
                    role='admin',
                    avatar='⚙️',
                    settings=json.dumps({
                        'general': {
                            'language': 'cs',
                            'timezone': 'Europe/Prague',
                            'notifications': True
                        },
                        'appearance': {
                            'theme': 'dark',
                            'animations': True,
                            'glassmorphism': True
                        }
                    })
                )
                
                db.session.add(admin)
                print("✅ Admin user created (username: admin, password: admin123)")
            
            # Create test student user
            student = User.query.filter_by(username='student').first()
            if not student:
                salt = secrets.token_hex(16)
                password_hash = hashlib.pbkdf2_hmac(
                    'sha256', 
                    'student123'.encode('utf-8'), 
                    salt.encode('utf-8'), 
                    100000
                ).hex()
                
                student = User(
                    username='student',
                    email='student@quiz.app',
                    password_hash=password_hash,
                    salt=salt,
                    role='student',
                    avatar='🎓',
                    battle_rating=1450,
                    settings=json.dumps({
                        'general': {
                            'language': 'cs',
                            'timezone': 'Europe/Prague'
                        },
                        'quiz': {
                            'mode': 'normal',
                            'autoNext': True,
                            'showHints': True
                        }
                    })
                )
                
                db.session.add(student)
                print("✅ Test student user created (username: student, password: student123)")
            
            # Add sample questions if none exist
            if Question.query.count() == 0:
                sample_questions = [
                    # Matematika - Lehké
                    {
                        'table_name': 'matematika_zaklad',
                        'question_text': 'Jaký je výsledek 5 + 3?',
                        'answer_a': '7',
                        'answer_b': '8',
                        'answer_c': '9',
                        'correct_answer': 1,
                        'explanation': 'Základní sčítání: 5 + 3 = 8',
                        'difficulty': 'easy',
                        'category': 'aritmetika'
                    },
                    {
                        'table_name': 'matematika_zaklad',
                        'question_text': 'Kolik je 12 - 7?',
                        'answer_a': '4',
                        'answer_b': '5',
                        'answer_c': '6',
                        'correct_answer': 1,
                        'explanation': 'Základní odčítání: 12 - 7 = 5',
                        'difficulty': 'easy',
                        'category': 'aritmetika'
                    },
                    {
                        'table_name': 'matematika_zaklad',
                        'question_text': 'Jaký je výsledek 6 × 4?',
                        'answer_a': '22',
                        'answer_b': '24',
                        'answer_c': '26',
                        'correct_answer': 1,
                        'explanation': 'Násobení: 6 × 4 = 24',
                        'difficulty': 'medium',
                        'category': 'aritmetika'
                    },
                    
                    # Literatura - Střední
                    {
                        'table_name': 'literatura_ceska',
                        'question_text': 'Kdo napsal „Babičku"?',
                        'answer_a': 'Karel Čapek',
                        'answer_b': 'Božena Němcová',
                        'answer_c': 'Alois Jirásek',
                        'correct_answer': 1,
                        'explanation': 'Babičku napsala Božena Němcová v roce 1855.',
                        'difficulty': 'medium',
                        'category': 'česká literatura'
                    },
                    {
                        'table_name': 'literatura_ceska',
                        'question_text': 'Ve kterém století žil Karel Hynek Mácha?',
                        'answer_a': '18. století',
                        'answer_b': '19. století',
                        'answer_c': '20. století',
                        'correct_answer': 1,
                        'explanation': 'K. H. Mácha žil v 19. století (1810-1836), byl představitelem romantismu.',
                        'difficulty': 'medium',
                        'category': 'česká literatura'
                    },
                    
                    # Historie - Těžké
                    {
                        'table_name': 'historie_ceska',
                        'question_text': 'Ve kterém roce byla založena Univerzita Karlova?',
                        'answer_a': '1348',
                        'answer_b': '1358',
                        'answer_c': '1368',
                        'correct_answer': 0,
                        'explanation': 'Univerzita Karlova byla založena císařem Karlem IV. v roce 1348.',
                        'difficulty': 'hard',
                        'category': 'středověk'
                    },
                    {
                        'table_name': 'historie_ceska',
                        'question_text': 'Kdo byl prvním československým prezidentem?',
                        'answer_a': 'Edvard Beneš',
                        'answer_b': 'Tomáš Garrigue Masaryk',
                        'answer_c': 'Václav Havel',
                        'correct_answer': 1,
                        'explanation': 'T. G. Masaryk byl prvním prezidentem Československa (1918-1935).',
                        'difficulty': 'medium',
                        'category': 'moderní historie'
                    },
                    
                    # Geografie
                    {
                        'table_name': 'geografie_sveta',
                        'question_text': 'Které je nejvyšší pohoří světa?',
                        'answer_a': 'Andy',
                        'answer_b': 'Himálaj',
                        'answer_c': 'Alpy',
                        'correct_answer': 1,
                        'explanation': 'Himálaj je nejvyšší pohoří světa s Mount Everestem (8 848 m).',
                        'difficulty': 'easy',
                        'category': 'fyzická geografie'
                    },
                    {
                        'table_name': 'geografie_sveta',
                        'question_text': 'Hlavní město Austrálie je:',
                        'answer_a': 'Sydney',
                        'answer_b': 'Melbourne',
                        'answer_c': 'Canberra',
                        'correct_answer': 2,
                        'explanation': 'Canberra je hlavním městem Austrálie, ačkoli Sydney je největší město.',
                        'difficulty': 'medium',
                        'category': 'politická geografie'
                    },
                    
                    # Přírodověda
                    {
                        'table_name': 'prirodoveda_biologie',
                        'question_text': 'Kolik komor má srdce člověka?',
                        'answer_a': '2',
                        'answer_b': '3',
                        'answer_c': '4',
                        'correct_answer': 2,
                        'explanation': 'Lidské srdce má 4 komory: 2 síně a 2 komory.',
                        'difficulty': 'medium',
                        'category': 'anatomie'
                    }
                ]
                
                for q_data in sample_questions:
                    question = Question(**q_data)
                    db.session.add(question)
                
                print(f"✅ Added {len(sample_questions)} sample questions")
            
            # Commit all changes
            db.session.commit()
            print("✅ Database initialization completed successfully!")
            
            # Print summary
            print("\n📊 Database Summary:")
            print(f"   Users: {User.query.count()}")
            print(f"   Questions: {Question.query.count()}")
            print(f"   Question Tables: {db.session.query(Question.table_name).distinct().count()}")
            
            tables = db.session.query(Question.table_name).distinct().all()
            for table in tables:
                count = Question.query.filter_by(table_name=table[0]).count()
                print(f"   - {table[0]}: {count} questions")
            
        except Exception as e:
            print(f"❌ Error initializing database: {str(e)}")
            db.session.rollback()
            return False
        
        return True

def reset_database():
    """Reset database (DROP ALL TABLES and recreate)"""
    print("⚠️  RESETTING DATABASE - ALL DATA WILL BE LOST!")
    response = input("Are you sure? Type 'YES' to confirm: ")
    
    if response != 'YES':
        print("❌ Database reset cancelled")
        return False
    
    with app.app_context():
        try:
            # Drop all tables
            db.drop_all()
            print("🗑️  All tables dropped")
            
            # Recreate tables and add sample data
            return init_database()
            
        except Exception as e:
            print(f"❌ Error resetting database: {str(e)}")
            return False

def add_sample_battle_data():
    """Add sample battle data for testing"""
    with app.app_context():
        try:
            # Get users
            admin = User.query.filter_by(username='admin').first()
            student = User.query.filter_by(username='student').first()
            
            if not admin or not student:
                print("❌ Need admin and student users for battle data")
                return False
            
            # Add sample battle results
            sample_battles = [
                {
                    'battle_id': 'battle_001',
                    'user_id': student.id,
                    'opponent_id': admin.id,
                    'mode': 'quick',
                    'score': 80,
                    'questions_correct': 4,
                    'total_questions': 5,
                    'is_winner': True,
                    'rating_change': 15
                },
                {
                    'battle_id': 'battle_002',
                    'user_id': student.id,
                    'opponent_id': admin.id,
                    'mode': 'ranked',
                    'score': 60,
                    'questions_correct': 6,
                    'total_questions': 10,
                    'is_winner': False,
                    'rating_change': -10
                }
            ]
            
            for battle_data in sample_battles:
                battle = BattleResult(**battle_data)
                db.session.add(battle)
            
            db.session.commit()
            print("✅ Sample battle data added")
            return True
            
        except Exception as e:
            print(f"❌ Error adding battle data: {str(e)}")
            return False

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'reset':
            reset_database()
        elif command == 'battle-data':
            add_sample_battle_data()
        elif command == 'init':
            init_database()
        else:
            print("Usage: python init_db.py [init|reset|battle-data]")
    else:
        # Default: just initialize
        init_database()

if __name__ == '__main__':
    main()

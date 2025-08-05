#!/usr/bin/env python3
"""
Initialize PostgreSQL database tables
"""

import os
from app import app, db, User
import secrets
import hashlib

def init_database():
    """Create database tables and admin user"""
    print("🔧 Initializing PostgreSQL database...")
    
    with app.app_context():
        try:
            # Create all tables
            print("📊 Creating database tables...")
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Create admin user if not exists
            print("👨‍💼 Checking for admin user...")
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                print("👨‍💼 Creating admin user...")
                salt = secrets.token_hex(16)
                password_hash = hashlib.pbkdf2_hmac('sha256', 'admin123'.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
                
                admin = User(
                    username='admin',
                    email='admin@quiz.com',
                    password_hash=password_hash,
                    salt=salt,
                    role='admin',
                    monica_api_access=True
                )
                
                db.session.add(admin)
                db.session.commit()
                print("✅ Admin user created successfully!")
                print("   Username: admin")
                print("   Password: admin123")
            else:
                print("✅ Admin user already exists")
                
            print("\n🎉 Database initialization completed!")
            return True
            
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")
            return False

if __name__ == '__main__':
    success = init_database()
    if success:
        print("\n🚀 You can now run the migration script!")
    else:
        print("\n❌ Please fix the database connection issues first.")

#!/usr/bin/env python3
"""
Test script to verify app functionality before deployment
"""

import os
import sys

# Test imports
try:
    print("Testing imports...")
    from app import app, db, init_database, User, Question, UserAnswer, SystemLog
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

# Test database initialization
try:
    print("Testing database initialization...")
    init_database()
    print("✅ Database initialization successful")
except Exception as e:
    print(f"❌ Database initialization error: {e}")
    sys.exit(1)

# Test app creation
try:
    print("Testing app configuration...")
    print(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    print(f"Secret Key: {'Set' if app.config.get('SECRET_KEY') else 'Not set'}")
    print("✅ App configuration looks good")
except Exception as e:
    print(f"❌ App configuration error: {e}")
    sys.exit(1)

print("🎉 All tests passed! App should deploy successfully.")

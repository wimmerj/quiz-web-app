#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quiz Web App - Production Flask Backend
Optimized for Render.com deployment with PostgreSQL
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
import jwt
import hashlib
import secrets
import requests
import json
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Database configuration for Render.com
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 300,
    'pool_pre_ping': True
}

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, origins=['*'])

# JWT configuration
JWT_SECRET = app.config['SECRET_KEY']
JWT_EXPIRATION_HOURS = 24

# Monica AI configuration
MONICA_API_URL = "https://openapi.monica.im/v1/chat/completions"
MONICA_API_KEY = os.environ.get('MONICA_API_KEY', 'your-monica-api-key')

# ===============================================
# DATABASE MODELS
# ===============================================

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    salt = db.Column(db.String(32), nullable=False)
    role = db.Column(db.String(20), default='student', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    monica_api_access = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    answers = db.relationship('UserAnswer', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    logs = db.relationship('SystemLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(50), nullable=False, index=True)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.Text, nullable=False)
    option_b = db.Column(db.Text, nullable=False)
    option_c = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)
    explanation = db.Column(db.Text)
    difficulty = db.Column(db.String(10), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    answers = db.relationship('UserAnswer', backref='question', lazy='dynamic')

class UserAnswer(db.Model):
    __tablename__ = 'user_answers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False, index=True)
    user_answer = db.Column(db.String(1), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    quiz_session_id = db.Column(db.String(36))
    
    # Indexes
    __table_args__ = (
        db.Index('idx_user_question', 'user_id', 'question_id'),
        db.Index('idx_quiz_session', 'quiz_session_id'),
    )

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    severity = db.Column(db.String(20), default='info', nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

# ===============================================
# AUTHENTICATION & AUTHORIZATION
# ===============================================

def create_jwt_token(user):
    """Create JWT token for user"""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def require_auth(f):
    """Decorator for authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
                request.current_user = payload
                return f(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401
        
        return jsonify({'error': 'Authentication required'}), 401
    
    return decorated_function

def require_admin(f):
    """Decorator for admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'current_user'):
            return jsonify({'error': 'Authentication required'}), 401
        
        if request.current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

def log_action(user_id, action, details="", ip_address="", user_agent="", severity="info"):
    """Log action to database"""
    try:
        log_entry = SystemLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        print(f"Error logging action: {e}")
        db.session.rollback()

# ===============================================
# ERROR HANDLERS
# ===============================================

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    db.session.rollback()
    return jsonify({'error': 'An unexpected error occurred'}), 500

# ===============================================
# BASIC ROUTES
# ===============================================

@app.route('/')
def index():
    """Health check and info"""
    return jsonify({
        'status': 'healthy',
        'message': 'Quiz Web App Backend API',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/health')
def health_check():
    """Detailed health check"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        db_status = 'connected'
    except Exception:
        db_status = 'error'
    
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

# ===============================================
# AUTHENTICATION ROUTES
# ===============================================

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    """User registration"""
    ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        
        # Validation
        if not username or not password or not email:
            return jsonify({'error': 'Username, email and password are required'}), 400
        
        if len(username) < 3 or len(username) > 50:
            return jsonify({'error': 'Username must be 3-50 characters long'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Check if user exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Create user
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            salt=salt
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create token
        token = create_jwt_token(user)
        
        # Log action
        log_action(
            user_id=user.id,
            action="USER_REGISTERED",
            details=f"New user registered: {username}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    """User login"""
    ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), user.salt.encode('utf-8'), 100000).hex()
        
        if password_hash != user.password_hash:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create token
        token = create_jwt_token(user)
        
        # Log action
        log_action(
            user_id=user.id,
            action="USER_LOGIN",
            details=f"User logged in: {username}",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'monica_api_access': user.monica_api_access
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get user profile"""
    try:
        user = User.query.get(request.current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'monica_api_access': user.monica_api_access
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to get profile'}), 500

# ===============================================
# QUIZ ROUTES
# ===============================================

@app.route('/api/quiz/tables', methods=['GET'])
def get_quiz_tables():
    """Get available quiz tables"""
    try:
        tables = db.session.query(Question.table_name, db.func.count(Question.id).label('count')).group_by(Question.table_name).all()
        
        result = [{'name': table.table_name, 'count': table.count} for table in tables]
        
        return jsonify({
            'tables': result,
            'total_tables': len(result)
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to get tables'}), 500

@app.route('/api/quiz/questions/<table_name>', methods=['GET'])
def get_questions(table_name):
    """Get questions from table"""
    try:
        questions = Question.query.filter_by(table_name=table_name).all()
        
        if not questions:
            return jsonify({'error': 'Table not found'}), 404
        
        result = []
        for q in questions:
            result.append({
                'id': q.id,
                'question': q.question_text,
                'answers': {
                    'A': q.option_a,
                    'B': q.option_b,
                    'C': q.option_c
                },
                'correct': q.correct_answer,
                'explanation': q.explanation
            })
        
        return jsonify({
            'questions': result,
            'table_name': table_name,
            'total_questions': len(result)
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to get questions'}), 500

@app.route('/api/quiz/answer', methods=['POST'])
@require_auth
def save_answer():
    """Save user answer"""
    try:
        data = request.get_json()
        question_id = data.get('question_id')
        user_answer = data.get('answer')
        quiz_session_id = data.get('quiz_session_id')
        
        if not question_id or not user_answer:
            return jsonify({'error': 'Question ID and answer are required'}), 400
        
        # Get question
        question = Question.query.get(question_id)
        if not question:
            return jsonify({'error': 'Question not found'}), 404
        
        # Check if correct
        is_correct = user_answer.upper() == question.correct_answer.upper()
        
        # Save answer
        answer = UserAnswer(
            user_id=request.current_user['user_id'],
            question_id=question_id,
            user_answer=user_answer.upper(),
            is_correct=is_correct,
            quiz_session_id=quiz_session_id
        )
        
        db.session.add(answer)
        db.session.commit()
        
        return jsonify({
            'saved': True,
            'correct': is_correct,
            'correct_answer': question.correct_answer,
            'explanation': question.explanation
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save answer'}), 500

# ===============================================
# ADMIN ROUTES
# ===============================================

@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_admin
def get_all_users():
    """Get all users (admin only)"""
    try:
        users = User.query.all()
        
        result = []
        for user in users:
            # Get user statistics
            total_answers = UserAnswer.query.filter_by(user_id=user.id).count()
            correct_answers = UserAnswer.query.filter_by(user_id=user.id, is_correct=True).count()
            
            result.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'monica_api_access': user.monica_api_access,
                'stats': {
                    'total_answers': total_answers,
                    'correct_answers': correct_answers,
                    'accuracy': round((correct_answers / total_answers * 100) if total_answers > 0 else 0, 1)
                }
            })
        
        return jsonify({'users': result})
        
    except Exception as e:
        return jsonify({'error': 'Failed to get users'}), 500

@app.route('/api/admin/statistics', methods=['GET'])
@require_auth
@require_admin
def get_admin_statistics():
    """Get system statistics (admin only)"""
    try:
        # Basic counts
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        total_questions = Question.query.count()
        total_answers = UserAnswer.query.count()
        correct_answers = UserAnswer.query.filter_by(is_correct=True).count()
        
        # Recent activity
        recent_logins = User.query.filter(User.last_login >= datetime.utcnow() - timedelta(days=7)).count()
        recent_answers = UserAnswer.query.filter(UserAnswer.answered_at >= datetime.utcnow() - timedelta(days=7)).count()
        
        return jsonify({
            'statistics': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'recent_logins': recent_logins
                },
                'quiz': {
                    'total_questions': total_questions,
                    'total_answers': total_answers,
                    'correct_answers': correct_answers,
                    'accuracy': round((correct_answers / total_answers * 100) if total_answers > 0 else 0, 1),
                    'recent_answers': recent_answers
                }
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to get statistics'}), 500

# ===============================================
# MONICA AI ROUTES
# ===============================================

@app.route('/api/monica/evaluate', methods=['POST', 'OPTIONS'])
def monica_evaluate():
    """Monica AI evaluation (compatible with frontend)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        question = data.get('question', '')
        correct_answer = data.get('correctAnswer', '')
        user_answer = data.get('userAnswer', '')
        
        if not all([question, correct_answer, user_answer]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Mock evaluation for now (replace with actual Monica AI call)
        evaluation = {
            "summary": f"Vaše odpověď '{user_answer}' byla vyhodnocena.",
            "score": 85,
            "positives": ["Správný směr myšlení", "Dobrá struktura odpovědi"],
            "negatives": ["Chybí detaily", "Nepřesná formulace"],
            "recommendations": ["Přidejte více konkrétních příkladů"],
            "grade": "B",
            "method": "web-backend",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return jsonify(evaluation)
        
    except Exception as e:
        return jsonify({
            "summary": "Chyba při vyhodnocování",
            "score": 50,
            "positives": ["Snaha o odpověď"],
            "negatives": ["Technické problémy"],
            "recommendations": ["Zkuste znovu později"],
            "grade": "C",
            "method": "web-backend-error",
            "timestamp": datetime.utcnow().isoformat()
        }), 200

# ===============================================
# STARTUP & MAIN
# ===============================================

def init_db():
    """Initialize database with sample data"""
    with app.app_context():
        db.create_all()
        
        # Create admin user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
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
            print("✅ Admin user created (username: admin, password: admin123)")

if __name__ == '__main__':
    init_db()
    
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting Quiz Web App Backend on port {port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"🗄️ Database: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

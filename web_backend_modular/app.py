#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Modular Quiz App - Backend API Server
Optimized for Render.com with Monica AI integration
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import jwt
import hashlib
import secrets
import requests
import json
import asyncio
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

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///quiz_modular.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'pool_size': 10,
    'max_overflow': 20
}

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# CORS configuration for GitHub Pages
cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
CORS(app, origins=cors_origins, supports_credentials=True)

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"],
    storage_uri="memory://"
)
limiter.init_app(app)

# Monica AI configuration
MONICA_API_URL = "https://openapi.monica.im/v1/chat/completions"
MONICA_API_KEY = os.environ.get('MONICA_API_KEY', '')
MONICA_ENABLED = bool(MONICA_API_KEY and MONICA_API_KEY != 'your-monica-api-key-here')

# JWT configuration
JWT_SECRET = app.config['SECRET_KEY']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# ===============================================
# DATABASE MODELS
# ===============================================

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=True, index=True)  # Allow NULL emails
    password_hash = db.Column(db.String(255), nullable=False)
    salt = db.Column(db.String(32), nullable=False)
    role = db.Column(db.String(20), default='student', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    avatar = db.Column(db.String(10), default='👤')
    
    # Settings
    settings = db.Column(db.Text)  # JSON string
    
    # Battle stats
    battle_rating = db.Column(db.Integer, default=1500)
    battle_wins = db.Column(db.Integer, default=0)
    battle_losses = db.Column(db.Integer, default=0)
    
    # Relationships
    quiz_progress = db.relationship('QuizProgress', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    battle_history = db.relationship('BattleResult', foreign_keys='BattleResult.user_id', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    oral_exams = db.relationship('OralExam', backref='user', lazy='dynamic', cascade='all, delete-orphan')

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(100), nullable=False, index=True)
    question_text = db.Column(db.Text, nullable=False)
    answer_a = db.Column(db.Text, nullable=False)
    answer_b = db.Column(db.Text, nullable=False)
    answer_c = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Integer, nullable=False)  # 0=A, 1=B, 2=C
    explanation = db.Column(db.Text)
    difficulty = db.Column(db.String(20), default='medium')  # easy, medium, hard
    category = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # AI fields
    ai_hint = db.Column(db.Text)
    ai_explanation = db.Column(db.Text)

class QuizProgress(db.Model):
    __tablename__ = 'quiz_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    selected_answer = db.Column(db.Integer, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    response_time = db.Column(db.Float)  # seconds
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    quiz_session_id = db.Column(db.String(50))

class BattleResult(db.Model):
    __tablename__ = 'battle_results'
    
    id = db.Column(db.Integer, primary_key=True)
    battle_id = db.Column(db.String(50), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    opponent_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    mode = db.Column(db.String(20), nullable=False)  # quick, ranked, tournament
    score = db.Column(db.Integer, default=0)
    questions_correct = db.Column(db.Integer, default=0)
    total_questions = db.Column(db.Integer, default=5)
    is_winner = db.Column(db.Boolean, default=False)
    rating_change = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Explicit relationships
    opponent = db.relationship('User', foreign_keys=[opponent_id], post_update=True)

class OralExam(db.Model):
    __tablename__ = 'oral_exams'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    audio_transcript = db.Column(db.Text)
    ai_evaluation = db.Column(db.Text)  # JSON string
    score = db.Column(db.Integer)  # 0-100
    feedback = db.Column(db.Text)
    pronunciation_score = db.Column(db.Integer)
    grammar_score = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class MonicaUsage(db.Model):
    __tablename__ = 'monica_usage'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    feature = db.Column(db.String(50), nullable=False)  # oral_exam, hint, battle_ai
    tokens_used = db.Column(db.Integer, default=0)
    cost = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# ===============================================
# AUTHENTICATION & AUTHORIZATION
# ===============================================

def generate_token(user_id, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_token(token)
        if not payload or payload.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated

# ===============================================
# MONICA AI SERVICE
# ===============================================

class MonicaAIService:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = MONICA_API_URL
        self.enabled = bool(api_key and api_key != 'your-monica-api-key-here')
    
    async def chat(self, messages, model="gpt-3.5-turbo", max_tokens=1000):
        """Send chat request to Monica AI"""
        if not self.enabled:
            return {"error": "Monica AI not configured"}
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": messages if isinstance(messages, list) else [{"role": "user", "content": messages}],
            "max_tokens": max_tokens,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(self.base_url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Monica AI request failed: {str(e)}"}
    
    def evaluate_oral_answer(self, question_text, correct_answer, user_answer):
        """Evaluate oral exam answer using Monica AI"""
        prompt = f"""
        Vyhodnoť následující ústní odpověď studenta v českém jazyce:
        
        OTÁZKA: {question_text}
        SPRÁVNÁ ODPOVĚĎ: {correct_answer}
        ODPOVĚĎ STUDENTA: {user_answer}
        
        Vrať JSON s hodnocením (bez dalšího textu):
        {{
            "score": 0-100,
            "correctness": "correct|partial|incorrect",
            "feedback": "konstruktivní zpětná vazba v češtině",
            "suggestions": ["návrh1", "návrh2"],
            "pronunciation_score": 0-100,
            "grammar_score": 0-100,
            "content_score": 0-100
        }}
        """
        
        return self.chat(prompt, max_tokens=500)
    
    def generate_hint(self, question_text, difficulty="medium"):
        """Generate smart hint for question"""
        prompt = f"""
        Vytvoř užitečnou nápovědu pro tuto otázku (obtížnost: {difficulty}):
        
        OTÁZKA: {question_text}
        
        Nápověda by měla:
        - Nasměrovat na správnou odpověď, ale neafyzovat ji přímo
        - Být vhodná pro obtížnost "{difficulty}"
        - Být v českém jazyce
        - Být max 2 věty
        
        Vrať pouze text nápovědy bez dalšího formátování.
        """
        
        return self.chat(prompt, max_tokens=200)

# Initialize Monica AI service
monica_ai = MonicaAIService(MONICA_API_KEY)

# ===============================================
# API ROUTES - HEALTH & INFO
# ===============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection with PostgreSQL compatible query
        db.session.execute(db.text('SELECT 1'))
        db.session.commit()
        db_status = "connected"
    except Exception as e:
        print(f"Database connection error: {e}")
        db_status = "disconnected"
    
    return jsonify({
        "status": "healthy",
        "database": db_status,
        "monica_ai": "enabled" if MONICA_ENABLED else "disabled",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0-modular"
    })

@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Debug endpoint for troubleshooting"""
    try:
        db_url = os.environ.get('DATABASE_URL', 'Not set')
        # Mask password for security
        if db_url and db_url != 'Not set':
            masked_url = db_url.split('@')[0] + '@***' + db_url.split('@')[1] if '@' in db_url else db_url
        else:
            masked_url = db_url
            
        return jsonify({
            "database_url_set": db_url != 'Not set',
            "database_url_masked": masked_url,
            "sqlalchemy_uri": app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')[:50] + '...',
            "environment": os.environ.get('FLASK_ENV', 'Not set'),
            "cors_origins": os.environ.get('CORS_ORIGINS', 'Not set')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/info', methods=['GET'])
def app_info():
    """Application information"""
    return jsonify({
        "name": "Modular Quiz App API",
        "version": "2.0.0",
        "features": {
            "authentication": True,
            "quiz_engine": True,
            "battle_mode": True,
            "oral_exams": True,
            "admin_panel": True,
            "monica_ai": MONICA_ENABLED,
            "real_time": True
        },
        "endpoints": {
            "auth": "/api/auth/*",
            "quiz": "/api/quiz/*",
            "battle": "/api/battle/*",
            "oral_exam": "/api/oral-exam/*",
            "admin": "/api/admin/*",
            "settings": "/api/settings/*"
        }
    })

# ===============================================
# API ROUTES - AUTHENTICATION
# ===============================================

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """User registration"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Email is optional but if provided, must be valid
    email = data.get('email', '').strip()
    if email and '@' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # If email is empty, set it to None to avoid unique constraint issues
    if not email:
        email = None
    
    # Check if user exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    # Check email only if provided
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # Create new user
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', data['password'].encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    
    user = User(
        username=data['username'],
        email=email,  # Use the processed email (can be None)
        password_hash=password_hash,
        salt=salt,
        avatar=data.get('avatar', '👤')
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Generate token
    token = generate_token(user.id, user.role)
    
    # Log registration
    log_entry = SystemLog(
        user_id=user.id,
        action='user_registered',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(log_entry)
    db.session.commit()
    
    return jsonify({
        'message': 'User registered successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'avatar': user.avatar
        },
        'token': token
    }), 201

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """User login"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Missing username or password'}), 400
    
    # Find user
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Verify password
    password_hash = hashlib.pbkdf2_hmac('sha256', data['password'].encode('utf-8'), user.salt.encode('utf-8'), 100000).hex()
    if password_hash != user.password_hash:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is disabled'}), 403
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Generate token
    token = generate_token(user.id, user.role)
    
    # Log login
    log_entry = SystemLog(
        user_id=user.id,
        action='user_login',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(log_entry)
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'avatar': user.avatar,
            'battle_rating': user.battle_rating,
            'settings': json.loads(user.settings) if user.settings else {}
        },
        'token': token
    })

@app.route('/api/auth/profile', methods=['GET'])
@login_required
def get_profile():
    """Get user profile"""
    user = User.query.get(request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'avatar': user.avatar,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'battle_rating': user.battle_rating,
            'battle_wins': user.battle_wins,
            'battle_losses': user.battle_losses,
            'settings': json.loads(user.settings) if user.settings else {}
        }
    })

# ===============================================
# API ROUTES - QUIZ
# ===============================================

@app.route('/api/quiz/tables', methods=['GET'])
@login_required
def get_quiz_tables():
    """Get available quiz tables"""
    tables = db.session.query(Question.table_name).distinct().all()
    table_list = []
    
    for table in tables:
        table_name = table[0]
        question_count = Question.query.filter_by(table_name=table_name).count()
        
        table_list.append({
            'name': table_name,
            'display_name': table_name.replace('_', ' ').title(),
            'question_count': question_count
        })
    
    return jsonify({'tables': table_list})

@app.route('/api/quiz/questions/<table_name>', methods=['GET'])
@login_required
def get_questions(table_name):
    """Get questions for specific table"""
    mode = request.args.get('mode', 'normal')
    limit = request.args.get('limit', type=int)
    
    query = Question.query.filter_by(table_name=table_name)
    
    # Apply filtering based on mode
    if mode == 'unanswered':
        # Questions not answered by current user
        answered_ids = db.session.query(QuizProgress.question_id).filter_by(
            user_id=request.current_user['user_id']
        ).subquery()
        query = query.filter(~Question.id.in_(answered_ids))
    
    elif mode == 'wrong':
        # Questions answered incorrectly
        wrong_ids = db.session.query(QuizProgress.question_id).filter_by(
            user_id=request.current_user['user_id'],
            is_correct=False
        ).subquery()
        query = query.filter(Question.id.in_(wrong_ids))
    
    elif mode == 'random':
        query = query.order_by(db.func.random())
    
    if limit:
        query = query.limit(limit)
    
    questions = query.all()
    
    return jsonify({
        'questions': [{
            'id': q.id,
            'text': q.question_text,
            'answers': [q.answer_a, q.answer_b, q.answer_c],
            'difficulty': q.difficulty,
            'category': q.category,
            'explanation': q.explanation
        } for q in questions]
    })

@app.route('/api/quiz/submit-answer', methods=['POST'])
@login_required
def submit_answer():
    """Submit quiz answer"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('question_id', 'selected_answer')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    question = Question.query.get(data['question_id'])
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    is_correct = int(data['selected_answer']) == question.correct_answer
    
    # Save progress
    progress = QuizProgress(
        user_id=request.current_user['user_id'],
        question_id=data['question_id'],
        selected_answer=data['selected_answer'],
        is_correct=is_correct,
        response_time=data.get('response_time'),
        quiz_session_id=data.get('session_id')
    )
    
    db.session.add(progress)
    db.session.commit()
    
    return jsonify({
        'correct': is_correct,
        'correct_answer': question.correct_answer,
        'explanation': question.explanation or question.ai_explanation
    })

# ===============================================
# INITIALIZATION
# ===============================================

def init_database():
    """Initialize database with default data"""
    with app.app_context():
        db.create_all()
        
        # Create admin user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            salt = secrets.token_hex(16)
            password_hash = hashlib.pbkdf2_hmac('sha256', 'admin123'.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
            
            admin = User(
                username='admin',
                email='admin@quiz.app',
                password_hash=password_hash,
                salt=salt,
                role='admin',
                avatar='⚙️'
            )
            
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created (username: admin, password: admin123)")
        
        # Add sample questions if none exist
        if Question.query.count() == 0:
            sample_questions = [
                {
                    'table_name': 'demo_questions',
                    'question_text': 'Jaký je výsledek 2 + 2?',
                    'answer_a': '3',
                    'answer_b': '4',
                    'answer_c': '5',
                    'correct_answer': 1,
                    'explanation': 'Základní matematika: 2 + 2 = 4',
                    'difficulty': 'easy',
                    'category': 'matematika'
                },
                {
                    'table_name': 'demo_questions',
                    'question_text': 'Kdo napsal Romeo a Julie?',
                    'answer_a': 'Charles Dickens',
                    'answer_b': 'William Shakespeare',
                    'answer_c': 'Jane Austen',
                    'correct_answer': 1,
                    'explanation': 'William Shakespeare napsal tuto slavnou tragédii.',
                    'difficulty': 'medium',
                    'category': 'literatura'
                }
            ]
            
            for q_data in sample_questions:
                question = Question(**q_data)
                db.session.add(question)
            
            db.session.commit()
            print("✅ Sample questions added")

if __name__ == '__main__':
    init_database()
    
    # Run development server
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    app.run(host='0.0.0.0', port=port, debug=debug)

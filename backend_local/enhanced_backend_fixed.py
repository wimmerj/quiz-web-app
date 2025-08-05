#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Quiz Backend Server
Rozšířený backend s centralizovaným ukládáním dat a uživatelským managementem
"""

from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import jwt
import requests
import json
import os
import logging
from datetime import datetime, timedelta
from functools import wraps
import threading
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

# Nastavení aplikace
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Pro session management
CORS(app)  # Povolí všechny CORS požadavky - opraveno pro kompatibilitu

# Konfigurace - use absolute paths to avoid working directory issues
script_dir = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(script_dir, "enhanced_quiz.db")
ORIGINAL_DB_PATH = os.path.join(script_dir, "DB", "Otazky_Quiz.db")
JWT_SECRET = secrets.token_hex(32)
JWT_EXPIRATION_HOURS = 24

# Monica API konfigurace
MONICA_API_URL = "https://openapi.monica.im/v1/chat/completions"
MONICA_API_KEY = "sk-049nXVgkhXvC1mJIMdyuvOFPlc-GEGtec2OhmpnkeQ6Ksrz47edYR8bQRZmtYkLlQT0AIJpN-Hgc3l0a5wfjubpu4Z2O"

# Logging
logging.basicConfig(level=logging.INFO, encoding='utf-8')
logger = logging.getLogger(__name__)

# Thread-safe database connection
db_lock = threading.Lock()

def get_db_connection():
    """Thread-safe databázové připojení"""
    return sqlite3.connect(DATABASE_PATH, check_same_thread=False)

def log_action(user_id, action, details="", ip_address="", user_agent="", severity="info"):
    """Logování akcí do databáze"""
    try:
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO system_logs (user_id, action, details, ip_address, user_agent, severity)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, action, details, ip_address, user_agent, severity))
            conn.commit()
            conn.close()
    except Exception as e:
        logger.error(f"Error logging action: {e}")

def require_auth(f):
    """Dekorátor pro autentifikaci"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]  # Remove 'Bearer ' prefix
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

def require_role(required_role):
    """Dekorátor pro kontrolu role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = request.current_user.get('role', 'student')
            if user_role not in ['admin'] and required_role == 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ===============================================
# REQUEST LOGGING MIDDLEWARE
# ===============================================

@app.before_request
def log_request_info():
    """Logování všech příchozích požadavků"""
    user_id = None
    username = "anonymous"
    
    # Pokus o identifikaci uživatele z tokenu
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = payload.get('user_id')
            username = payload.get('username', 'unknown')
        except:
            pass
    
    # Logování požadavku
    ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    log_details = {
        'method': request.method,
        'path': request.path,
        'query': dict(request.args),
        'content_type': request.content_type,
        'content_length': request.content_length
    }
    
    logger.info(f"WEB [{username}] {request.method} {request.path} from {ip_address}")
    
    # Uložit do databáze pro důležité endpoints
    if request.path.startswith('/api/'):
        log_action(
            user_id=user_id,
            action=f"API_REQUEST_{request.method}",
            details=f"{request.path} - {json.dumps(log_details)}",
            ip_address=ip_address,
            user_agent=user_agent,
            severity="info"
        )

@app.after_request
def log_response_info(response):
    """Logování odpovědí"""
    username = getattr(request, 'current_user', {}).get('username', 'anonymous')
    
    logger.info(f"OUT [{username}] {request.method} {request.path} -> {response.status_code}")
    
    if response.status_code >= 400:
        logger.warning(f"WARN [{username}] {request.method} {request.path} -> {response.status_code}")
    
    return response

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors"""
    logger.warning(f"ERROR 404: {request.path}")
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"ERROR 500: {str(error)}")
    import traceback
    traceback.print_exc()
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all unhandled exceptions"""
    logger.error(f"ERROR UNHANDLED: {str(e)}")
    import traceback
    traceback.print_exc()
    return jsonify({'error': 'An unexpected error occurred'}), 500

# ===============================================
# ZÁKLADNÍ ROUTES
# ===============================================
@app.route('/')
def index():
    """Serv hlavní stránku aplikace"""
    return send_from_directory('.', 'quiz_app.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serv statické soubory"""
    return send_from_directory('.', filename)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected' if os.path.exists(DATABASE_PATH) else 'missing',
        'version': '2.0-enhanced'
    })

# Autentifikační endpointy
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    """Registrace nového uživatele"""
    ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        
        logger.info(f"AUTH Registration attempt for username: {username} from {ip_address}")
        
        # Validace
        if not username or not password:
            logger.warning(f"ERROR Registration failed: Missing username or password from {ip_address}")
            return jsonify({'error': 'Username and password are required'}), 400
        
        if len(username) < 3 or len(username) > 50:
            logger.warning(f"ERROR Registration failed: Invalid username length '{username}' from {ip_address}")
            return jsonify({'error': 'Username must be 3-50 characters long'}), 400
        
        if len(password) < 6:
            logger.warning(f"ERROR Registration failed: Password too short for '{username}' from {ip_address}")
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Kontrola existence uživatele
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
            existing_user = cursor.fetchone()
            if existing_user:
                conn.close()
                logger.warning(f"ERROR Registration failed: Username '{username}' already exists from {ip_address}")
                return jsonify({'error': 'Username or email already exists'}), 409
            
            # Vytvoření nového uživatele
            salt = secrets.token_hex(16)
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            
            cursor.execute('''
            INSERT INTO users (username, password_hash, salt, email, registration_ip)
            VALUES (?, ?, ?, ?, ?)
            ''', (username, password_hash.hex(), salt, email, ip_address))
            
            user_id = cursor.lastrowid
            
            # Defaultní nastavení
            cursor.execute('INSERT INTO user_settings (user_id) VALUES (?)', (user_id,))
            
            conn.commit()
            conn.close()
        
        # Úspěšné logování
        logger.info(f"OK User '{username}' registered successfully with ID {user_id} from {ip_address}")
        log_action(user_id, 'USER_REGISTERED', f'New user registered: {username}', 
                  ip_address, user_agent, severity='success')
        
        # Add event for GUI monitoring (v4.0)
        add_event('user_registered', {
            'username': username,
            'email': email,
            'user_id': user_id,
            'ip_address': ip_address
        })
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id,
            'username': username
        }), 201
        
    except Exception as e:
        logger.error(f"ERROR Registration error: {e} from {ip_address}")
        log_action(None, 'REGISTRATION_ERROR', f'Registration failed: {str(e)}', 
                  ip_address, user_agent, severity='error')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    """Přihlášení uživatele"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT id, username, password_hash, salt, user_role, is_active, monica_api_access
            FROM users WHERE username = ?
            ''', (username,))
            
            user = cursor.fetchone()
            conn.close()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user_id, db_username, password_hash, salt, user_role, is_active, monica_access = user
        
        if not is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Ověření hesla
        input_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        
        if password_hash != input_hash.hex():
            log_action(user_id, 'LOGIN_FAILED', f'Invalid password attempt', 
                      request.remote_addr, request.headers.get('User-Agent', ''), 'warning')
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Vytvoření JWT tokenu
        payload = {
            'user_id': user_id,
            'username': db_username,
            'role': user_role,
            'monica_access': bool(monica_access),
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
        
        # Aktualizace posledního přihlášení
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET last_login = ? WHERE id = ?', 
                          (datetime.now(), user_id))
            conn.commit()
            conn.close()
        
        # Logování
        log_action(user_id, 'USER_LOGIN', f'User logged in successfully', 
                  request.remote_addr, request.headers.get('User-Agent', ''))
        
        # Add event for GUI monitoring (v4.0)
        add_event('user_login', {
            'username': db_username,
            'user_id': user_id,
            'role': user_role,
            'ip_address': request.remote_addr
        })
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user_id,
                'username': db_username,
                'role': user_role,
                'monica_access': bool(monica_access)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """Získání profilu uživatele"""
    try:
        user_id = request.current_user['user_id']
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT u.username, u.email, u.created_at, u.last_login, u.total_questions_answered,
                   u.total_correct_answers, u.user_role, u.monica_api_access,
                   s.max_question_font_size, s.max_answer_font_size, s.show_only_unanswered,
                   s.theme, s.notifications_enabled
            FROM users u
            LEFT JOIN user_settings s ON u.id = s.user_id
            WHERE u.id = ?
            ''', (user_id,))
            
            profile = cursor.fetchone()
            conn.close()
        
        if not profile:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'username': profile[0],
            'email': profile[1],
            'created_at': profile[2],
            'last_login': profile[3],
            'total_questions_answered': profile[4] or 0,
            'total_correct_answers': profile[5] or 0,
            'user_role': profile[6],
            'monica_api_access': bool(profile[7]),
            'settings': {
                'max_question_font_size': profile[8] or 28,
                'max_answer_font_size': profile[9] or 26,
                'show_only_unanswered': bool(profile[10]),
                'theme': profile[11] or 'default',
                'notifications_enabled': bool(profile[12])
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Profile error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/change-password', methods=['POST'])
@require_auth
def change_password():
    """Změna hesla"""
    try:
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        user_id = request.current_user['user_id']
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Ověření současného hesla
            cursor.execute('SELECT password_hash, salt FROM users WHERE id = ?', (user_id,))
            user_data = cursor.fetchone()
            
            if not user_data:
                conn.close()
                return jsonify({'error': 'User not found'}), 404
            
            password_hash, salt = user_data
            current_hash = hashlib.pbkdf2_hmac('sha256', current_password.encode('utf-8'), salt.encode('utf-8'), 100000)
            
            if password_hash != current_hash.hex():
                conn.close()
                return jsonify({'error': 'Current password is incorrect'}), 401
            
            # Aktualizace hesla
            new_salt = secrets.token_hex(16)
            new_hash = hashlib.pbkdf2_hmac('sha256', new_password.encode('utf-8'), new_salt.encode('utf-8'), 100000)
            
            cursor.execute('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', 
                          (new_hash.hex(), new_salt, user_id))
            conn.commit()
            conn.close()
        
        # Logování
        log_action(user_id, 'PASSWORD_CHANGED', 'User changed password', 
                  request.remote_addr, request.headers.get('User-Agent', ''))
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Quiz endpointy
@app.route('/api/quiz/tables', methods=['GET'])
@require_auth
def get_quiz_tables():
    """Získání seznamu dostupných tabulek"""
    try:
        # Zkusit načíst z enhanced databáze
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT DISTINCT table_name FROM questions WHERE is_active = 1 ORDER BY table_name')
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
        
        # Pokud není nic v enhanced databázi, načíst z původní
        if not tables and os.path.exists(ORIGINAL_DB_PATH):
            orig_conn = sqlite3.connect(ORIGINAL_DB_PATH)
            orig_cursor = orig_conn.cursor()
            orig_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
            tables = [row[0] for row in orig_cursor.fetchall()]
            orig_conn.close()
        
        return jsonify({
            'tables': tables,
            'count': len(tables)
        }), 200
        
    except Exception as e:
        logger.error(f"Get tables error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/quiz/questions/<table_name>', methods=['GET'])
@require_auth
def get_questions(table_name):
    """Získání otázek z tabulky"""
    try:
        user_id = request.current_user['user_id']
        show_only_unanswered = request.args.get('unanswered', 'false').lower() == 'true'
        
        questions = []
        
        # Zkusit načíst z enhanced databáze
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if show_only_unanswered:
                # Získat pouze nezodpovězené otázky
                cursor.execute('''
                SELECT q.original_id, q.question_text, q.answer_a, q.answer_b, q.answer_c, 
                       q.correct_answer, q.explanation
                FROM questions q
                LEFT JOIN user_results ur ON q.table_name = ur.table_name 
                    AND q.original_id = ur.question_id 
                    AND ur.user_id = ? 
                    AND ur.is_correct = 1
                WHERE q.table_name = ? AND q.is_active = 1 AND ur.id IS NULL
                ORDER BY q.original_id
                ''', (user_id, table_name))
            else:
                cursor.execute('''
                SELECT original_id, question_text, answer_a, answer_b, answer_c, correct_answer, explanation
                FROM questions
                WHERE table_name = ? AND is_active = 1
                ORDER BY original_id
                ''', (table_name,))
            
            questions = cursor.fetchall()
            conn.close()
        
        # Pokud není nic v enhanced databázi, načíst z původní
        if not questions and os.path.exists(ORIGINAL_DB_PATH):
            try:
                orig_conn = sqlite3.connect(ORIGINAL_DB_PATH)
                orig_cursor = orig_conn.cursor()
                orig_cursor.execute(f"SELECT * FROM `{table_name}`")
                questions = orig_cursor.fetchall()
                orig_conn.close()
            except sqlite3.OperationalError:
                return jsonify({'error': f'Table {table_name} not found'}), 404
        
        # Formátování otázek pro frontend
        formatted_questions = []
        for q in questions:
            formatted_questions.append({
                'id': q[0],
                'question': q[1],
                'answer_a': q[2],
                'answer_b': q[3],
                'answer_c': q[4],
                'correct_answer': q[5],
                'explanation': q[6] if len(q) > 6 else ''
            })
        
        return jsonify({
            'questions': formatted_questions,
            'count': len(formatted_questions),
            'table_name': table_name
        }), 200
        
    except Exception as e:
        logger.error(f"Get questions error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/quiz/answer', methods=['POST'])
@require_auth
def save_answer():
    """Uložení odpovědi uživatele"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        table_name = data.get('table_name')
        question_id = data.get('question_id')
        question_text = data.get('question_text', '')
        selected_answer = data.get('selected_answer')
        correct_answer = data.get('correct_answer')
        is_correct = data.get('is_correct')
        session_id = data.get('session_id', str(uuid.uuid4()))
        time_taken = data.get('time_taken_seconds', 0)
        answer_text = data.get('answer_text', '')
        
        if not all([table_name, question_id, selected_answer is not None, correct_answer is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Uložení odpovědi
            cursor.execute('''
            INSERT INTO user_results 
            (user_id, table_name, question_id, question_text, selected_answer, correct_answer, 
             is_correct, session_id, time_taken_seconds, answer_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, table_name, question_id, question_text, selected_answer, 
                  correct_answer, is_correct, session_id, time_taken, answer_text))
            
            # Aktualizace celkových statistik uživatele
            if is_correct:
                cursor.execute('''
                UPDATE users SET total_correct_answers = total_correct_answers + 1,
                               total_questions_answered = total_questions_answered + 1
                WHERE id = ?
                ''', (user_id,))
            else:
                cursor.execute('''
                UPDATE users SET total_questions_answered = total_questions_answered + 1
                WHERE id = ?
                ''', (user_id,))
            
            conn.commit()
            conn.close()
        
        # Add event for GUI monitoring (v4.0) - individual answer
        add_event('quiz_answer', {
            'username': request.current_user['username'],
            'user_id': user_id,
            'table_name': table_name,
            'is_correct': is_correct,
            'session_id': session_id
        })
        
        return jsonify({
            'message': 'Answer saved successfully',
            'is_correct': is_correct
        }), 200
        
    except Exception as e:
        logger.error(f"Save answer error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/quiz/complete', methods=['POST'])
@require_auth
def complete_quiz():
    """Endpoint for quiz completion - triggers GUI event (v4.0)"""
    try:
        user_id = request.current_user['user_id']
        username = request.current_user['username']
        data = request.get_json()
        
        session_id = data.get('session_id')
        table_name = data.get('table_name')
        total_questions = data.get('total_questions', 0)
        correct_answers = data.get('correct_answers', 0)
        time_taken = data.get('time_taken_seconds', 0)
        quiz_type = data.get('quiz_type', 'normal')  # normal, battle, etc.
        
        # Calculate score percentage
        score_percentage = (correct_answers / max(total_questions, 1)) * 100
        
        # Log quiz completion
        log_action(user_id, 'QUIZ_COMPLETED', 
                  f'Quiz completed: {table_name}, Score: {correct_answers}/{total_questions} ({score_percentage:.1f}%)', 
                  request.remote_addr, request.headers.get('User-Agent', ''))
        
        # Add event for GUI monitoring (v4.0)
        add_event('quiz_completed', {
            'username': username,
            'user_id': user_id,
            'table_name': table_name,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score_percentage': round(score_percentage, 1),
            'time_taken': time_taken,
            'quiz_type': quiz_type,
            'session_id': session_id
        })
        
        return jsonify({
            'message': 'Quiz completed successfully',
            'score': {
                'correct': correct_answers,
                'total': total_questions,
                'percentage': round(score_percentage, 1)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Complete quiz error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/statistics', methods=['GET'])
@require_auth
def get_user_statistics():
    """Získání statistik uživatele"""
    try:
        user_id = request.current_user['user_id']
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Základní statistiky
            cursor.execute('''
            SELECT COUNT(*) as total_answers,
                   SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
                   SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as wrong_answers
            FROM user_results WHERE user_id = ?
            ''', (user_id,))
            
            basic_stats = cursor.fetchone()
            
            # Statistiky podle tabulek
            cursor.execute('''
            SELECT table_name,
                   COUNT(*) as total,
                   SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
                   AVG(CASE WHEN is_correct = 1 THEN 1.0 ELSE 0.0 END) * 100 as percentage
            FROM user_results 
            WHERE user_id = ?
            GROUP BY table_name
            ORDER BY percentage DESC
            ''', (user_id,))
            
            table_stats = [{'table': row[0], 'total': row[1], 'correct': row[2], 'percentage': round(row[3], 2)}
                          for row in cursor.fetchall()]
            
            # Nejnovější aktivity
            cursor.execute('''
            SELECT table_name, question_text, is_correct, answered_at
            FROM user_results
            WHERE user_id = ?
            ORDER BY answered_at DESC
            LIMIT 10
            ''', (user_id,))
            
            recent_activity = [{'table': row[0], 'question': row[1][:100] + '...' if len(row[1]) > 100 else row[1],
                               'correct': bool(row[2]), 'timestamp': row[3]}
                              for row in cursor.fetchall()]
            
            conn.close()
        
        return jsonify({
            'basic_stats': {
                'total_answers': basic_stats[0] or 0,
                'correct_answers': basic_stats[1] or 0,
                'wrong_answers': basic_stats[2] or 0,
                'success_rate': round((basic_stats[1] or 0) / max(basic_stats[0] or 1, 1) * 100, 2)
            },
            'table_stats': table_stats,
            'recent_activity': recent_activity
        }), 200
        
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Monica AI endpointy
@app.route('/api/monica/chat', methods=['POST', 'OPTIONS'])
def monica_chat_proxy():
    """
    Direct proxy endpoint pro Monica AI API (kompatibilita s original frontend)
    Přijme požadavek z frontendu a přepošle ho na Monica API bez autentifikace
    """
    
    # Handle preflight CORS request
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        # Získat data z požadavku
        client_data = request.get_json()
        
        if not client_data:
            return jsonify({'error': 'No data provided'}), 400
        
        logger.info(f"Monica chat proxy request: {client_data.get('messages', [{}])[0].get('content', '')[:100]}...")
        
        # Připravit headers pro Monica API
        headers = {
            'Authorization': f'Bearer {MONICA_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'EnhancedQuizApp-Backend-Proxy/2.0'
        }
        
        # Volání Monica API
        response = requests.post(
            MONICA_API_URL,
            headers=headers,
            json=client_data,
            timeout=30
        )
        
        logger.info(f"Monica API response: {response.status_code}")
        
        # Vrátit odpověď klientovi
        if response.ok:
            api_response = response.json()
            return jsonify(api_response), 200
        else:
            error_msg = f"Monica API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return jsonify({'error': error_msg}), response.status_code
            
    except requests.Timeout:
        error_msg = "Monica API timeout"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 408
        
    except requests.RequestException as e:
        error_msg = f"Request error: {str(e)}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500
        
    except Exception as e:
        logger.error(f"Monica chat proxy error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/monica/evaluate', methods=['POST', 'OPTIONS'])
def monica_evaluate_public():
    """
    Vyhodnocení odpovědi pomocí Monica AI (kompatibilita s original frontend)
    Bez autentifikace pro zpětnou kompatibilitu
    """
    
    # Handle preflight CORS request
    if request.method == 'OPTIONS':
        logger.info("CORS preflight request for monica/evaluate")
        return jsonify({'status': 'ok'}), 200
    
    logger.info("=== MONICA EVALUATE PUBLIC ENDPOINT CALLED ===")
    
    try:
        data = request.get_json()
        
        question = data.get('question', '')
        correct_answer = data.get('correctAnswer', '')
        user_answer = data.get('userAnswer', '')
        
        logger.info(f"Evaluate request: Q:{question[:50]}... A:{user_answer[:50]}...")
        
        if not all([question, correct_answer, user_answer]):
            logger.error("Missing required fields")
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Sestavit prompt pro AI (kompatibilní s original backend)
        prompt = f"""Vyhodnoť odpověď studenta na otázku:

OTÁZKA: {question}
SPRÁVNÁ ODPOVĚĎ: {correct_answer}
ODPOVĚĎ STUDENTA: {user_answer}

Vrať JSON formát:
{{
  "summary": "shrnutí odpovědi studenta",
  "score": číslo_0_až_100,
  "positives": ["pozitivum 1", "pozitivum 2"],
  "negatives": ["nedostatek 1", "nedostatek 2"],
  "recommendations": ["doporučení 1", "doporučení 2"],
  "grade": "A/B/C/D/F"
}}"""

        monica_request = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "system",
                    "content": "Jsi odborný examinátor. Hodnotíš odpovědi spravedlivě ale přísně. Odpovídáš pouze validním JSON formátem."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 800
        }
        
        logger.info("Calling Monica API...")
        
        # Volání Monica API
        headers = {
            'Authorization': f'Bearer {MONICA_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(MONICA_API_URL, headers=headers, json=monica_request, timeout=30)
        
        logger.info(f"Monica API response: {response.status_code}")
        
        if response.ok:
            api_response = response.json()
            ai_content = api_response['choices'][0]['message']['content']
            
            logger.info("Processing AI response...")
            
            try:
                # Pokus o parsování JSON odpovědi
                import re
                json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
                if json_match:
                    evaluation = json.loads(json_match.group())
                    evaluation['method'] = 'enhanced-backend-simple'
                    evaluation['timestamp'] = datetime.now().isoformat()
                else:
                    # Fallback odpověď
                    evaluation = {
                        "summary": ai_content,
                        "score": 75,
                        "positives": ["Odpověď obsahuje relevantní informace"],
                        "negatives": ["Může být rozvinutější"],
                        "recommendations": ["Zkuste být konkrétnější"],
                        "grade": "C",
                        "method": "enhanced-backend-simple",
                        "timestamp": datetime.now().isoformat()
                    }
                
                logger.info(f"Evaluation completed: score {evaluation.get('score', 'N/A')}")
                return jsonify(evaluation), 200
                
            except json.JSONDecodeError:
                # Fallback pokud AI nevrátí validní JSON
                logger.warning("AI response is not valid JSON, using fallback")
                evaluation = {
                    "summary": ai_content,
                    "score": 70,
                    "positives": ["Snaha o odpověď"],
                    "negatives": ["Potřebuje upřesnění"],
                    "recommendations": ["Více konkrétních detailů"],
                    "grade": "C",
                    "method": "enhanced-backend-simple",
                    "timestamp": datetime.now().isoformat()
                }
                logger.info(f"Fallback evaluation: score {evaluation.get('score', 'N/A')}")
                return jsonify(evaluation), 200
        
        else:
            logger.error(f"Monica API error: {response.status_code}")
            evaluation = {
                "summary": "Nepodařilo se vyhodnotit odpověď",
                "score": 50,
                "positives": ["Snaha o odpověď"],
                "negatives": ["Technické problémy s vyhodnocením"],
                "recommendations": ["Zkuste znovu později"],
                "grade": "C",
                "method": "enhanced-backend-fallback",
                "timestamp": datetime.now().isoformat()
            }
            return jsonify(evaluation), 200
            
    except requests.Timeout:
        logger.error("Monica API timeout")
        evaluation = {
            "summary": "Timeout při komunikaci s AI",
            "score": 50,
            "positives": ["Snaha o odpověď"],
            "negatives": ["Technické problémy - timeout"],
            "recommendations": ["Zkuste znovu"],
            "grade": "C",
            "method": "enhanced-backend-timeout",
            "timestamp": datetime.now().isoformat()
        }
        return jsonify(evaluation), 200
    except Exception as e:
        logger.error(f"Monica evaluate error: {e}")
        evaluation = {
            "summary": "Chyba při vyhodnocování",
            "score": 50,
            "positives": ["Snaha o odpověď"],
            "negatives": ["Technické problémy"],
            "recommendations": ["Zkuste znovu později"],
            "grade": "C",
            "method": "enhanced-backend-error",
            "timestamp": datetime.now().isoformat()
        }
        return jsonify(evaluation), 200

@app.route('/api/monica/test-evaluate', methods=['POST', 'OPTIONS'])
def monica_test_evaluate():
    """
    TEST endpoint pro vyhodnocení - pro debugging
    """
    
    if request.method == 'OPTIONS':
        logger.info("CORS preflight for test-evaluate")
        return jsonify({'status': 'ok'}), 200
    
    logger.info("=== TEST EVALUATE ENDPOINT CALLED ===")
    
    return jsonify({
        "summary": "Test endpoint funguje!",
        "score": 85,
        "positives": ["Test úspěšný"],
        "negatives": ["Jen test"],
        "recommendations": ["Použijte správný endpoint"],
        "grade": "A",
        "method": "test-endpoint",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/api/monica/evaluate-auth', methods=['POST'])
@require_auth
def evaluate_answer_authenticated():
    """Vyhodnocení odpovědi pomocí Monica AI"""
    try:
        user_id = request.current_user['user_id']
        
        # Kontrola přístupu k Monica API
        if not request.current_user.get('monica_access'):
            return jsonify({'error': 'Monica API access not granted for this user'}), 403
        
        data = request.get_json()
        question = data.get('question', '')
        correct_answer = data.get('correctAnswer', '')
        user_answer = data.get('userAnswer', '')
        
        if not all([question, correct_answer, user_answer]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Logování API volání
        start_time = datetime.now()
        
        try:
            # Příprava promptu pro AI
            evaluation_prompt = f"""
            Prosím, vyhodnoť tuto studentskou odpověď:
            
            OTÁZKA: {question}
            SPRÁVNÁ ODPOVĚĎ: {correct_answer}
            STUDENTOVA ODPOVĚĎ: {user_answer}
            
            Vyhodnoť odpověď a vrať JSON ve formátu:
            {{
                "je_spravna": true/false,
                "body": 0-100,
                "komentář": "podrobné vyhodnocení",
                "znamka": "1-5"
            }}
            """
            
            monica_request = {
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": evaluation_prompt}],
                "max_tokens": 500,
                "temperature": 0.3
            }
            
            headers = {
                'Authorization': f'Bearer {MONICA_API_KEY}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(MONICA_API_URL, headers=headers, json=monica_request, timeout=30)
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.ok:
                api_response = response.json()
                evaluation_text = api_response['choices'][0]['message']['content']
                
                # Pokus o parsování JSON odpovědi
                try:
                    import re
                    json_match = re.search(r'\{.*\}', evaluation_text, re.DOTALL)
                    if json_match:
                        evaluation = json.loads(json_match.group())
                    else:
                        # Fallback parsing
                        evaluation = {
                            "je_spravna": "správn" in evaluation_text.lower(),
                            "body": 50,
                            "komentář": evaluation_text,
                            "znamka": "3"
                        }
                except:
                    evaluation = {
                        "je_spravna": "správn" in evaluation_text.lower(),
                        "body": 50,
                        "komentář": evaluation_text,
                        "znamka": "3"
                    }
                
                # Logování úspěšného volání
                with db_lock:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute('''
                    INSERT INTO monica_api_calls 
                    (user_id, request_type, tokens_used, response_time_ms, success)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (user_id, 'evaluate', len(evaluation_prompt) // 4, response_time, True))
                    conn.commit()
                    conn.close()
                
                return jsonify(evaluation), 200
            
            else:
                # Logování chyby
                with db_lock:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute('''
                    INSERT INTO monica_api_calls 
                    (user_id, request_type, response_time_ms, success, error_message)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (user_id, 'evaluate', response_time, False, f"HTTP {response.status_code}"))
                    conn.commit()
                    conn.close()
                
                # Fallback local evaluation
                return create_fallback_evaluation(question, correct_answer, user_answer)
        
        except requests.Timeout:
            return create_fallback_evaluation(question, correct_answer, user_answer)
        except Exception as e:
            logger.error(f"Monica API error: {e}")
            return create_fallback_evaluation(question, correct_answer, user_answer)
        
    except Exception as e:
        logger.error(f"Evaluation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def create_fallback_evaluation(question, correct_answer, user_answer):
    """Vytvoří fallback hodnocení pokud AI selže"""
    correct_words = set(correct_answer.lower().split())
    user_words = set(user_answer.lower().split())
    
    if correct_words:
        overlap = len(correct_words.intersection(user_words))
        score = (overlap / len(correct_words)) * 100
    else:
        score = 0
    
    is_correct = score > 70
    grade = "1" if score > 90 else "2" if score > 70 else "3" if score > 50 else "4" if score > 30 else "5"
    
    return jsonify({
        "je_spravna": is_correct,
        "body": int(score),
        "komentář": f"Automatické hodnocení: {score:.1f}% shoda s klíčovými slovy správné odpovědi.",
        "znamka": grade
    }), 200

# Admin endpointy
@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_role('admin')
def get_all_users():
    """Získání seznamu všech uživatelů (admin)"""
    try:
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
            SELECT u.id, u.username, u.email, u.created_at, u.last_login, 
                   u.total_questions_answered, u.total_correct_answers, u.user_role, 
                   u.is_active, u.monica_api_access
            FROM users u
            ORDER BY u.created_at DESC
            ''')
            
            users = []
            for row in cursor.fetchall():
                users.append({
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'created_at': row[3],
                    'last_login': row[4],
                    'total_questions_answered': row[5] or 0,
                    'total_correct_answers': row[6] or 0,
                    'user_role': row[7],
                    'is_active': bool(row[8]),
                    'monica_api_access': bool(row[9])
                })
            
            conn.close()
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        logger.error(f"Get all users error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/user/<int:user_id>/monica-access', methods=['PUT'])
@require_auth
@require_role('admin')
def toggle_monica_access(user_id):
    """Udělení/odebrání přístupu k Monica API"""
    try:
        data = request.get_json()
        grant_access = data.get('grant_access', False)
        
        admin_id = request.current_user['user_id']
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Kontrola existence uživatele
            cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
            user = cursor.fetchone()
            
            if not user:
                conn.close()
                return jsonify({'error': 'User not found'}), 404
            
            # Aktualizace přístupu
            cursor.execute('UPDATE users SET monica_api_access = ? WHERE id = ?', 
                          (grant_access, user_id))
            conn.commit()
            conn.close()
        
        # Logování
        action_details = f"Monica API access {'granted' if grant_access else 'revoked'} for user {user[0]}"
        log_action(admin_id, 'MONICA_ACCESS_CHANGE', action_details, 
                  request.remote_addr, request.headers.get('User-Agent', ''))
        
        return jsonify({
            'message': f"Monica API access {'granted' if grant_access else 'revoked'} successfully",
            'user_id': user_id,
            'monica_access': grant_access
        }), 200
        
    except Exception as e:
        logger.error(f"Toggle Monica access error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/statistics', methods=['GET'])
@require_auth
@require_role('admin')
def get_admin_statistics():
    """Celkové statistiky (admin)"""
    try:
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Základní čísla
            cursor.execute('SELECT COUNT(*) FROM users')
            total_users = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM users WHERE DATE(last_login) = DATE("now")')
            active_today = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM user_results')
            total_answers = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM monica_api_calls WHERE success = 1')
            monica_calls = cursor.fetchone()[0]
            
            # Top uživatelé
            cursor.execute('''
            SELECT username, total_correct_answers, total_questions_answered
            FROM users
            WHERE total_questions_answered > 0
            ORDER BY total_correct_answers DESC
            LIMIT 10
            ''')
            
            top_users = [{'username': row[0], 'correct': row[1], 'total': row[2]}
                        for row in cursor.fetchall()]
            
            conn.close()
        
        return jsonify({
            'total_users': total_users,
            'active_today': active_today,
            'total_answers': total_answers,
            'monica_api_calls': monica_calls,
            'top_users': top_users
        }), 200
        
    except Exception as e:
        logger.error(f"Admin statistics error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ============== MONITORING API ENDPOINTS (v3.0) ==============

@app.route('/api/monitoring/users', methods=['GET'])
def get_user_monitoring_data():
    """Endpoint pro real-time monitoring uživatelů"""
    try:
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Total users
            cursor.execute('SELECT COUNT(*) FROM users')
            total_users = cursor.fetchone()[0]
            
            # Active users (logged in last 24 hours)
            cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE last_login > datetime('now', '-1 day')
            ''')
            active_users = cursor.fetchone()[0]
            
            # New users today
            cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE DATE(created_at) = DATE('now')
            ''')
            new_users_today = cursor.fetchone()[0]
            
            # Recent registrations (last 10)
            cursor.execute('''
            SELECT id, username, email, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
            ''')
            recent_registrations = [
                {
                    'id': row[0],
                    'username': row[1],
                    'email': row[2] or 'N/A',
                    'created_at': row[3]
                }
                for row in cursor.fetchall()
            ]
            
            # Recent activity (last 20)
            cursor.execute('''
            SELECT sl.timestamp, u.username, sl.action, sl.details
            FROM system_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
            WHERE sl.action IN ('USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT')
            ORDER BY sl.timestamp DESC
            LIMIT 20
            ''')
            recent_activity = [
                {
                    'timestamp': row[0],
                    'username': row[1] or 'System',
                    'action': row[2],
                    'details': row[3]
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'total_users': total_users,
                'active_users': active_users,
                'new_users_today': new_users_today,
                'recent_registrations': recent_registrations,
                'recent_activity': recent_activity,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"ERROR Monitoring data error: {e}")
        return jsonify({'error': 'Failed to get monitoring data'}), 500

# Event Storage for Real-time Monitoring (v4.0)
pending_events = []
event_lock = threading.Lock()

def add_event(event_type, data=None):
    """Add event for GUI monitoring"""
    with event_lock:
        pending_events.append({
            'type': event_type,
            'data': data or {},
            'timestamp': datetime.now().isoformat()
        })
        # Keep only last 50 events to prevent memory issues
        if len(pending_events) > 50:
            pending_events.pop(0)

@app.route('/api/monitoring/events', methods=['GET'])
def get_pending_events():
    """Get pending events for GUI (v4.0 - Event-based monitoring)"""
    try:
        with event_lock:
            events = pending_events.copy()
            pending_events.clear()  # Clear after reading
        
        return jsonify({
            'status': 'success',
            'events': events,
            'count': len(events)
        })
        
    except Exception as e:
        logger.error(f"ERROR Getting events: {e}")
        return jsonify({'error': 'Failed to get events'}), 500

@app.route('/api/monitoring/stats', methods=['GET'])
def get_monitoring_stats():
    """Endpoint pro real-time statistiky"""
    try:
        with db_lock:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Základní statistiky
            cursor.execute('SELECT COUNT(*) FROM users WHERE is_active = 1')
            active_users = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM user_results')
            total_answers = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM user_results WHERE is_correct = 1')
            correct_answers = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM monica_api_calls WHERE success = 1')
            monica_calls = cursor.fetchone()[0]
            
            # Statistiky za dnes
            cursor.execute('''
            SELECT COUNT(*) FROM user_results 
            WHERE DATE(answered_at) = DATE('now')
            ''')
            answers_today = cursor.fetchone()[0]
            
            cursor.execute('''
            SELECT COUNT(*) FROM monica_api_calls 
            WHERE DATE(timestamp) = DATE('now') AND success = 1
            ''')
            monica_calls_today = cursor.fetchone()[0]
            
            conn.close()
        
        success_rate = (correct_answers / max(total_answers, 1)) * 100
        
        return jsonify({
            'status': 'success',
            'data': {
                'active_users': active_users,
                'total_answers': total_answers,
                'correct_answers': correct_answers,
                'success_rate': round(success_rate, 1),
                'monica_calls': monica_calls,
                'answers_today': answers_today,
                'monica_calls_today': monica_calls_today,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"ERROR Monitoring stats error: {e}")
        return jsonify({'error': 'Failed to get monitoring stats'}), 500

def start_server(host='0.0.0.0', port=5000, debug=False):
    """Spustí Enhanced Flask server s podrobným logováním"""
    try:
        print(">> Starting Enhanced Quiz App Backend Server...")
        print(">> Authentication enabled (JWT)")
        print(">> Database-backed user management")
        print(">> Monica AI API integration")
        print(">> Security features enabled")
        print(">> Advanced statistics and logging")
        print()
        print(">> API Endpoints:")
        print("   POST /api/auth/register         - User registration")
        print("   POST /api/auth/login            - User login")
        print("   GET  /api/auth/profile          - User profile")
        print("   POST /api/auth/change-password  - Change password")
        print("   GET  /api/quiz/tables           - Available quiz tables")
        print("   GET  /api/quiz/questions/<table> - Questions from table")
        print("   POST /api/quiz/answer           - Save user answer")
        print("   GET  /api/user/statistics       - User statistics")
        print("   POST /api/monica/chat           - Monica AI proxy (no auth)")
        print("   POST /api/monica/evaluate       - AI answer evaluation (no auth, compatible)")
        print("   POST /api/monica/test-evaluate  - Test evaluation endpoint")
        print("   POST /api/monica/evaluate-auth  - AI answer evaluation (auth required)")
        print("   GET  /api/admin/users           - All users (admin)")
        print("   PUT  /api/admin/user/<id>/monica-access - Grant/revoke API access")
        print("   GET  /api/admin/statistics      - System statistics (admin)")
        print("   GET  /api/health                - Health check")
        print()
        print("NEW MONITORING API (v3.0):")
        print("   GET  /api/monitoring/users      - Real-time user monitoring")
        print("   GET  /api/monitoring/stats      - Real-time statistics")
        print()
        print(f">> Server available at: http://{host}:{port}")
        print(">> Main application: http://localhost:5000")
        print()
        
        # Kontrola databáze
        if not os.path.exists(DATABASE_PATH):
            print("!! Enhanced database not found!")
            print("   Please run: python create_enhanced_database.py")
            print()
        else:
            print("*** Enhanced database found")
            
            # Test database connection
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                conn.close()
                print(f"*** Database connection successful ({user_count} users)")
            except Exception as e:
                print(f"ERROR: Database connection test failed: {e}")
        
        print()
        print("*** Starting Flask server...")
        
        # Start server with error handling
        app.run(host=host, port=port, debug=debug, threaded=True)
        
    except Exception as e:
        print(f"CRITICAL ERROR: Server failed to start: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    import sys
    
    # Možnost předání portu jako argument
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number")
            sys.exit(1)
    
    start_server(port=port, debug=False)

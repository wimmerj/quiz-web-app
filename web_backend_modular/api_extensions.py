# ===============================================
# API ROUTES - BATTLE SYSTEM
# ===============================================

@app.route('/api/battle/quick-match', methods=['POST'])
@login_required
def quick_battle_match():
    """Find or create quick battle match"""
    user_id = request.current_user['user_id']
    user = User.query.get(user_id)
    
    # Find existing waiting battle or create new one
    # For now, return demo battle data
    battle_id = f"battle_{secrets.token_hex(8)}"
    
    return jsonify({
        'battle_id': battle_id,
        'mode': 'quick',
        'questions': 5,
        'time_limit': 15,
        'opponent': {
            'id': 'ai',
            'username': 'AI Protivník',
            'avatar': '🤖',
            'rating': user.battle_rating + random.randint(-100, 100)
        },
        'status': 'starting'
    })

@app.route('/api/battle/ranked-match', methods=['POST'])
@login_required
def ranked_battle_match():
    """Find ranked battle opponent"""
    user_id = request.current_user['user_id']
    user = User.query.get(user_id)
    
    # Find opponent with similar rating (±200 points)
    rating_min = user.battle_rating - 200
    rating_max = user.battle_rating + 200
    
    potential_opponents = User.query.filter(
        User.id != user_id,
        User.battle_rating.between(rating_min, rating_max),
        User.is_active == True
    ).limit(5).all()
    
    if not potential_opponents:
        return jsonify({'error': 'No opponents found in your rating range'}), 404
    
    opponent = random.choice(potential_opponents)
    battle_id = f"ranked_{secrets.token_hex(8)}"
    
    return jsonify({
        'battle_id': battle_id,
        'mode': 'ranked',
        'questions': 10,
        'time_limit': 20,
        'opponent': {
            'id': opponent.id,
            'username': opponent.username,
            'avatar': opponent.avatar,
            'rating': opponent.battle_rating
        },
        'rating_change_preview': calculate_rating_change(user.battle_rating, opponent.battle_rating),
        'status': 'waiting_for_opponent'
    })

@app.route('/api/battle/submit-result', methods=['POST'])
@login_required
def submit_battle_result():
    """Submit battle result"""
    data = request.get_json()
    user_id = request.current_user['user_id']
    
    if not data or not all(k in data for k in ('battle_id', 'score', 'questions_correct', 'is_winner')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Save battle result
    battle_result = BattleResult(
        battle_id=data['battle_id'],
        user_id=user_id,
        opponent_id=data.get('opponent_id'),
        mode=data.get('mode', 'quick'),
        score=data['score'],
        questions_correct=data['questions_correct'],
        total_questions=data.get('total_questions', 5),
        is_winner=data['is_winner']
    )
    
    # Update user rating if ranked
    if data.get('mode') == 'ranked':
        user = User.query.get(user_id)
        rating_change = calculate_rating_change(user.battle_rating, data.get('opponent_rating', 1500))
        
        if data['is_winner']:
            user.battle_rating += rating_change
            user.battle_wins += 1
        else:
            user.battle_rating -= rating_change
            user.battle_losses += 1
        
        battle_result.rating_change = rating_change if data['is_winner'] else -rating_change
    
    db.session.add(battle_result)
    db.session.commit()
    
    return jsonify({
        'message': 'Battle result saved',
        'rating_change': battle_result.rating_change,
        'new_rating': User.query.get(user_id).battle_rating
    })

@app.route('/api/battle/leaderboard', methods=['GET'])
@login_required
def battle_leaderboard():
    """Get battle leaderboard"""
    period = request.args.get('period', 'all')  # all, week, month
    
    query = User.query.filter(User.battle_rating > 1000)
    
    if period == 'week':
        # Filter by battles in last week - simplified for demo
        query = query.order_by(User.battle_wins.desc())
    elif period == 'month':
        # Filter by battles in last month - simplified for demo
        query = query.order_by(User.battle_wins.desc())
    else:
        query = query.order_by(User.battle_rating.desc())
    
    users = query.limit(50).all()
    current_user_rank = None
    
    # Find current user rank
    for idx, user in enumerate(users):
        if user.id == request.current_user['user_id']:
            current_user_rank = idx + 1
            break
    
    leaderboard = []
    for idx, user in enumerate(users):
        leaderboard.append({
            'rank': idx + 1,
            'username': user.username,
            'avatar': user.avatar,
            'rating': user.battle_rating,
            'wins': user.battle_wins,
            'losses': user.battle_losses,
            'win_rate': round((user.battle_wins / max(user.battle_wins + user.battle_losses, 1)) * 100, 1)
        })
    
    return jsonify({
        'leaderboard': leaderboard,
        'current_user_rank': current_user_rank,
        'total_players': len(users)
    })

def calculate_rating_change(user_rating, opponent_rating, k_factor=32):
    """Calculate Elo rating change"""
    expected_score = 1 / (1 + 10 ** ((opponent_rating - user_rating) / 400))
    rating_change = int(k_factor * (1 - expected_score))
    return max(5, min(rating_change, 50))  # Limit between 5-50

# ===============================================
# API ROUTES - ORAL EXAM SYSTEM
# ===============================================

@app.route('/api/oral-exam/start', methods=['POST'])
@login_required
def start_oral_exam():
    """Start oral examination"""
    data = request.get_json()
    
    if not data or 'table_name' not in data:
        return jsonify({'error': 'Missing table_name'}), 400
    
    # Get random question
    question = Question.query.filter_by(table_name=data['table_name']).order_by(db.func.random()).first()
    
    if not question:
        return jsonify({'error': 'No questions found'}), 404
    
    return jsonify({
        'exam_id': f"oral_{secrets.token_hex(8)}",
        'question': {
            'id': question.id,
            'text': question.question_text,
            'expected_answer': question.explanation or f"Správná odpověď je {['A', 'B', 'C'][question.correct_answer]}: {[question.answer_a, question.answer_b, question.answer_c][question.correct_answer]}",
            'difficulty': question.difficulty,
            'category': question.category
        },
        'time_limit': 120,  # 2 minutes
        'instructions': 'Odpovězte na otázku mluvením do mikrofonu. Máte 2 minuty na odpověď.'
    })

@app.route('/api/oral-exam/submit-audio', methods=['POST'])
@login_required
def submit_oral_audio():
    """Submit audio for oral exam evaluation"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ('question_id', 'transcript')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    question = Question.query.get(data['question_id'])
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    # Get correct answer text
    correct_answer = [question.answer_a, question.answer_b, question.answer_c][question.correct_answer]
    
    # Evaluate using Monica AI if available
    if MONICA_ENABLED:
        try:
            ai_response = monica_ai.evaluate_oral_answer(
                question.question_text,
                correct_answer,
                data['transcript']
            )
            
            if 'error' not in ai_response:
                ai_evaluation = ai_response.get('choices', [{}])[0].get('message', {}).get('content', '{}')
                try:
                    evaluation_data = json.loads(ai_evaluation)
                except json.JSONDecodeError:
                    evaluation_data = {
                        "score": 50,
                        "feedback": "Nepodařilo se automaticky vyhodnotit odpověď",
                        "pronunciation_score": 70,
                        "grammar_score": 70,
                        "content_score": 50
                    }
            else:
                evaluation_data = {
                    "score": 50,
                    "feedback": "Monica AI není dostupná pro vyhodnocení",
                    "pronunciation_score": 70,
                    "grammar_score": 70,
                    "content_score": 50
                }
        except Exception as e:
            evaluation_data = {
                "score": 50,
                "feedback": f"Chyba při vyhodnocování: {str(e)}",
                "pronunciation_score": 70,
                "grammar_score": 70,
                "content_score": 50
            }
    else:
        # Simple keyword-based evaluation
        transcript_lower = data['transcript'].lower()
        correct_lower = correct_answer.lower()
        
        # Simple scoring based on keyword matching
        keywords = correct_lower.split()
        matches = sum(1 for word in keywords if word in transcript_lower)
        score = min(100, (matches / len(keywords)) * 100) if keywords else 50
        
        evaluation_data = {
            "score": int(score),
            "feedback": f"Automatické vyhodnocení na základě klíčových slov. Skóre: {int(score)}/100",
            "pronunciation_score": 75,
            "grammar_score": 75,
            "content_score": int(score)
        }
    
    # Save oral exam result
    oral_exam = OralExam(
        user_id=request.current_user['user_id'],
        question_id=data['question_id'],
        audio_transcript=data['transcript'],
        ai_evaluation=json.dumps(evaluation_data),
        score=evaluation_data.get('score', 50),
        feedback=evaluation_data.get('feedback', ''),
        pronunciation_score=evaluation_data.get('pronunciation_score', 75),
        grammar_score=evaluation_data.get('grammar_score', 75)
    )
    
    db.session.add(oral_exam)
    
    # Track Monica usage if used
    if MONICA_ENABLED:
        monica_usage = MonicaUsage(
            user_id=request.current_user['user_id'],
            feature='oral_exam',
            tokens_used=len(data['transcript']) // 4,  # Rough estimate
            cost=0.002  # Approximate cost
        )
        db.session.add(monica_usage)
    
    db.session.commit()
    
    return jsonify({
        'evaluation': evaluation_data,
        'exam_id': data.get('exam_id'),
        'question': {
            'text': question.question_text,
            'correct_answer': correct_answer,
            'explanation': question.explanation
        }
    })

@app.route('/api/oral-exam/history', methods=['GET'])
@login_required
def oral_exam_history():
    """Get user's oral exam history"""
    exams = OralExam.query.filter_by(user_id=request.current_user['user_id']).order_by(OralExam.timestamp.desc()).limit(50).all()
    
    history = []
    for exam in exams:
        question = Question.query.get(exam.question_id)
        evaluation = json.loads(exam.ai_evaluation) if exam.ai_evaluation else {}
        
        history.append({
            'id': exam.id,
            'timestamp': exam.timestamp.isoformat(),
            'question': question.question_text if question else 'Otázka nebyla nalezena',
            'score': exam.score,
            'pronunciation_score': exam.pronunciation_score,
            'grammar_score': exam.grammar_score,
            'feedback': exam.feedback,
            'transcript': exam.audio_transcript
        })
    
    return jsonify({
        'history': history,
        'stats': {
            'total_exams': len(history),
            'average_score': sum(h['score'] for h in history) / len(history) if history else 0,
            'best_score': max(h['score'] for h in history) if history else 0
        }
    })

# ===============================================
# API ROUTES - ADMIN PANEL
# ===============================================

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    """Get admin dashboard statistics"""
    stats = {
        'users': {
            'total': User.query.count(),
            'active': User.query.filter_by(is_active=True).count(),
            'admins': User.query.filter_by(role='admin').count(),
            'new_today': User.query.filter(User.created_at >= datetime.utcnow().date()).count()
        },
        'questions': {
            'total': Question.query.count(),
            'by_difficulty': {
                'easy': Question.query.filter_by(difficulty='easy').count(),
                'medium': Question.query.filter_by(difficulty='medium').count(),
                'hard': Question.query.filter_by(difficulty='hard').count()
            },
            'tables': Question.query.with_entities(Question.table_name).distinct().count()
        },
        'quiz_activity': {
            'total_answers': QuizProgress.query.count(),
            'correct_answers': QuizProgress.query.filter_by(is_correct=True).count(),
            'today_answers': QuizProgress.query.filter(QuizProgress.timestamp >= datetime.utcnow().date()).count()
        },
        'battles': {
            'total': BattleResult.query.count(),
            'today': BattleResult.query.filter(BattleResult.timestamp >= datetime.utcnow().date()).count(),
            'by_mode': {
                'quick': BattleResult.query.filter_by(mode='quick').count(),
                'ranked': BattleResult.query.filter_by(mode='ranked').count()
            }
        },
        'oral_exams': {
            'total': OralExam.query.count(),
            'average_score': db.session.query(db.func.avg(OralExam.score)).scalar() or 0,
            'today': OralExam.query.filter(OralExam.timestamp >= datetime.utcnow().date()).count()
        },
        'system': {
            'monica_enabled': MONICA_ENABLED,
            'monica_usage_today': MonicaUsage.query.filter(MonicaUsage.timestamp >= datetime.utcnow().date()).count() if MONICA_ENABLED else 0,
            'database_size': get_database_size(),
            'uptime': 'Running'
        }
    }
    
    return jsonify(stats)

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    """Get users list for admin"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = User.query
    
    if search:
        query = query.filter(
            db.or_(
                User.username.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    users = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'users': [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'avatar': user.avatar,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'is_active': user.is_active,
            'battle_rating': user.battle_rating,
            'quiz_count': QuizProgress.query.filter_by(user_id=user.id).count(),
            'battle_count': BattleResult.query.filter_by(user_id=user.id).count()
        } for user in users.items],
        'pagination': {
            'page': users.page,
            'pages': users.pages,
            'per_page': users.per_page,
            'total': users.total,
            'has_next': users.has_next,
            'has_prev': users.has_prev
        }
    })

@app.route('/api/admin/questions', methods=['GET', 'POST'])
@admin_required
def admin_questions():
    """Manage questions"""
    if request.method == 'GET':
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        table_name = request.args.get('table_name')
        
        query = Question.query
        
        if table_name:
            query = query.filter_by(table_name=table_name)
        
        questions = query.order_by(Question.id.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'questions': [{
                'id': q.id,
                'table_name': q.table_name,
                'question_text': q.question_text,
                'answer_a': q.answer_a,
                'answer_b': q.answer_b,
                'answer_c': q.answer_c,
                'correct_answer': q.correct_answer,
                'difficulty': q.difficulty,
                'category': q.category,
                'created_at': q.created_at.isoformat()
            } for q in questions.items],
            'pagination': {
                'page': questions.page,
                'pages': questions.pages,
                'per_page': questions.per_page,
                'total': questions.total
            }
        })
    
    elif request.method == 'POST':
        data = request.get_json()
        
        if not data or not all(k in data for k in ('table_name', 'question_text', 'answer_a', 'answer_b', 'answer_c', 'correct_answer')):
            return jsonify({'error': 'Missing required fields'}), 400
        
        question = Question(
            table_name=data['table_name'],
            question_text=data['question_text'],
            answer_a=data['answer_a'],
            answer_b=data['answer_b'],
            answer_c=data['answer_c'],
            correct_answer=data['correct_answer'],
            explanation=data.get('explanation'),
            difficulty=data.get('difficulty', 'medium'),
            category=data.get('category')
        )
        
        db.session.add(question)
        db.session.commit()
        
        return jsonify({
            'message': 'Question created successfully',
            'question_id': question.id
        }), 201

@app.route('/api/admin/system-logs', methods=['GET'])
@admin_required
def admin_system_logs():
    """Get system logs"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    logs = SystemLog.query.order_by(SystemLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'logs': [{
            'id': log.id,
            'user_id': log.user_id,
            'username': User.query.get(log.user_id).username if log.user_id else 'System',
            'action': log.action,
            'details': log.details,
            'ip_address': log.ip_address,
            'timestamp': log.timestamp.isoformat()
        } for log in logs.items],
        'pagination': {
            'page': logs.page,
            'pages': logs.pages,
            'per_page': logs.per_page,
            'total': logs.total
        }
    })

# ===============================================
# API ROUTES - SETTINGS
# ===============================================

@app.route('/api/settings', methods=['GET', 'PUT'])
@login_required
def user_settings():
    """Get or update user settings"""
    user = User.query.get(request.current_user['user_id'])
    
    if request.method == 'GET':
        settings = json.loads(user.settings) if user.settings else {}
        return jsonify({'settings': settings})
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No settings data provided'}), 400
        
        # Merge with existing settings
        current_settings = json.loads(user.settings) if user.settings else {}
        current_settings.update(data.get('settings', {}))
        
        user.settings = json.dumps(current_settings)
        
        # Update profile fields if provided
        if 'avatar' in data:
            user.avatar = data['avatar']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': current_settings
        })

# ===============================================
# HELPER FUNCTIONS
# ===============================================

def get_database_size():
    """Get database size (simplified)"""
    try:
        result = db.session.execute('SELECT pg_size_pretty(pg_database_size(current_database()))')
        return result.scalar()
    except:
        return 'Unknown'

# ===============================================
# WEBSOCKET SUPPORT (for real-time features)
# ===============================================

# Note: For production, you'd want to use Flask-SocketIO
# This is a simplified implementation

@app.route('/api/websocket/info', methods=['GET'])
def websocket_info():
    """WebSocket connection info"""
    return jsonify({
        'websocket_url': os.environ.get('WEBSOCKET_URL', 'ws://localhost:5000/ws'),
        'features': ['battle_real_time', 'notifications', 'live_updates']
    })

# Import additional modules if needed
import random
import string

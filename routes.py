from flask import render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Debate
from gemini_service import generate_legal_arguments
import logging


login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        recent_debates = Debate.query.filter_by(user_id=current_user.id).order_by(Debate.created_at.desc()).limit(5).all()
        return render_template('index.html', recent_debates=recent_debates)
    return render_template('index.html')

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if action == 'login':
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password_hash, password):
                login_user(user)
                flash('Logged in successfully!', 'success')
                return redirect(url_for('index'))
            else:
                flash('Invalid username or password', 'error')
        
        elif action == 'signup':
            
            if User.query.filter_by(username=username).first():
                flash('Username already exists', 'error')
            elif User.query.filter_by(email=email).first():
                flash('Email already registered', 'error')
            else:
                
                user = User(
                    username=username,
                    email=email,
                    password_hash=generate_password_hash(password)
                )
                db.session.add(user)
                db.session.commit()
                login_user(user)
                flash('Account created successfully!', 'success')
                return redirect(url_for('index'))
    
    return render_template('auth.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully!', 'info')
    return redirect(url_for('index'))

@app.route('/generate', methods=['POST'])
@login_required
def generate():
    topic = request.form.get('topic')
    if not topic:
        flash('Please enter a legal topic', 'error')
        return redirect(url_for('index'))
    
    try:
        
        arguments = generate_legal_arguments(topic)
        
        
        debate = Debate(
            user_id=current_user.id,
            topic=topic,
            pro_argument=arguments['pro'],
            con_argument=arguments['con']
        )
        db.session.add(debate)
        db.session.commit()
        
        return render_template('workplace.html', 
                             topic=topic, 
                             pro_argument=arguments['pro'],
                             con_argument=arguments['con'])
    
    except Exception as e:
        logging.error(f"Error generating arguments: {e}")
        flash('Error generating arguments. Please try again.', 'error')
        return redirect(url_for('index'))

@app.route('/workplace')
@login_required
def workplace():
    debate_id = request.args.get('id')
    if debate_id:
        debate = Debate.query.filter_by(id=debate_id, user_id=current_user.id).first()
        if debate:
            return render_template('workplace.html',
                                 topic=debate.topic,
                                 pro_argument=debate.pro_argument,
                                 con_argument=debate.con_argument)
    
    return redirect(url_for('index'))

@app.route('/history')
@login_required
def history():
    debates = Debate.query.filter_by(user_id=current_user.id).order_by(Debate.created_at.desc()).all()
    return render_template('history.html', debates=debates)

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

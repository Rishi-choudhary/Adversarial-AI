import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "pixel-legal-hackathon-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///legal_debate.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

with app.app_context():
    # Import models here so their tables will be created
    import models  # noqa: F401
    db.create_all()
    logging.info("Database tables created")
    
    # Initialize simple legal knowledge base
    try:
        from simple_knowledge_base import initialize_simple_legal_knowledge
        initialize_simple_legal_knowledge()
        logging.info("Simple legal knowledge base initialized")
    except Exception as e:
        logging.warning(f"Failed to initialize knowledge base: {e}")

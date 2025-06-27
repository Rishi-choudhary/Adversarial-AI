#!/usr/bin/env python3
"""
Test script for full application integration
"""

import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import Flask app for testing
from app import app, db
from models import User, Debate
from gemini_service import generate_legal_arguments
from werkzeug.security import generate_password_hash

def test_full_integration():
    """Test the full application integration"""
    print("Testing Full Application Integration...")
    
    with app.app_context():
        # Create a test user
        test_user = User(
            username="testuser",
            email="test@example.com",
            password_hash=generate_password_hash("testpassword")
        )
        
        try:
            db.session.add(test_user)
            db.session.commit()
            print("✅ Test user created successfully")
        except Exception as e:
            print(f"ℹ️  Test user already exists or error: {e}")
            # Try to get existing user
            test_user = User.query.filter_by(username="testuser").first()
            if not test_user:
                print("❌ Failed to create or find test user")
                return False
        
        # Test argument generation with different topics
        test_topics = [
            "Should the death penalty be abolished in India?",
            "Is Article 370 abrogation constitutional?",
            "Should there be uniform civil code in India?",
            "Is privacy a fundamental right under Article 21?"
        ]
        
        for topic in test_topics:
            print(f"\n🔍 Testing argument generation for: '{topic}'")
            
            try:
                # Generate arguments
                arguments = generate_legal_arguments(topic)
                
                if arguments and 'pro' in arguments and 'con' in arguments:
                    print("✅ Arguments generated successfully")
                    
                    # Save to database
                    new_debate = Debate(
                        user_id=test_user.id,
                        topic=topic,
                        pro_argument=arguments['pro'],
                        con_argument=arguments['con']
                    )
                    
                    db.session.add(new_debate)
                    db.session.commit()
                    
                    print(f"💾 Debate saved to database (ID: {new_debate.id})")
                    
                    # Show preview of arguments
                    print(f"📝 Pro preview: {arguments['pro'][:150]}...")
                    print(f"📝 Con preview: {arguments['con'][:150]}...")
                    
                else:
                    print("❌ Failed to generate arguments")
                    print(f"Response: {arguments}")
                
            except Exception as e:
                print(f"❌ Error generating arguments: {e}")
                import traceback
                traceback.print_exc()
        
        # Test database queries
        print(f"\n📊 Database Statistics:")
        total_users = User.query.count()
        total_debates = Debate.query.count()
        user_debates = Debate.query.filter_by(user_id=test_user.id).count()
        
        print(f"  - Total users: {total_users}")
        print(f"  - Total debates: {total_debates}")
        print(f"  - Test user debates: {user_debates}")
        
        # Test recent debates
        recent_debates = Debate.query.order_by(Debate.created_at.desc()).limit(3).all()
        print(f"\n🕒 Recent debates:")
        for debate in recent_debates:
            print(f"  - {debate.topic[:50]}... (User: {debate.user.username})")
        
        return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    try:
        success = test_full_integration()
        if success:
            print("\n🎉 Full integration test completed successfully!")
        else:
            print("\n💥 Integration test failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
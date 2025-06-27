#!/usr/bin/env python3
"""
Test script for Simple Legal Knowledge Base
"""

import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simple_knowledge_base import get_simple_legal_knowledge_base

def test_simple_kb():
    """Test the Simple Legal Knowledge Base"""
    print("Testing Simple Legal Knowledge Base...")
    
    # Initialize knowledge base
    kb = get_simple_legal_knowledge_base()
    
    if not kb.is_initialized:
        print("❌ Knowledge base failed to initialize")
        return False
    
    print("✅ Knowledge base initialized successfully")
    
    # Test query functionality
    test_queries = [
        "right to privacy",
        "freedom of speech",
        "constitutional rights",
        "criminal law murder",
        "consumer protection",
        "environmental law",
        "sexual harassment workplace"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Testing query: '{query}'")
        
        # Get legal context
        context = kb.get_legal_context_for_topic(query, max_results=2)
        
        if context and "No relevant legal precedents found" not in context:
            print(f"✅ Found relevant context (length: {len(context)} chars)")
            
            # Show first few lines of context
            lines = context.split('\n')[:5]
            print(f"📄 Preview:\n" + '\n'.join(lines))
        else:
            print("❌ No relevant context found")
        
        # Test direct query
        results = kb.query_legal_knowledge(query, n_results=2)
        print(f"📊 Direct query returned {len(results)} results")
        
        if results:
            best_result = results[0]
            print(f"🏆 Best match: {best_result['metadata']['title']} (similarity: {best_result['similarity']:.3f})")
    
    # Test category search
    print(f"\n📂 Available categories: {kb.get_categories()}")
    
    # Test category-specific search
    constitutional_docs = kb.search_by_category("Constitutional Law", n_results=3)
    print(f"📋 Found {len(constitutional_docs)} constitutional law documents")
    
    if constitutional_docs:
        for doc in constitutional_docs:
            print(f"  - {doc['metadata']['title']}")
    
    return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    try:
        success = test_simple_kb()
        if success:
            print("\n🎉 Simple Knowledge Base test completed successfully!")
        else:
            print("\n💥 Knowledge Base test failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
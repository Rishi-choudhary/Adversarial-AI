#!/usr/bin/env python3
"""
Test script for ChromaDB legal knowledge base
"""

import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from chroma_service import get_legal_knowledge_base

def test_chroma_kb():
    """Test the ChromaDB legal knowledge base"""
    print("Testing ChromaDB Legal Knowledge Base...")
    
    # Initialize knowledge base
    kb = get_legal_knowledge_base()
    
    if not kb.is_initialized:
        print("❌ ChromaDB failed to initialize")
        return False
    
    print("✅ ChromaDB initialized successfully")
    
    # Test query functionality
    test_queries = [
        "right to privacy",
        "freedom of speech",
        "constitutional rights",
        "criminal law murder",
        "consumer protection"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Testing query: '{query}'")
        
        # Get legal context
        context = kb.get_legal_context_for_topic(query, max_results=2)
        
        if context and "No relevant legal precedents found" not in context:
            print(f"✅ Found relevant context (length: {len(context)} chars)")
            print(f"📄 Preview: {context[:200]}...")
        else:
            print("❌ No relevant context found")
    
    # Test category search
    print(f"\n📂 Available categories: {kb.get_categories()}")
    
    # Test category-specific search
    constitutional_docs = kb.search_by_category("Constitutional Law", n_results=2)
    print(f"📋 Found {len(constitutional_docs)} constitutional law documents")
    
    return True

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    try:
        success = test_chroma_kb()
        if success:
            print("\n🎉 ChromaDB test completed successfully!")
        else:
            print("\n💥 ChromaDB test failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
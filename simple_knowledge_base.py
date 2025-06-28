import os
import json
import logging
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleIndianLegalKnowledgeBase:
    """
    Simple knowledge base for Indian Laws and Acts using TF-IDF similarity
    """
    
    def __init__(self):
        """Initialize the knowledge base"""
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True
        )
        self.legal_documents = self._load_indian_legal_knowledge()
        self.document_vectors = None
        self.is_initialized = False
        
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Initialize the knowledge base with TF-IDF vectors"""
        try:
            # Prepare documents for vectorization
            documents = [doc["content"] for doc in self.legal_documents]
            
            # Create TF-IDF vectors
            self.document_vectors = self.vectorizer.fit_transform(documents)
            self.is_initialized = True
            
            logger.info(f"Simple knowledge base initialized with {len(self.legal_documents)} documents")
            
        except Exception as e:
            logger.error(f"Failed to initialize knowledge base: {e}")
            self.is_initialized = False
    
    def _load_indian_legal_knowledge(self) -> List[Dict[str, Any]]:
        """Load comprehensive Indian legal knowledge from a JSON file"""
        try:
            with open('legal_database.json', 'r', encoding='utf-8') as file:
                return json.load(file)
        except Exception as e:
            logger.error(f"Failed to load legal knowledge from JSON file: {e}")
            return []
    
    def query_legal_knowledge(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query the legal knowledge base for relevant documents"""
        if not self.is_initialized:
            logger.error("Knowledge base not initialized")
            return []
        
        try:
            # Create query vector
            query_vector = self.vectorizer.transform([query])
            
            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.document_vectors).flatten()
            
            # Get top results
            top_indices = similarities.argsort()[-n_results:][::-1]
            
            # Format results
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.05:  # Minimum similarity threshold
                    doc = self.legal_documents[idx]
                    results.append({
                        "content": doc["content"],
                        "metadata": {
                            "title": doc["title"],
                            "category": doc["category"],
                            "act": doc["act"],
                            "keywords": ",".join(doc["keywords"])
                        },
                        "similarity": float(similarities[idx])
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to query knowledge base: {e}")
            return []
    
    def get_legal_context_for_topic(self, topic: str, max_results: int = 3) -> str:
        """Get relevant legal context for a given topic"""
        try:
            results = self.query_legal_knowledge(topic, n_results=max_results)
            
            if not results:
                return "No relevant legal precedents found in the knowledge base."
            
            context_parts = []
            for result in results:
                metadata = result["metadata"]
                content = result["content"]
                similarity = result["similarity"]
                
                context_part = f"""
**{metadata.get('title', 'Legal Provision')}** (Relevance: {similarity:.2f})
*{metadata.get('act', 'Legal Act')} - {metadata.get('category', 'Legal Category')}*

{content[:600]}...

---
"""
                context_parts.append(context_part)
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to get legal context: {e}")
            return "Error retrieving legal context from knowledge base."
    
    def search_by_category(self, category: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search legal documents by category"""
        try:
            results = []
            for doc in self.legal_documents:
                if doc["category"].lower() == category.lower():
                    results.append({
                        "content": doc["content"],
                        "metadata": {
                            "title": doc["title"],
                            "category": doc["category"],
                            "act": doc["act"],
                            "keywords": ",".join(doc["keywords"])
                        }
                    })
                    
                    if len(results) >= n_results:
                        break
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search by category: {e}")
            return []
    
    def get_categories(self) -> List[str]:
        """Get all available legal categories"""
        try:
            return list(set(doc["category"] for doc in self.legal_documents))
        except Exception as e:
            logger.error(f"Failed to get categories: {e}")
            return []

# Global instance
simple_legal_kb = None

def get_simple_legal_knowledge_base():
    """Get or create the simple legal knowledge base instance"""
    global simple_legal_kb
    if simple_legal_kb is None:
        simple_legal_kb = SimpleIndianLegalKnowledgeBase()
    return simple_legal_kb

def initialize_simple_legal_knowledge():
    """Initialize the simple legal knowledge base"""
    return get_simple_legal_knowledge_base()
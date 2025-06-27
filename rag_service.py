import json
import os
import logging
import re
from typing import List, Dict

# Simplified RAG without external dependencies
# Global variable to cache cases
_cached_cases = None

def simple_text_similarity(query: str, text: str) -> float:
    """
    Simple keyword-based similarity scoring
    """
    query_words = set(re.findall(r'\w+', query.lower()))
    text_words = set(re.findall(r'\w+', text.lower()))
    
    if not query_words:
        return 0.0
    
    intersection = query_words.intersection(text_words)
    return len(intersection) / len(query_words)

def initialize_knowledge_base():
    """
    Load legal knowledge from JSON file (with caching)
    """
    global _cached_cases
    
    if _cached_cases is not None:
        return _cached_cases
        
    try:
        with open('legal_knowledge.json', 'r') as f:
            legal_data = json.load(f)
        
        _cached_cases = legal_data['cases']
        logging.info(f"Loaded knowledge base with {len(_cached_cases)} legal cases")
        return _cached_cases
        
    except Exception as e:
        logging.error(f"Error loading knowledge base: {e}")
        _cached_cases = []
        return _cached_cases

def get_relevant_context(query: str, max_results: int = 3) -> str:
    """
    Retrieve relevant legal context for a given query using simple keyword matching
    """
    try:
        cases = initialize_knowledge_base()
        if not cases:
            return "No legal context available."
        
        # Score each case based on keyword similarity
        scored_cases = []
        for case in cases:
            title_score = simple_text_similarity(query, case['title'])
            summary_score = simple_text_similarity(query, case['summary'])
            area_score = simple_text_similarity(query, case['area'])
            
            # Weighted scoring
            total_score = (title_score * 2) + (summary_score * 3) + (area_score * 1)
            
            if total_score > 0:
                scored_cases.append((total_score, case))
        
        # Sort by score and take top results
        scored_cases.sort(key=lambda x: x[0], reverse=True)
        top_cases = scored_cases[:max_results]
        
        if not top_cases:
            return "No relevant legal context found for this query."
        
        # Format context
        context_parts = []
        for score, case in top_cases:
            context_parts.append(
                f"Case: {case['title']} ({case['year']}) - {case['area']}\n"
                f"Summary: {case['summary']}"
            )
        
        return "\n\n".join(context_parts)
        
    except Exception as e:
        logging.error(f"Error retrieving context: {e}")
        return "Error retrieving legal context."
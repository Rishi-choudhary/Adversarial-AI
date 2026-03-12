# Converter module for HTML preprocessing and Gemini API integration
from .html_preprocessor import preprocess_html, HTMLPreprocessor

try:
    from .gemini_client import GeminiClient
    __all__ = ['preprocess_html', 'HTMLPreprocessor', 'GeminiClient']
except ImportError:
    # google-generativeai not installed
    __all__ = ['preprocess_html', 'HTMLPreprocessor']

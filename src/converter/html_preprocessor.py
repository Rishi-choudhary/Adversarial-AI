"""
HTML Preprocessor Module - Token Saver (Section 17)

Preprocesses HTML before ANY Gemini API call to reduce token usage by 60-70%.
This is critical for cost efficiency and performance.

Rules:
- Never pass raw HTML to Gemini. Always preprocess first.
- This single step can save 50-70% of token costs.
"""

import re
import logging
from typing import Optional
from bs4 import BeautifulSoup, Comment

logger = logging.getLogger(__name__)


def preprocess_html(raw_html: str) -> str:
    """
    Preprocess HTML to reduce token usage by 60-70%.
    
    Operations performed:
    1. Strip script, style, noscript, iframe tags
    2. Remove data-*, aria-* attributes and inline styles
    3. Replace SVG path data with placeholder
    4. Replace base64 images with placeholder
    
    Args:
        raw_html: Raw HTML string from web page
        
    Returns:
        Preprocessed HTML with reduced token count
    """
    preprocessor = HTMLPreprocessor()
    return preprocessor.preprocess(raw_html)


class HTMLPreprocessor:
    """
    HTML Preprocessor class for reducing token count before Gemini API calls.
    
    This is a critical token-saving component that should be used before
    any LLM API call to maximize cost efficiency.
    """
    
    # Tags to completely remove (they waste tokens)
    TAGS_TO_REMOVE = ['script', 'style', 'noscript', 'iframe']
    
    # Attribute prefixes to remove
    ATTR_PREFIXES_TO_REMOVE = ['data-', 'aria-']
    
    # Additional attributes to always remove
    ATTRS_TO_REMOVE = ['style', 'onclick', 'onload', 'onerror', 'onmouseover']
    
    # Placeholder for SVG content
    SVG_PLACEHOLDER = '[SVG_CONTENT]'
    
    # Placeholder for base64 images
    BASE64_PLACEHOLDER = '[BASE64_IMAGE]'
    
    def __init__(self):
        """Initialize the HTMLPreprocessor."""
        self._original_length = 0
        self._processed_length = 0
    
    def preprocess(self, raw_html: str) -> str:
        """
        Main preprocessing function to reduce HTML token count.
        
        Args:
            raw_html: Raw HTML string
            
        Returns:
            Preprocessed HTML string with reduced tokens
        """
        if not raw_html:
            return ""
        
        self._original_length = len(raw_html)
        
        try:
            soup = BeautifulSoup(raw_html, 'html.parser')
            
            # Step 1: Remove HTML comments
            self._remove_comments(soup)
            
            # Step 2: Strip elements that waste tokens
            self._remove_unwanted_tags(soup)
            
            # Step 3: Strip attributes that waste tokens
            self._remove_unwanted_attributes(soup)
            
            # Step 4: Replace SVG path data with placeholder
            self._replace_svg_content(soup)
            
            # Step 5: Replace base64 image data with placeholder
            self._replace_base64_images(soup)
            
            # Get processed HTML
            processed_html = str(soup)
            self._processed_length = len(processed_html)
            
            # Log token savings
            savings = self.get_token_savings()
            logger.info(f"HTML preprocessing complete. Token savings: {savings:.1f}%")
            
            return processed_html
            
        except Exception as e:
            logger.error(f"HTML preprocessing failed: {e}")
            # Return original HTML if preprocessing fails
            return raw_html
    
    def _remove_comments(self, soup: BeautifulSoup) -> None:
        """Remove all HTML comments."""
        for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()
    
    def _remove_unwanted_tags(self, soup: BeautifulSoup) -> None:
        """Remove script, style, noscript, iframe tags completely."""
        for tag_name in self.TAGS_TO_REMOVE:
            for tag in soup.find_all(tag_name):
                tag.decompose()
    
    def _remove_unwanted_attributes(self, soup: BeautifulSoup) -> None:
        """
        Remove data-*, aria-* attributes, inline styles, and event handlers.
        These attributes waste tokens and aren't needed for section analysis.
        """
        for element in soup.find_all(True):  # Find all tags
            if element.attrs:
                # Get list of attributes to remove
                attrs_to_remove = []
                
                for attr in list(element.attrs.keys()):
                    # Check if attribute starts with unwanted prefix
                    should_remove = any(
                        attr.startswith(prefix) 
                        for prefix in self.ATTR_PREFIXES_TO_REMOVE
                    )
                    
                    # Check if attribute is in the list of attributes to always remove
                    if attr in self.ATTRS_TO_REMOVE:
                        should_remove = True
                    
                    if should_remove:
                        attrs_to_remove.append(attr)
                
                # Remove the marked attributes
                for attr in attrs_to_remove:
                    del element[attr]
    
    def _replace_svg_content(self, soup: BeautifulSoup) -> None:
        """
        Replace SVG path data with placeholder to save massive tokens.
        SVG path data can be extremely long and isn't needed for analysis.
        """
        for svg in soup.find_all('svg'):
            # Clear all children and replace with placeholder
            svg.clear()
            svg.string = self.SVG_PLACEHOLDER
    
    def _replace_base64_images(self, soup: BeautifulSoup) -> None:
        """
        Replace base64 image data with placeholder.
        Base64 images are very long and waste tokens.
        """
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if src.startswith('data:'):
                img['src'] = self.BASE64_PLACEHOLDER
    
    def get_token_savings(self) -> float:
        """
        Calculate percentage of tokens saved by preprocessing.
        
        Returns:
            Percentage of tokens saved (0-100)
        """
        if self._original_length == 0:
            return 0.0
        
        savings = (1 - (self._processed_length / self._original_length)) * 100
        return max(0.0, savings)
    
    def get_stats(self) -> dict:
        """
        Get preprocessing statistics.
        
        Returns:
            Dictionary with original_length, processed_length, and savings_percent
        """
        return {
            'original_length': self._original_length,
            'processed_length': self._processed_length,
            'savings_percent': self.get_token_savings()
        }

"""
Batch Classifier Module - Token Saver (Section 20)

Instead of calling Gemini once per section for classification,
batch ALL sections into a single call for 60% API cost savings.

Rules:
- Force JSON output mode - no prose, no markdown fences
- One call handles all sections
- Use for classification when heuristic confidence is insufficient
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup, Tag

import google.generativeai as genai

from .confidence_scorer import heuristic_confidence, ConfidenceScorer, CONFIDENCE_HIGH

logger = logging.getLogger(__name__)

# Section types for classification
SECTION_TYPES = [
    'header',
    'hero',
    'features',
    'testimonials',
    'pricing',
    'cta',
    'product',
    'footer',
    'custom'
]

# Setting types for editable fields
SETTING_TYPES = [
    'text',
    'image',
    'url',
    'color',
    'richtext'
]


class BatchClassifier:
    """
    Batch classifier for Shopify section analysis.
    
    Batches all sections into a single Gemini API call for
    maximum cost efficiency. Only calls the API when heuristic
    confidence scoring is insufficient.
    
    Usage:
        classifier = BatchClassifier()
        results = classifier.classify_sections(sections)
    """
    
    # Model for batch classification (use flash for speed and cost)
    DEFAULT_MODEL = 'gemini-2.5-flash'
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the batch classifier.
        
        Args:
            api_key: Google AI API key. If not provided, uses GEMINI_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable or api_key parameter required")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.DEFAULT_MODEL)
        self.scorer = ConfidenceScorer()
    
    def classify_sections(
        self, 
        sections: List[str], 
        force_api: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple HTML sections in a single batch.
        
        Uses heuristic confidence scoring first. Only calls Gemini API
        for sections with insufficient confidence (unless force_api=True).
        
        Args:
            sections: List of HTML strings, each representing a section
            force_api: If True, always call API regardless of confidence
            
        Returns:
            List of classification results
        """
        results = []
        sections_needing_api = []
        sections_needing_api_indices = []
        
        # First pass: try heuristic classification
        for i, section_html in enumerate(sections):
            confidence = self.scorer.score(section_html)
            section_type, _ = self.scorer.classify_section(section_html)
            
            if confidence >= CONFIDENCE_HIGH and not force_api:
                # High confidence - use heuristic result
                results.append({
                    'index': i,
                    'section_type': section_type,
                    'editable_fields': self._extract_editable_fields_heuristic(section_html),
                    'has_dynamic_content': self._detect_dynamic_content(section_html),
                    'reusable_snippet': False,
                    'confidence': confidence,
                    'source': 'heuristic'
                })
            else:
                # Need API call
                sections_needing_api.append(section_html)
                sections_needing_api_indices.append(i)
                results.append(None)  # Placeholder
        
        # Second pass: batch API call for remaining sections
        if sections_needing_api:
            api_results = self._batch_api_classify(sections_needing_api)
            
            for api_idx, orig_idx in enumerate(sections_needing_api_indices):
                if api_idx < len(api_results):
                    api_result = api_results[api_idx]
                    api_result['index'] = orig_idx
                    api_result['source'] = 'api'
                    results[orig_idx] = api_result
                else:
                    # Fallback if API didn't return enough results
                    results[orig_idx] = self._fallback_result(
                        orig_idx, 
                        sections[orig_idx]
                    )
        
        return results
    
    def _batch_api_classify(self, sections: List[str]) -> List[Dict[str, Any]]:
        """
        Make a single batch API call to classify multiple sections.
        
        Args:
            sections: List of HTML sections to classify
            
        Returns:
            List of classification results from API
        """
        # Build batch prompt
        prompt = self._build_batch_prompt(sections)
        
        try:
            response = self.model.generate_content(prompt)
            
            if response.candidates and response.candidates[0].content.parts:
                content = response.candidates[0].content.parts[0].text
                return self._parse_batch_response(content, len(sections))
            
            logger.error("Empty response from batch classification API")
            return [self._fallback_result(i, s) for i, s in enumerate(sections)]
            
        except Exception as e:
            logger.error(f"Batch classification API call failed: {e}")
            return [self._fallback_result(i, s) for i, s in enumerate(sections)]
    
    def _build_batch_prompt(self, sections: List[str]) -> str:
        """Build the batch classification prompt."""
        sections_text = ""
        for i, section in enumerate(sections):
            # Truncate very long sections to save tokens
            truncated = section[:2000] if len(section) > 2000 else section
            sections_text += f"\n\n--- SECTION {i + 1} ---\n{truncated}"
        
        return f"""You are a Shopify theme architect. Analyze these {len(sections)} HTML sections.
For each section return ONLY a JSON object with these exact keys:
- section_type: string (header|hero|features|testimonials|pricing|cta|product|footer|custom)
- editable_fields: array of {{"name": string, "type": string, "label": string}} where type is one of: text|image|url|color|richtext
- has_dynamic_content: boolean
- reusable_snippet: boolean

Return a JSON array only. No explanation. No markdown. No extra text.

{sections_text}

JSON Output:"""
    
    def _parse_batch_response(
        self, 
        content: str, 
        expected_count: int
    ) -> List[Dict[str, Any]]:
        """Parse the batch API response."""
        try:
            # Clean the response
            content = content.strip()
            
            # Remove markdown code fences if present
            if content.startswith('```'):
                content = content.split('\n', 1)[1] if '\n' in content else content[3:]
            if content.endswith('```'):
                content = content.rsplit('\n', 1)[0] if '\n' in content else content[:-3]
            
            # Handle json language identifier
            if content.startswith('json'):
                content = content[4:].strip()
            
            results = json.loads(content)
            
            if not isinstance(results, list):
                results = [results]
            
            # Ensure we have the expected number of results
            while len(results) < expected_count:
                results.append({
                    'section_type': 'custom',
                    'editable_fields': [],
                    'has_dynamic_content': False,
                    'reusable_snippet': False
                })
            
            return results
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse batch response: {e}")
            return []
    
    def _extract_editable_fields_heuristic(
        self, 
        section_html: str
    ) -> List[Dict[str, Any]]:
        """
        Extract editable fields using heuristics.
        
        Args:
            section_html: HTML string of the section
            
        Returns:
            List of editable field definitions
        """
        soup = BeautifulSoup(section_html, 'html.parser')
        fields = []
        
        # Extract headings as text fields
        for i, heading in enumerate(soup.find_all(['h1', 'h2', 'h3'])):
            fields.append({
                'name': f'heading_{i + 1}',
                'type': 'text',
                'label': f'Heading {i + 1}'
            })
        
        # Extract paragraphs as richtext fields
        paragraphs = soup.find_all('p')
        if paragraphs:
            fields.append({
                'name': 'content',
                'type': 'richtext',
                'label': 'Content'
            })
        
        # Extract images as image fields
        for i, img in enumerate(soup.find_all('img')):
            fields.append({
                'name': f'image_{i + 1}',
                'type': 'image',
                'label': f'Image {i + 1}'
            })
        
        # Extract links as url fields
        for i, link in enumerate(soup.find_all('a', href=True)):
            if link.get_text().strip():
                fields.append({
                    'name': f'link_{i + 1}',
                    'type': 'url',
                    'label': f'Link {i + 1}'
                })
        
        return fields
    
    def _detect_dynamic_content(self, section_html: str) -> bool:
        """
        Detect if section likely has dynamic content.
        
        Args:
            section_html: HTML string of the section
            
        Returns:
            True if section appears to have dynamic content
        """
        soup = BeautifulSoup(section_html, 'html.parser')
        
        # Check for product-related attributes
        indicators = [
            soup.find(attrs={'data-product': True}),
            soup.find(attrs={'data-collection': True}),
            soup.find(class_=lambda x: x and ('product' in x or 'collection' in x)),
            soup.find(id=lambda x: x and ('product' in x or 'collection' in x)),
        ]
        
        return any(indicators)
    
    def _fallback_result(
        self, 
        index: int, 
        section_html: str
    ) -> Dict[str, Any]:
        """
        Generate a fallback result when classification fails.
        
        Args:
            index: Section index
            section_html: HTML string of the section
            
        Returns:
            Fallback classification result
        """
        section_type, confidence = self.scorer.classify_section(section_html)
        
        return {
            'index': index,
            'section_type': section_type,
            'editable_fields': self._extract_editable_fields_heuristic(section_html),
            'has_dynamic_content': self._detect_dynamic_content(section_html),
            'reusable_snippet': False,
            'confidence': confidence,
            'source': 'fallback'
        }
    
    def get_section_types(self) -> List[str]:
        """Get the list of supported section types."""
        return SECTION_TYPES.copy()
    
    def get_setting_types(self) -> List[str]:
        """Get the list of supported setting types."""
        return SETTING_TYPES.copy()


def classify_html_document(html: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to classify all sections in an HTML document.
    
    Args:
        html: Full HTML document
        api_key: Optional Gemini API key
        
    Returns:
        Dictionary with sections list and metadata
    """
    soup = BeautifulSoup(html, 'html.parser')
    
    # Find all potential sections
    section_elements = soup.find_all(['header', 'section', 'article', 'footer', 'main'])
    
    # Also find top-level divs with section-like classes
    for div in soup.find_all('div', recursive=False):
        classes = ' '.join(div.get('class', []))
        if any(word in classes for word in ['section', 'container', 'wrapper']):
            section_elements.append(div)
    
    # Extract HTML for each section
    sections = [str(elem) for elem in section_elements]
    
    if not sections:
        return {
            'sections': [],
            'total_count': 0,
            'api_calls_made': 0
        }
    
    # Classify all sections
    classifier = BatchClassifier(api_key=api_key)
    results = classifier.classify_sections(sections)
    
    # Count API calls
    api_calls = sum(1 for r in results if r.get('source') == 'api')
    
    return {
        'sections': results,
        'total_count': len(results),
        'api_calls_made': api_calls,
        'heuristic_count': len(results) - api_calls
    }

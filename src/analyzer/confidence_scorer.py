"""
Confidence Scorer Module - Token Saver (Section 19)

Computes heuristic confidence scores before calling Gemini for 
section detection or classification. This gates expensive API calls
based on how confident we can be using simple heuristics.

Decision Routing:
- >= 0.85: Skip Gemini, use heuristic classification only
- 0.60-0.84: Call gemini-2.5-flash (fast + cheap)
- < 0.60: Call gemini-2.5-pro (accurate + expensive)

Impact: Most well-structured websites have 80%+ sections scoring ≥0.85,
meaning zero AI calls for section detection.
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# Confidence thresholds for routing decisions
CONFIDENCE_HIGH = 0.85    # Skip Gemini, use heuristic only
CONFIDENCE_MEDIUM = 0.60  # Use gemini-2.5-flash
# Below MEDIUM = Use gemini-2.5-pro

# Semantic HTML tags that indicate clear section boundaries
SEMANTIC_TAGS = ['header', 'nav', 'footer', 'main', 'section', 'article', 'aside']

# Section type indicators based on common class/id patterns
SECTION_TYPE_PATTERNS = {
    'header': ['header', 'site-header', 'page-header', 'masthead', 'navbar', 'navigation'],
    'hero': ['hero', 'banner', 'jumbotron', 'splash', 'intro', 'above-fold'],
    'features': ['features', 'services', 'benefits', 'highlights', 'capabilities'],
    'testimonials': ['testimonials', 'reviews', 'quotes', 'feedback', 'social-proof'],
    'pricing': ['pricing', 'plans', 'packages', 'tiers', 'subscriptions'],
    'cta': ['cta', 'call-to-action', 'action', 'signup', 'subscribe', 'newsletter'],
    'footer': ['footer', 'site-footer', 'page-footer', 'bottom'],
    'product': ['product', 'products', 'item', 'shop', 'catalog'],
    'about': ['about', 'about-us', 'team', 'company', 'story'],
    'contact': ['contact', 'contact-us', 'get-in-touch', 'reach-us'],
    'faq': ['faq', 'faqs', 'questions', 'help', 'support'],
    'gallery': ['gallery', 'portfolio', 'showcase', 'work', 'projects'],
}


def heuristic_confidence(element) -> float:
    """
    Calculate heuristic confidence score for a DOM element.
    
    This is the core function that determines whether we need
    to call the LLM for section detection/classification.
    
    Args:
        element: BeautifulSoup Tag element or HTML string
        
    Returns:
        Confidence score between 0.0 and 1.0
    """
    scorer = ConfidenceScorer()
    return scorer.score(element)


class ConfidenceScorer:
    """
    Confidence scorer for section detection and classification.
    
    Uses heuristics to determine confidence level before making
    expensive LLM API calls. Higher confidence means we can skip
    the AI and use deterministic classification.
    """
    
    def __init__(self):
        """Initialize the confidence scorer."""
        self._detailed_scores: Dict[str, float] = {}
    
    def score(self, element) -> float:
        """
        Calculate confidence score for an element.
        
        Args:
            element: BeautifulSoup Tag or HTML string
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        # Handle string input
        if isinstance(element, str):
            soup = BeautifulSoup(element, 'html.parser')
            element = soup.find()
            if not element:
                return 0.0
        
        if not isinstance(element, Tag):
            return 0.0
        
        score = 0.0
        self._detailed_scores = {}
        
        # Factor 1: Semantic tag (high confidence indicator)
        tag_score = self._score_semantic_tag(element)
        self._detailed_scores['semantic_tag'] = tag_score
        score += tag_score
        
        # Factor 2: Has meaningful id or class
        identity_score = self._score_identity(element)
        self._detailed_scores['identity'] = identity_score
        score += identity_score
        
        # Factor 3: Contains headings
        heading_score = self._score_headings(element)
        self._detailed_scores['headings'] = heading_score
        score += heading_score
        
        # Factor 4: Contains images
        image_score = self._score_images(element)
        self._detailed_scores['images'] = image_score
        score += image_score
        
        # Factor 5: Contains links/buttons
        interactive_score = self._score_interactive_elements(element)
        self._detailed_scores['interactive'] = interactive_score
        score += interactive_score
        
        # Cap at 1.0
        return min(score, 1.0)
    
    def _score_semantic_tag(self, element: Tag) -> float:
        """
        Score based on semantic HTML tag.
        Semantic tags give high confidence.
        """
        tag = element.name.lower()
        if tag in SEMANTIC_TAGS:
            return 0.5
        return 0.0
    
    def _score_identity(self, element: Tag) -> float:
        """
        Score based on id and class attributes.
        Meaningful identifiers help with classification.
        """
        score = 0.0
        
        # Has id attribute
        if element.get('id'):
            score += 0.1
        
        # Has class attribute
        if element.get('class'):
            score += 0.1
        
        return score
    
    def _score_headings(self, element: Tag) -> float:
        """
        Score based on presence of headings.
        Sections typically contain heading elements.
        """
        headings = element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        if headings:
            return 0.15
        return 0.0
    
    def _score_images(self, element: Tag) -> float:
        """
        Score based on presence of images.
        Visual content indicates a content section.
        """
        images = element.find_all('img')
        if images:
            return 0.1
        return 0.0
    
    def _score_interactive_elements(self, element: Tag) -> float:
        """
        Score based on interactive elements.
        Links and buttons indicate action sections.
        """
        interactive = element.find_all(['a', 'button'])
        if interactive:
            return 0.05
        return 0.0
    
    def get_detailed_scores(self) -> Dict[str, float]:
        """Get breakdown of individual score components."""
        return self._detailed_scores.copy()
    
    def classify_section(self, element) -> Tuple[str, float]:
        """
        Classify section type based on heuristics.
        
        Args:
            element: BeautifulSoup Tag or HTML string
            
        Returns:
            Tuple of (section_type, confidence_score)
        """
        # Handle string input
        if isinstance(element, str):
            soup = BeautifulSoup(element, 'html.parser')
            element = soup.find()
            if not element:
                return ('custom', 0.0)
        
        if not isinstance(element, Tag):
            return ('custom', 0.0)
        
        # Get overall confidence
        confidence = self.score(element)
        
        # Try to determine section type
        section_type = self._determine_section_type(element)
        
        return (section_type, confidence)
    
    def _determine_section_type(self, element: Tag) -> str:
        """
        Determine section type based on tag, id, and class.
        """
        tag = element.name.lower()
        element_id = (element.get('id') or '').lower()
        element_classes = ' '.join(element.get('class', [])).lower()
        
        # Check tag name first
        if tag in ['header', 'nav']:
            return 'header'
        if tag == 'footer':
            return 'footer'
        
        # Check id and class patterns
        combined_text = f"{element_id} {element_classes}"
        
        for section_type, patterns in SECTION_TYPE_PATTERNS.items():
            for pattern in patterns:
                if pattern in combined_text:
                    return section_type
        
        # Check for specific content patterns
        return self._detect_by_content(element)
    
    def _detect_by_content(self, element: Tag) -> str:
        """
        Detect section type by analyzing content.
        """
        text_content = element.get_text().lower()
        
        # Check for pricing indicators
        if any(word in text_content for word in ['$', '€', '£', '/month', '/year', 'pricing']):
            return 'pricing'
        
        # Check for testimonial indicators
        if any(word in text_content for word in ['"', '"', '"', 'said', 'review', 'testimonial']):
            return 'testimonials'
        
        # Check for CTA indicators
        buttons = element.find_all(['button', 'a'])
        if len(buttons) == 1:
            button_text = buttons[0].get_text().lower()
            if any(word in button_text for word in ['signup', 'subscribe', 'get started', 'try']):
                return 'cta'
        
        # Default to custom
        return 'custom'
    
    def get_routing_decision(self, confidence: float) -> str:
        """
        Get the API routing decision based on confidence score.
        
        Args:
            confidence: Confidence score between 0.0 and 1.0
            
        Returns:
            'skip' - Skip Gemini, use heuristic only
            'flash' - Use gemini-2.5-flash
            'pro' - Use gemini-2.5-pro
        """
        if confidence >= CONFIDENCE_HIGH:
            return 'skip'
        elif confidence >= CONFIDENCE_MEDIUM:
            return 'flash'
        else:
            return 'pro'


def analyze_sections(html: str) -> List[Dict[str, Any]]:
    """
    Analyze all sections in an HTML document.
    
    Args:
        html: Full HTML document
        
    Returns:
        List of section analysis results
    """
    soup = BeautifulSoup(html, 'html.parser')
    scorer = ConfidenceScorer()
    results = []
    
    # Find potential sections
    section_candidates = soup.find_all(SEMANTIC_TAGS + ['div'])
    
    for element in section_candidates:
        # Skip deeply nested divs
        if element.name == 'div':
            parent_divs = len(element.find_parents('div'))
            if parent_divs > 2:
                continue
        
        section_type, confidence = scorer.classify_section(element)
        routing = scorer.get_routing_decision(confidence)
        
        results.append({
            'tag': element.name,
            'id': element.get('id'),
            'classes': element.get('class', []),
            'section_type': section_type,
            'confidence': confidence,
            'routing': routing,
            'detailed_scores': scorer.get_detailed_scores()
        })
    
    return results

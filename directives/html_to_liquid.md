# HTML to Liquid Conversion Directive

## Goal
Convert HTML website sections into valid Shopify Liquid template files with editable settings.

## Inputs
- Raw HTML from web page (will be preprocessed before LLM call)
- CSS styles (handled separately)
- Section type (if known from confidence scorer)

## Outputs
- Valid `.liquid` file with `{% schema %}` block
- Editable settings for all customizable content
- Preset configuration for theme editor

## Scripts to Call
1. `src/converter/html_preprocessor.py` - Preprocess HTML (ALWAYS run first)
2. `src/analyzer/confidence_scorer.py` - Score confidence for routing
3. `src/converter/gemini_client.py` - Convert via Gemini API (only if needed)

## Processing Flow
1. Load raw HTML
2. Run preprocessor to reduce tokens (expect 60-70% reduction)
3. Score confidence using heuristics
4. Route based on confidence:
   - High (≥0.85): Use heuristic classification only
   - Medium (0.60-0.84): Use gemini-2.5-flash
   - Low (<0.60): Use gemini-2.5-pro
5. Generate Liquid template
6. Validate output syntax

## Edge Cases
- SVG-heavy pages: Preprocessor replaces with placeholders
- Base64 images: Replaced with `[BASE64_IMAGE]` placeholder
- Malformed HTML: BeautifulSoup will auto-fix
- Empty sections: Skip with warning log
- Very large sections (>10KB): Truncate to first 5KB for classification

## Quality Targets
- Liquid validity: 100% (no parse errors)
- Visual similarity: >85% pixel match
- Processing time: <30 seconds per section

## Known Issues
- Complex JavaScript-rendered content may not convert properly
- Inline styles need to be extracted to CSS files separately

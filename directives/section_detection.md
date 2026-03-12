# Section Detection Directive

## Goal
Detect and classify sections in an HTML document before conversion to Shopify Liquid.

## Inputs
- Preprocessed HTML document (NOT raw HTML)
- Optional: Previous classification results for context

## Outputs
- List of detected sections with boundaries
- Section type classification for each
- Confidence score for each classification
- Routing decision (skip/flash/pro)

## Scripts to Call
1. `src/analyzer/confidence_scorer.py` - Main scoring logic
2. `src/analyzer/batch_classifier.py` - Batch API classification (if needed)

## Processing Flow
1. Parse HTML with BeautifulSoup
2. Find semantic section boundaries (header, footer, section, article, etc.)
3. Score each section using heuristics
4. Classify sections with high confidence (≥0.85) using heuristics only
5. Batch remaining sections for single API call

## Heuristic Confidence Factors
- Semantic HTML tag: +0.50 (header, nav, footer, main, section, article)
- Has id attribute: +0.10
- Has class attribute: +0.10
- Contains headings (h1-h3): +0.15
- Contains images: +0.10
- Contains links/buttons: +0.05

## Section Type Detection Patterns
- `header`, `navbar`, `navigation` → header
- `hero`, `banner`, `jumbotron` → hero
- `features`, `services`, `benefits` → features
- `testimonials`, `reviews`, `quotes` → testimonials
- `pricing`, `plans`, `packages` → pricing
- `cta`, `call-to-action`, `signup` → cta
- `footer`, `site-footer` → footer
- `product`, `products`, `item` → product

## Edge Cases
- Deeply nested divs (>2 levels): Skip
- Empty sections: Skip with warning
- Very small sections (<50 chars): Likely not real sections
- Multiple h1 tags: Each may indicate separate section

## Success Metrics
- Section detection accuracy: >90% correct boundaries
- Classification accuracy: >85% correct type identification
- API call reduction: 60%+ through heuristic gating

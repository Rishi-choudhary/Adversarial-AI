# Token Optimization Directive

## Goal
Minimize LLM API token usage while maintaining conversion quality.

## Target Savings
- HTML preprocessing: 60-70% token reduction
- Context caching: 75% discount on static rules
- Confidence gating: 80%+ sections skip API entirely
- Batch classification: 60% fewer API calls

## Token Budget
- Target: ≤3 Gemini calls per conversion on clean sites
- Maximum: 5 calls for complex multi-section pages
- Alert threshold: >10 calls indicates inefficiency

## Preprocessing Rules (ALWAYS APPLY)
1. Remove all `<script>` blocks
2. Remove all `<style>` blocks
3. Remove `<noscript>` and `<iframe>` tags
4. Remove `data-*` and `aria-*` attributes
5. Remove inline `style` attributes
6. Replace SVG content with `[SVG_CONTENT]`
7. Replace base64 images with `[BASE64_IMAGE]`
8. Remove HTML comments

## Caching Strategy
- Cache Shopify Liquid rules at session start
- Cache expires after 1 hour
- Store cache ID in `.tmp/session_cache.json`
- Validate cache before each API call

## Routing Thresholds
- ≥0.85 confidence: Use heuristics only (FREE)
- 0.60-0.84 confidence: Use gemini-2.5-flash (~$0.0001/section)
- <0.60 confidence: Use gemini-2.5-pro (~$0.001/section)

## Monitoring
- Log token counts for each API call
- Track preprocessing savings percentage
- Alert if savings drop below 50%
- Report confidence distribution for tuning

## Known Cost Drivers
- Very long text content (>5000 words)
- Many small sections (>20 per page)
- Low semantic HTML (all divs)
- Inline JavaScript contamination

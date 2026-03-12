import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { retry } from '../lib/utils';

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

/**
 * Initialize the Gemini client
 */
export function initGemini(): void {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-pro' });
}

/**
 * Get the initialized model
 */
function getModel(): GenerativeModel {
  if (!model) {
    initGemini();
  }
  return model!;
}

/**
 * Generate content using Gemini
 */
export async function generateContent(prompt: string): Promise<string> {
  const model = getModel();
  
  const result = await retry(async () => {
    const response = await model.generateContent(prompt);
    return response.response.text();
  }, {
    maxRetries: 3,
    initialDelay: 1000,
  });
  
  return result;
}

/**
 * Analyze HTML and suggest Shopify section structure
 */
export async function analyzeHtmlStructure(html: string): Promise<string> {
  const prompt = `Analyze this HTML snippet and suggest how to convert it to a Shopify Liquid section.
Identify:
1. The section type (hero, features, testimonials, etc.)
2. Editable content that should become schema settings
3. Repeatable blocks
4. Dynamic content areas

HTML:
${html.substring(0, 3000)}

Respond with a JSON object containing:
- sectionType: string
- settings: array of {id, type, label, default}
- blocks: array of {type, name, settings}
- suggestions: array of improvement suggestions`;

  return generateContent(prompt);
}

/**
 * Convert HTML to Liquid with AI assistance
 */
export async function convertHtmlToLiquid(
  html: string,
  context: {
    sectionType: string;
    settings: Array<{ id: string; type: string }>;
  }
): Promise<string> {
  const prompt = `Convert this HTML to Shopify Liquid format.

Section type: ${context.sectionType}
Available settings: ${context.settings.map(s => s.id).join(', ')}

Rules:
1. Replace static text with {{ section.settings.xxx }}
2. Replace images with {{ section.settings.image | image_url }}
3. Add {% for block in section.blocks %} for repeatable items
4. Use {{ block.settings.xxx }} for block content
5. Keep the HTML structure but make it dynamic

HTML:
${html.substring(0, 2000)}

Return only the converted Liquid code without explanations.`;

  return generateContent(prompt);
}

/**
 * Generate schema settings based on content
 */
export async function suggestSchemaSettings(html: string): Promise<string> {
  const prompt = `Analyze this HTML and suggest Shopify section schema settings.

For each piece of editable content, suggest:
- id: snake_case identifier
- type: text, textarea, richtext, image_picker, url, color, checkbox, select, range
- label: Human-readable label
- default: Default value if applicable

HTML:
${html.substring(0, 2000)}

Return a JSON array of setting objects.`;

  return generateContent(prompt);
}

/**
 * Improve section accessibility
 */
export async function improveAccessibility(html: string): Promise<string> {
  const prompt = `Improve the accessibility of this HTML section.

Add:
1. ARIA labels and roles where appropriate
2. Alt text placeholders for images
3. Proper heading hierarchy
4. Focus management attributes
5. Screen reader considerations

HTML:
${html.substring(0, 2000)}

Return the improved HTML with accessibility enhancements.`;

  return generateContent(prompt);
}

/**
 * Generate responsive CSS suggestions
 */
export async function suggestResponsiveCSS(css: string): Promise<string> {
  const prompt = `Analyze this CSS and suggest responsive improvements.

Current CSS:
${css.substring(0, 2000)}

Suggest:
1. Mobile-first media queries
2. Flexible layouts using flexbox/grid
3. Responsive typography
4. Touch-friendly sizing

Return CSS with responsive improvements.`;

  return generateContent(prompt);
}

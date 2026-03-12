/**
 * Gemini Client - API wrapper for Google's Gemini AI
 * Used for HTML to Shopify Liquid conversion
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  rateLimitPerMinute?: number;
}

export interface ConversionInput {
  sectionType: string;
  sourceUrl: string;
  sectionHTML: string;
  sectionCSS: string;
  screenshot?: string; // base64 encoded image
}

export interface ConversionResult {
  success: boolean;
  liquidContent?: string;
  error?: string;
}

/**
 * The master prompt for HTML to Liquid conversion
 */
export function buildLiquidConversionPrompt(input: ConversionInput): string {
  const { sectionType, sourceUrl, sectionHTML, sectionCSS } = input;
  
  return `You are an expert Shopify theme developer. Your task is to convert an HTML section 
into a pixel-perfect Shopify Liquid section file.

## RULES (follow strictly):

### Structure Rules:
1. PRESERVE the exact HTML structure, classes, attributes, and nesting — do NOT restructure
2. Do NOT add new wrapper divs unless necessary for Liquid logic
3. Keep ALL original CSS class names exactly as they are

### Dynamic Content Rules:
4. Every hardcoded TEXT string → replace with {{ section.settings.FIELD_ID }}
5. Every <img src="..."> → replace with {{ section.settings.image_N | img_url: 'master' }}
6. Every <a href="..."> URL → replace with {{ section.settings.link_N_url }}
7. Every inline style color (e.g., color: #ff0000) → {{ section.settings.color_N }}
8. Every background-image: url(...) → {{ section.settings.bg_image_N | img_url: 'master' }}

### Block Rules (for repeating elements):
9. If you detect 2+ structurally identical sibling elements → use {% for block in section.blocks %}
10. Each repeating element becomes a block with its own settings

### Asset Rules:
11. Image src values should use: {{ 'FILENAME.webp' | asset_url }} for local assets
12. Never use hardcoded URLs in the output

### Schema Rules:
13. Add {% schema %} at the bottom of the file
14. Include ALL settings for every dynamic value you created
15. Include realistic default values (use the original hardcoded content as defaults)
16. Add padding_top and padding_bottom range settings to every section
17. Add background_color color setting to every section
18. Include presets with the section name

### CSS/JS Rules:
19. Do NOT include <style> tags for section CSS (it's in a separate .css file)
20. Do NOT include <script> tags for JS logic (it's in a separate .js file)  
21. DO include: {{ 'section-SECTIONNAME.css' | asset_url | stylesheet_tag }}
22. DO include: <script src="{{ 'section-SECTIONNAME.js' | asset_url }}" defer></script>

## INPUT:
Section Type: ${sectionType}
Source URL: ${sourceUrl}

HTML:
\`\`\`html
${sectionHTML}
\`\`\`

Scoped CSS:
\`\`\`css
${sectionCSS}
\`\`\`

## OUTPUT:
Output ONLY the complete .liquid file content. No markdown. No explanation.
Start directly with the HTML/Liquid code.
`;
}

/**
 * GeminiClient class for interacting with Google's Gemini API
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private maxRetries: number;
  private rateLimitPerMinute: number;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: GeminiClientConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.model || 'gemini-2.5-flash'
    });
    this.maxRetries = config.maxRetries || 3;
    this.rateLimitPerMinute = config.rateLimitPerMinute || 60;
  }

  /**
   * Check and update rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const elapsed = now - this.lastResetTime;
    
    // Reset counter every minute
    if (elapsed >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.rateLimitPerMinute) {
      const waitTime = 60000 - elapsed;
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.requestCount++;
  }

  /**
   * Convert HTML to Shopify Liquid section
   */
  async convertToLiquid(input: ConversionInput): Promise<ConversionResult> {
    const prompt = buildLiquidConversionPrompt(input);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.checkRateLimit();
        
        // Prepare content parts
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
          { text: prompt }
        ];
        
        // Add screenshot if provided
        if (input.screenshot) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: input.screenshot
            }
          });
        }
        
        const result = await this.model.generateContent(parts);
        const response = result.response;
        const text = response.text();
        
        // Validate the output
        if (!this.validateLiquidOutput(text)) {
          if (attempt < this.maxRetries) {
            console.warn(`Attempt ${attempt}: Invalid Liquid output, retrying...`);
            continue;
          }
          return {
            success: false,
            error: 'Generated output failed validation'
          };
        }
        
        return {
          success: true,
          liquidContent: text
        };
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
        
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    
    return {
      success: false,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Validate that the output is valid Liquid syntax
   */
  private validateLiquidOutput(content: string): boolean {
    // Check for required schema section
    if (!content.includes('{% schema %}') || !content.includes('{% endschema %}')) {
      return false;
    }
    
    // Check for balanced Liquid tags
    const liquidTagPattern = /{%-?\s*(if|for|unless|case|capture|form|paginate|tablerow)\s/g;
    const liquidEndTagPattern = /{%-?\s*end(if|for|unless|case|capture|form|paginate|tablerow)\s*-?%}/g;
    
    const openTags = content.match(liquidTagPattern) || [];
    const closeTags = content.match(liquidEndTagPattern) || [];
    
    if (openTags.length !== closeTags.length) {
      return false;
    }
    
    // Check for valid JSON in schema
    const schemaMatch = content.match(/{% schema %}([\s\S]*?){% endschema %}/);
    if (schemaMatch) {
      try {
        JSON.parse(schemaMatch[1]);
      } catch {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GeminiClient;

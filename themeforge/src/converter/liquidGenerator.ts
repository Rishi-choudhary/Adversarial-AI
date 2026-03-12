import { ClassifiedSection } from '../analyzer/sectionClassifier';
import { generateSectionSchema } from './schemaBuilder';

export interface LiquidSection {
  name: string;
  filename: string;
  content: string;
  schema: object;
}

/**
 * Convert an HTML section to Shopify Liquid format
 */
export function convertToLiquid(section: ClassifiedSection): LiquidSection {
  const name = section.suggestedName;
  const filename = `${name}.liquid`;
  
  // Convert HTML to Liquid
  const liquidHtml = htmlToLiquid(section.html, section);
  
  // Generate schema
  const schema = generateSectionSchema(section);
  
  // Build the full section content
  const content = buildSectionContent(section, liquidHtml, schema);
  
  return {
    name,
    filename,
    content,
    schema,
  };
}

/**
 * Convert multiple sections to Liquid
 */
export function convertSectionsToLiquid(
  sections: ClassifiedSection[]
): LiquidSection[] {
  const converted: LiquidSection[] = [];
  const usedNames = new Set<string>();
  
  for (const section of sections) {
    let name = section.suggestedName;
    
    // Ensure unique names
    let counter = 1;
    while (usedNames.has(name)) {
      name = `${section.suggestedName}-${counter++}`;
    }
    usedNames.add(name);
    
    // Update section name before conversion
    section.suggestedName = name;
    
    converted.push(convertToLiquid(section));
  }
  
  return converted;
}

/**
 * Convert HTML content to Liquid template syntax
 */
function htmlToLiquid(html: string, section: ClassifiedSection): string {
  let liquid = html;
  
  // Convert images to Liquid asset URLs
  liquid = convertImages(liquid);
  
  // Convert links to Liquid URLs
  liquid = convertLinks(liquid);
  
  // Convert static text to schema settings
  liquid = convertTextToSettings(liquid, section);
  
  // Add Liquid comments
  liquid = addLiquidComments(liquid, section);
  
  // Clean up and format
  liquid = cleanupHtml(liquid);
  
  return liquid;
}

/**
 * Convert image tags to use Liquid asset URLs
 */
function convertImages(html: string): string {
  // Convert img src to asset_url
  let result = html.replace(
    /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      // Check if it's an external URL
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return match; // Keep external URLs as-is initially
      }
      
      // Convert to asset URL
      const filename = src.split('/').pop() || 'image.png';
      return `<img${before} src="{{ '${filename}' | asset_url }}"${after}>`;
    }
  );
  
  // Convert background-image URLs in inline styles
  result = result.replace(
    /background(-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi,
    (match, prop, url) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return match;
      }
      const filename = url.split('/').pop() || 'bg.png';
      return `background${prop || ''}: url({{ '${filename}' | asset_url }})`;
    }
  );
  
  return result;
}

/**
 * Convert links to use Liquid URL helpers
 */
function convertLinks(html: string): string {
  let result = html;
  
  // Convert anchor hrefs
  result = result.replace(
    /<a([^>]*)\shref=["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      // Keep external links as-is
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return match;
      }
      
      // Convert hash links
      if (href.startsWith('#')) {
        return `<a${before} href="${href}"${after}>`;
      }
      
      // Convert to Shopify routes
      if (href === '/' || href === 'index.html') {
        return `<a${before} href="{{ routes.root_url }}"${after}>`;
      }
      
      // Default: use url_for or keep relative
      return `<a${before} href="{{ '${href}' | url }}"${after}>`;
    }
  );
  
  return result;
}

/**
 * Convert static text content to use schema settings
 */
function convertTextToSettings(html: string, section: ClassifiedSection): string {
  let result = html;
  
  // Convert main headings to settings
  result = result.replace(
    /<(h[1-3])([^>]*)>([^<]+)<\/\1>/gi,
    (match, tag, attrs, text) => {
      // Only convert if text is meaningful
      if (text.trim().length < 3) return match;
      
      return `<${tag}${attrs}>{{ section.settings.heading | default: '${escapeForLiquid(text.trim())}' }}</${tag}>`;
    }
  );
  
  // Convert paragraphs to settings (first one only to avoid over-conversion)
  let paragraphConverted = false;
  result = result.replace(
    /<p([^>]*)>([^<]{20,})<\/p>/gi,
    (match, attrs, text) => {
      if (paragraphConverted) return match;
      paragraphConverted = true;
      
      return `<p${attrs}>{{ section.settings.description | default: '${escapeForLiquid(text.trim().substring(0, 200))}' }}</p>`;
    }
  );
  
  return result;
}

/**
 * Add Liquid comments for clarity
 */
function addLiquidComments(html: string, section: ClassifiedSection): string {
  const comment = `{%- comment -%}
  ${section.suggestedName.charAt(0).toUpperCase() + section.suggestedName.slice(1)} Section
  Generated by ThemeForge
{%- endcomment -%}

`;
  
  return comment + html;
}

/**
 * Clean up and format HTML
 */
function cleanupHtml(html: string): string {
  return html
    // Remove empty class/style attributes
    .replace(/\s+(class|style)=["']\s*["']/gi, '')
    // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Escape text for use in Liquid strings
 */
function escapeForLiquid(text: string): string {
  return text
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Build the full section content including schema
 */
function buildSectionContent(
  section: ClassifiedSection,
  liquidHtml: string,
  schema: object
): string {
  return `${liquidHtml}

{% schema %}
${JSON.stringify(schema, null, 2)}
{% endschema %}`;
}

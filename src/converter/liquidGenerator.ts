/**
 * Liquid Conversion Engine
 * Converts HTML sections into production-ready Shopify Liquid files with schema
 *
 * This module implements:
 * - Per-Section AI Prompt Strategy (Section 3.1)
 * - Schema Generation Rules (Section 3.2)
 * - Blocks vs Settings Decision Logic (Section 3.3)
 * - CSS Scoping Strategy (Section 3.4)
 * - JavaScript Handling (Section 3.5)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as csstree from 'css-tree';
import * as acorn from 'acorn';
import type {
  SectionInput,
  SectionOutput,
  SectionSchema,
  SchemaSetting,
  SchemaBlock,
  SchemaPreset,
  ConversionOptions,
  GeminiPromptInput,
  CssScopingConfig,
  ParsedCssRule,
  JsHandlingResult,
  ElementAnalysis,
  ThemeConversionResult,
  SectionType,
  SchemaSettingType,
} from './types';

/**
 * System prompt template for Gemini AI
 * Defines the rules for converting HTML to Shopify Liquid
 */
const SYSTEM_PROMPT = `You are a Shopify Liquid expert. Convert the provided HTML section into a 
production-ready Shopify Liquid section file. Rules:
1. All hardcoded text → Liquid schema settings (type: text/richtext/image/url)
2. All images → use {{ section.settings.image_X | img_url: 'master' }}
3. All colors → use CSS variables mapped to schema color settings
4. Preserve ALL original CSS classes and structure exactly
5. Output a single .liquid file with {% schema %} at the bottom
6. Schema must have a proper name, class, and all settings defined
7. Include presets so section appears in Shopify editor correctly
8. DO NOT change visual structure — pixel-perfect preservation is required

INPUT:
- Section HTML: [raw HTML string]
- Section Screenshot: [base64 PNG]
- Extracted CSS for this section: [scoped CSS string]
- Section Type: [hero/features/testimonials/etc]

OUTPUT FORMAT:
Return ONLY valid Liquid code. No explanation. No markdown fences.`;

/**
 * Main class for converting HTML sections to Shopify Liquid
 */
export class LiquidGenerator {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private options: ConversionOptions;

  constructor(options: ConversionOptions) {
    this.options = options;
    this.genAI = new GoogleGenerativeAI(options.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Convert a single HTML section to Shopify Liquid
   * Implements Section 3.1 - Per-Section AI Prompt Strategy
   */
  async convertSection(input: SectionInput): Promise<SectionOutput> {
    // Build the AI prompt
    const prompt = this.buildPrompt(input);

    // Generate Liquid content using Gemini
    const liquidContent = await this.generateLiquidWithAI(prompt);

    // Extract schema from generated content
    const schema = this.extractSchema(liquidContent);

    // Scope CSS for this section (Section 3.4)
    const scopedCss = this.options.scopeCss
      ? this.scopeCss({
          sectionName: input.sectionName,
          originalCss: input.css,
          classNames: this.extractClassNames(input.html),
        })
      : input.css;

    // Handle JavaScript if present (Section 3.5)
    let javascript: string | undefined;
    let jsPath: string | undefined;
    if (this.options.handleJavascript) {
      const jsResult = await this.handleJavascript(input.html, input.sectionName);
      if (jsResult.vanillaJs) {
        javascript = jsResult.vanillaJs;
        jsPath = `assets/section-${input.sectionName}.js`;
      }
    }

    return {
      liquidContent,
      schema,
      scopedCss,
      javascript,
      liquidPath: `sections/${input.sectionName}.liquid`,
      cssPath: `assets/section-${input.sectionName}.css`,
      jsPath,
    };
  }

  /**
   * Build the prompt for Gemini AI
   * Implements Section 3.1 - Per-Section AI Prompt Strategy
   */
  private buildPrompt(input: SectionInput): GeminiPromptInput {
    return {
      systemPrompt: SYSTEM_PROMPT,
      sectionHtml: input.html,
      screenshot: this.options.includeScreenshots ? input.screenshot : undefined,
      css: input.css,
      sectionType: input.sectionType,
    };
  }

  /**
   * Generate Liquid content using Gemini AI
   */
  private async generateLiquidWithAI(prompt: GeminiPromptInput): Promise<string> {
    const fullPrompt = `${prompt.systemPrompt}

Section HTML:
${prompt.sectionHtml}

Extracted CSS:
${prompt.css}

Section Type: ${prompt.sectionType}

Remember: Return ONLY valid Liquid code. No explanation. No markdown fences.`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: fullPrompt },
    ];

    // Include screenshot if available
    if (prompt.screenshot) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: prompt.screenshot,
        },
      });
    }

    const result = await this.model.generateContent(parts);
    const response = await result.response;
    let text = response.text();

    // Clean up response - remove markdown fences if present
    text = text.replace(/^```liquid\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');

    return text;
  }

  /**
   * Extract schema from generated Liquid content
   */
  private extractSchema(liquidContent: string): SectionSchema {
    const schemaMatch = liquidContent.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);

    if (!schemaMatch) {
      // Return default schema if none found
      return this.createDefaultSchema('custom-section');
    }

    try {
      return JSON.parse(schemaMatch[1]) as SectionSchema;
    } catch {
      return this.createDefaultSchema('custom-section');
    }
  }

  /**
   * Create a default schema structure
   * Implements Section 3.2 - Schema Generation Rules
   */
  private createDefaultSchema(name: string): SectionSchema {
    return {
      name: this.formatSectionName(name),
      class: `section-${name}`,
      settings: [],
      blocks: [],
      max_blocks: 12,
      presets: [
        {
          name: this.formatSectionName(name),
          blocks: [],
        },
      ],
    };
  }

  /**
   * Format section name for display
   */
  private formatSectionName(name: string): string {
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract class names from HTML
   */
  private extractClassNames(html: string): string[] {
    const classRegex = /class=["']([^"']+)["']/g;
    const classes = new Set<string>();
    let match;

    while ((match = classRegex.exec(html)) !== null) {
      match[1].split(/\s+/).forEach((cls) => {
        if (cls.trim()) {
          classes.add(cls.trim());
        }
      });
    }

    return Array.from(classes);
  }

  /**
   * Scope CSS to section namespace
   * Implements Section 3.4 - CSS Scoping Strategy
   */
  scopeCss(config: CssScopingConfig): string {
    const { sectionName, originalCss, classNames } = config;
    const sectionClass = `.section-${sectionName}`;

    try {
      const ast = csstree.parse(originalCss);
      const relevantRules: ParsedCssRule[] = [];

      csstree.walk(ast, {
        enter: (node: csstree.CssNode) => {
          if (node.type === 'Rule') {
            const rule = node;
            const selector = csstree.generate(rule.prelude);
            const declarations = csstree.generate(rule.block);

            // Check if this rule applies to any class in the section
            const isRelevant = classNames.some(
              (className) =>
                selector.includes(`.${className}`) ||
                selector.includes(className) ||
                this.isGlobalSelector(selector)
            );

            if (isRelevant) {
              relevantRules.push({
                selector,
                declarations,
                isGlobal: this.isGlobalSelector(selector),
              });
            }
          }
        },
      });

      // Scope the rules
      const scopedRules = relevantRules.map((rule) => {
        if (rule.isGlobal) {
          // Don't scope global selectors
          return `${rule.selector} ${rule.declarations}`;
        }
        // Scope to section class
        const scopedSelector = rule.selector
          .split(',')
          .map((s) => `${sectionClass} ${s.trim()}`)
          .join(', ');
        return `${scopedSelector} ${rule.declarations}`;
      });

      return scopedRules.join('\n\n');
    } catch {
      // Fallback: wrap all CSS in section scope
      return `${sectionClass} {\n${originalCss}\n}`;
    }
  }

  /**
   * Check if selector is a global selector
   */
  private isGlobalSelector(selector: string): boolean {
    const globalSelectors = [
      '*',
      'html',
      'body',
      ':root',
      '@font-face',
      '@keyframes',
      '@media',
      '@supports',
    ];
    return globalSelectors.some(
      (g) => selector.trim().startsWith(g) || selector.includes('@')
    );
  }

  /**
   * Extract global CSS for base.css
   * Implements Section 3.4 - CSS Scoping Strategy
   */
  extractGlobalCss(fullCss: string): string {
    const globalPatterns = [
      /\*\s*\{[^}]*\}/g, // Universal selector
      /:root\s*\{[^}]*\}/g, // CSS variables
      /html\s*\{[^}]*\}/g, // HTML element
      /body\s*\{[^}]*\}/g, // Body element
      /@font-face\s*\{[^}]*\}/g, // Font faces
      /@keyframes\s+[\w-]+\s*\{[^}]*(\{[^}]*\}[^}]*)*\}/g, // Keyframes
    ];

    const globalRules: string[] = [];

    globalPatterns.forEach((pattern) => {
      const matches = fullCss.match(pattern);
      if (matches) {
        globalRules.push(...matches);
      }
    });

    return globalRules.join('\n\n');
  }

  /**
   * Handle JavaScript conversion
   * Implements Section 3.5 - JavaScript Handling
   */
  async handleJavascript(html: string, sectionName: string): Promise<JsHandlingResult> {
    // Extract inline scripts from HTML
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);

    if (!scriptMatches || scriptMatches.length === 0) {
      return {
        vanillaJs: '',
        converted: true,
        warnings: [],
      };
    }

    const scripts: string[] = [];
    const warnings: string[] = [];
    let originalFramework: string | undefined;

    for (const scriptTag of scriptMatches) {
      const scriptContent = scriptTag.replace(/<\/?script[^>]*>/gi, '').trim();

      if (!scriptContent) continue;

      // Detect framework
      const frameworkInfo = this.detectFramework(scriptContent);
      if (frameworkInfo.framework) {
        originalFramework = frameworkInfo.framework;
        warnings.push(`Detected ${frameworkInfo.framework} code - conversion may require review`);
      }

      // Analyze and convert the script
      const convertedJs = await this.convertJsToVanilla(scriptContent, sectionName);
      scripts.push(convertedJs);
    }

    // Scope all JS to section
    const scopedJs = this.scopeJsToSection(scripts.join('\n\n'), sectionName);

    return {
      vanillaJs: scopedJs,
      converted: true,
      originalFramework,
      warnings,
    };
  }

  /**
   * Detect JavaScript framework in code
   */
  private detectFramework(code: string): { framework?: string; confidence: number } {
    const patterns: { framework: string; patterns: RegExp[] }[] = [
      {
        framework: 'React',
        patterns: [
          /import\s+.*from\s+['"]react['"]/,
          /React\.(createElement|Component|useState|useEffect)/,
          /ReactDOM\.(render|createRoot)/,
        ],
      },
      {
        framework: 'Vue',
        patterns: [
          /import\s+.*from\s+['"]vue['"]/,
          /new\s+Vue\s*\(/,
          /Vue\.(component|directive|use)/,
          /createApp\s*\(/,
        ],
      },
      {
        framework: 'Alpine.js',
        patterns: [/x-data\s*=/, /Alpine\.(data|store|start)/, /\$store\s*\./],
      },
      {
        framework: 'jQuery',
        patterns: [/\$\s*\(/, /jQuery\s*\(/, /\$\.ajax/, /\.on\s*\(['"]click['"]/],
      },
    ];

    for (const { framework, patterns: regexes } of patterns) {
      const matchCount = regexes.filter((regex) => regex.test(code)).length;
      if (matchCount > 0) {
        return {
          framework,
          confidence: matchCount / regexes.length,
        };
      }
    }

    return { confidence: 0 };
  }

  /**
   * Convert framework-specific JS to vanilla JS
   * Uses AI for complex conversions
   */
  private async convertJsToVanilla(code: string, sectionName: string): Promise<string> {
    // Parse with Acorn to understand structure
    try {
      acorn.parse(code, {
        ecmaVersion: 2020,
        sourceType: 'module',
      });
    } catch {
      // If parsing fails, it might be a snippet or have syntax issues
      // Just return as-is with basic scoping
      return code;
    }

    // For simple interactions, convert directly
    const simplePatterns = [
      // Accordion pattern
      {
        detect: /toggle|accordion|collapse/i,
        template: (name: string) => `
// ${name} - Accordion functionality
document.querySelectorAll('[data-section-id="{{ section.id }}"] [data-accordion-trigger]').forEach(trigger => {
  trigger.addEventListener('click', function() {
    const content = this.nextElementSibling;
    const isExpanded = content.classList.contains('active');
    content.classList.toggle('active');
    this.setAttribute('aria-expanded', !isExpanded);
  });
});`,
      },
      // Carousel pattern
      {
        detect: /carousel|slider|swipe/i,
        template: (name: string) => `
// ${name} - Carousel functionality
(function() {
  const section = document.querySelector('[data-section-id="{{ section.id }}"]');
  if (!section) return;
  
  const track = section.querySelector('[data-carousel-track]');
  const slides = section.querySelectorAll('[data-carousel-slide]');
  const prevBtn = section.querySelector('[data-carousel-prev]');
  const nextBtn = section.querySelector('[data-carousel-next]');
  let currentIndex = 0;
  
  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentIndex = index;
    track.style.transform = \`translateX(-\${currentIndex * 100}%)\`;
  }
  
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
})();`,
      },
      // Modal pattern
      {
        detect: /modal|dialog|popup|overlay/i,
        template: (name: string) => `
// ${name} - Modal functionality
(function() {
  const section = document.querySelector('[data-section-id="{{ section.id }}"]');
  if (!section) return;
  
  const modal = section.querySelector('[data-modal]');
  const openBtns = section.querySelectorAll('[data-modal-open]');
  const closeBtns = section.querySelectorAll('[data-modal-close]');
  
  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  openBtns.forEach(btn => btn.addEventListener('click', openModal));
  closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
})();`,
      },
      // Tabs pattern
      {
        detect: /tab|tabs|tablist/i,
        template: (name: string) => `
// ${name} - Tabs functionality
(function() {
  const section = document.querySelector('[data-section-id="{{ section.id }}"]');
  if (!section) return;
  
  const tabs = section.querySelectorAll('[data-tab]');
  const panels = section.querySelectorAll('[data-tab-panel]');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetId = this.getAttribute('data-tab');
      
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      this.classList.add('active');
      section.querySelector('[data-tab-panel="' + targetId + '"]').classList.add('active');
    });
  });
})();`,
      },
    ];

    // Check for simple patterns first
    for (const pattern of simplePatterns) {
      if (pattern.detect.test(code)) {
        return pattern.template(sectionName);
      }
    }

    // For complex code, use AI to convert
    const convertPrompt = `Convert the following JavaScript to vanilla JavaScript that works with Shopify sections.
The code should be scoped to the section using: document.querySelector('[data-section-id="{{ section.id }}"]')

Original code:
${code}

Return ONLY the converted JavaScript code. No explanation. No markdown fences.`;

    const result = await this.model.generateContent(convertPrompt);
    const response = await result.response;
    let convertedCode = response.text();

    // Clean up response
    convertedCode = convertedCode
      .replace(/^```javascript\n?/i, '')
      .replace(/^```js\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '');

    return convertedCode;
  }

  /**
   * Scope JavaScript to specific section
   */
  private scopeJsToSection(code: string, sectionName: string): string {
    return `// Section: ${sectionName}
// Scoped to section ID for isolation
(function() {
  const sectionSelector = '[data-section-id="{{ section.id }}"]';
  
  function initSection() {
    const section = document.querySelector(sectionSelector);
    if (!section) return;
    
    ${code.split('\n').map((line) => '    ' + line).join('\n')}
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSection);
  } else {
    initSection();
  }
  
  // Re-initialize on Shopify section load/unload
  document.addEventListener('shopify:section:load', function(event) {
    if (event.target.matches(sectionSelector)) {
      initSection();
    }
  });
})();`;
  }

  /**
   * Analyze elements for blocks vs settings decision
   * Implements Section 3.3 - Blocks vs Settings Decision Logic
   */
  analyzeForBlocks(html: string): ElementAnalysis {
    // Find repeating elements
    const repeatingPatterns = [
      { selector: /class="[^"]*card[^"]*"/gi, name: 'card' },
      { selector: /class="[^"]*item[^"]*"/gi, name: 'item' },
      { selector: /class="[^"]*slide[^"]*"/gi, name: 'slide' },
      { selector: /class="[^"]*testimonial[^"]*"/gi, name: 'testimonial' },
      { selector: /class="[^"]*feature[^"]*"/gi, name: 'feature' },
      { selector: /class="[^"]*logo[^"]*"/gi, name: 'logo' },
      { selector: /class="[^"]*review[^"]*"/gi, name: 'review' },
      { selector: /class="[^"]*team[^"]*"/gi, name: 'team-member' },
      { selector: /class="[^"]*price[^"]*"/gi, name: 'pricing' },
      { selector: /class="[^"]*service[^"]*"/gi, name: 'service' },
    ];

    let maxRepeat = 0;
    let repeatType = '';
    let classNames: string[] = [];

    for (const pattern of repeatingPatterns) {
      const matches = html.match(pattern.selector);
      if (matches && matches.length >= 2 && matches.length > maxRepeat) {
        maxRepeat = matches.length;
        repeatType = pattern.name;
        // Extract class names from matches
        classNames = matches.map((m) => {
          const classMatch = m.match(/class="([^"]*)"/);
          return classMatch ? classMatch[1] : '';
        });
      }
    }

    const useBlocks = maxRepeat >= 2;
    const suggestedSettings = this.suggestSettingsForType(repeatType, useBlocks);

    return {
      useBlocks,
      repeatCount: maxRepeat,
      structure: useBlocks
        ? {
            tagName: 'div',
            classNames,
            childElements: ['heading', 'description', 'image'],
          }
        : undefined,
      suggestedSettings,
    };
  }

  /**
   * Suggest schema settings based on element type
   */
  private suggestSettingsForType(elementType: string, isBlock: boolean): SchemaSetting[] {
    const settingsMap: Record<string, SchemaSetting[]> = {
      card: [
        { type: 'image_picker', id: 'image', label: 'Image' },
        { type: 'text', id: 'title', label: 'Title', default: 'Card Title' },
        { type: 'richtext', id: 'description', label: 'Description' },
        { type: 'url', id: 'link', label: 'Link' },
      ],
      testimonial: [
        { type: 'richtext', id: 'quote', label: 'Quote' },
        { type: 'text', id: 'author', label: 'Author Name' },
        { type: 'text', id: 'role', label: 'Author Role' },
        { type: 'image_picker', id: 'avatar', label: 'Avatar' },
        { type: 'range', id: 'rating', label: 'Rating', min: 1, max: 5, default: 5 },
      ],
      feature: [
        { type: 'image_picker', id: 'icon', label: 'Icon' },
        { type: 'text', id: 'title', label: 'Title' },
        { type: 'richtext', id: 'description', label: 'Description' },
      ],
      logo: [
        { type: 'image_picker', id: 'logo_image', label: 'Logo Image' },
        { type: 'text', id: 'brand_name', label: 'Brand Name' },
        { type: 'url', id: 'link', label: 'Link' },
      ],
      slide: [
        { type: 'image_picker', id: 'image', label: 'Slide Image' },
        { type: 'text', id: 'heading', label: 'Heading' },
        { type: 'richtext', id: 'subheading', label: 'Subheading' },
        { type: 'text', id: 'button_text', label: 'Button Text' },
        { type: 'url', id: 'button_link', label: 'Button Link' },
      ],
      hero: [
        { type: 'text', id: 'heading', label: 'Heading' },
        { type: 'richtext', id: 'subheading', label: 'Subheading' },
        { type: 'text', id: 'cta_text', label: 'CTA Text' },
        { type: 'url', id: 'cta_url', label: 'CTA URL' },
        { type: 'image_picker', id: 'background_image', label: 'Background Image' },
        { type: 'color', id: 'overlay_color', label: 'Overlay Color', default: '#000000' },
        {
          type: 'range',
          id: 'overlay_opacity',
          label: 'Overlay Opacity',
          min: 0,
          max: 100,
          default: 50,
        },
      ],
    };

    return settingsMap[elementType] || [
      { type: 'text', id: 'title', label: 'Title' },
      { type: 'richtext', id: 'content', label: 'Content' },
    ];
  }

  /**
   * Generate complete schema for a section
   * Implements Section 3.2 - Schema Generation Rules
   */
  generateSchema(
    sectionName: string,
    sectionType: SectionType,
    analysis: ElementAnalysis
  ): SectionSchema {
    const formattedName = this.formatSectionName(sectionName);
    const settings: SchemaSetting[] = [];
    const blocks: SchemaBlock[] = [];
    const presets: SchemaPreset = {
      name: formattedName,
      blocks: [],
    };

    if (analysis.useBlocks) {
      // Create block type for repeating elements
      const blockType: SchemaBlock = {
        type: 'item',
        name: 'Item',
        settings: analysis.suggestedSettings,
      };
      blocks.push(blockType);

      // Add default blocks to preset
      for (let i = 0; i < Math.min(analysis.repeatCount, 3); i++) {
        presets.blocks?.push({ type: 'item' });
      }
    } else {
      // Use direct settings
      settings.push(...analysis.suggestedSettings);
    }

    // Add common section settings
    settings.unshift(
      { type: 'text', id: 'section_heading', label: 'Section Heading', default: formattedName },
      { type: 'color', id: 'background_color', label: 'Background Color', default: '#ffffff' },
      { type: 'range', id: 'padding_top', label: 'Padding Top', min: 0, max: 100, default: 40 },
      { type: 'range', id: 'padding_bottom', label: 'Padding Bottom', min: 0, max: 100, default: 40 }
    );

    return {
      name: formattedName,
      class: `section-${sectionName}`,
      settings,
      blocks: blocks.length > 0 ? blocks : undefined,
      max_blocks: blocks.length > 0 ? 12 : undefined,
      presets: [presets],
    };
  }

  /**
   * Convert multiple sections and generate complete theme structure
   */
  async convertTheme(sections: SectionInput[]): Promise<ThemeConversionResult> {
    const results: SectionOutput[] = [];
    const errors: Array<{ sectionName: string; error: string }> = [];
    let allCss = '';

    for (const section of sections) {
      try {
        const result = await this.convertSection(section);
        results.push(result);
        allCss += section.css + '\n';
      } catch (error) {
        errors.push({
          sectionName: section.sectionName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Extract global CSS
    const baseCss = this.extractGlobalCss(allCss);

    // Generate theme layout
    const themeLayout = this.generateThemeLayout(results);

    return {
      sections: results,
      baseCss,
      themeLayout,
      errors,
    };
  }

  /**
   * Generate theme.liquid layout file
   */
  private generateThemeLayout(sections: SectionOutput[]): string {
    const cssIncludes = sections
      .map((s) => `{{ '${s.cssPath.replace('assets/', '')}' | asset_url | stylesheet_tag }}`)
      .join('\n  ');

    const jsIncludes = sections
      .filter((s) => s.jsPath)
      .map((s) => `<script src="{{ '${s.jsPath?.replace('assets/', '')}' | asset_url }}" defer></script>`)
      .join('\n  ');

    return `<!doctype html>
<html class="no-js" lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="">
  <link rel="canonical" href="{{ canonical_url }}">

  {%- if settings.favicon != blank -%}
    <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
  {%- endif -%}

  <title>
    {{ page_title }}
    {%- if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif -%}
    {%- if current_page != 1 %} &ndash; Page {{ current_page }}{% endif -%}
    {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless -%}
  </title>

  {% if page_description %}
    <meta name="description" content="{{ page_description | escape }}">
  {% endif %}

  {{ content_for_header }}

  {%- liquid
    assign body_font_bold = settings.type_body_font | font_modify: 'weight', 'bold'
    assign body_font_italic = settings.type_body_font | font_modify: 'style', 'italic'
    assign body_font_bold_italic = body_font_bold | font_modify: 'style', 'italic'
  %}

  {% style %}
    {{ settings.type_body_font | font_face: font_display: 'swap' }}
    {{ body_font_bold | font_face: font_display: 'swap' }}
    {{ body_font_italic | font_face: font_display: 'swap' }}
    {{ body_font_bold_italic | font_face: font_display: 'swap' }}
    {{ settings.type_header_font | font_face: font_display: 'swap' }}

    :root {
      --font-body-family: {{ settings.type_body_font.family }}, {{ settings.type_body_font.fallback_families }};
      --font-body-style: {{ settings.type_body_font.style }};
      --font-body-weight: {{ settings.type_body_font.weight }};
      --font-heading-family: {{ settings.type_header_font.family }}, {{ settings.type_header_font.fallback_families }};
      --font-heading-style: {{ settings.type_header_font.style }};
      --font-heading-weight: {{ settings.type_header_font.weight }};
    }
  {% endstyle %}

  {{ 'base.css' | asset_url | stylesheet_tag }}
  ${cssIncludes}
</head>

<body class="template-{{ template.name }}">
  <a class="skip-to-content-link button visually-hidden" href="#MainContent">
    {{ "accessibility.skip_to_text" | t }}
  </a>

  {% sections 'header-group' %}

  <main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
    {{ content_for_layout }}
  </main>

  {% sections 'footer-group' %}

  ${jsIncludes}

  <script>
    window.shopUrl = '{{ request.origin }}';
    window.routes = {
      cart_add_url: '{{ routes.cart_add_url }}',
      cart_change_url: '{{ routes.cart_change_url }}',
      cart_update_url: '{{ routes.cart_update_url }}',
      cart_url: '{{ routes.cart_url }}',
      predictive_search_url: '{{ routes.predictive_search_url }}'
    };
  </script>
</body>
</html>`;
  }

  /**
   * Generate asset URL reference for CSS in liquid
   */
  static generateCssReference(sectionName: string): string {
    return `{{ 'section-${sectionName}.css' | asset_url | stylesheet_tag }}`;
  }

  /**
   * Generate asset URL reference for JS in liquid
   */
  static generateJsReference(sectionName: string): string {
    return `<script src="{{ 'section-${sectionName}.js' | asset_url }}" defer></script>`;
  }
}

/**
 * Helper function to create a LiquidGenerator instance
 */
export function createLiquidGenerator(options: ConversionOptions): LiquidGenerator {
  return new LiquidGenerator(options);
}

/**
 * Utility: Generate schema JSON string
 */
export function schemaToJson(schema: SectionSchema): string {
  return JSON.stringify(schema, null, 2);
}

/**
 * Utility: Wrap schema in Liquid tags
 */
export function wrapSchemaInLiquid(schema: SectionSchema): string {
  return `{% schema %}
${schemaToJson(schema)}
{% endschema %}`;
}

export default LiquidGenerator;

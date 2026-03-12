/**
 * Types for the Liquid Conversion Engine
 * Converts HTML sections into Shopify Liquid files with schema
 */

/**
 * Section types that can be identified and converted
 */
export type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'logo-grid'
  | 'cta'
  | 'footer'
  | 'header'
  | 'gallery'
  | 'pricing'
  | 'faq'
  | 'contact'
  | 'about'
  | 'blog'
  | 'product'
  | 'collection'
  | 'custom';

/**
 * Schema setting types supported by Shopify
 */
export type SchemaSettingType =
  | 'text'
  | 'richtext'
  | 'image_picker'
  | 'url'
  | 'color'
  | 'checkbox'
  | 'range'
  | 'select'
  | 'textarea'
  | 'video_url'
  | 'font_picker'
  | 'collection'
  | 'product'
  | 'blog'
  | 'page'
  | 'link_list'
  | 'article'
  | 'html'
  | 'liquid';

/**
 * Individual schema setting configuration
 */
export interface SchemaSetting {
  type: SchemaSettingType;
  id: string;
  label: string;
  default?: string | number | boolean;
  info?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
}

/**
 * Block type definition for repeating elements
 */
export interface SchemaBlock {
  type: string;
  name: string;
  settings: SchemaSetting[];
  limit?: number;
}

/**
 * Preset definition for section defaults
 */
export interface SchemaPreset {
  name: string;
  settings?: Record<string, unknown>;
  blocks?: Array<{
    type: string;
    settings?: Record<string, unknown>;
  }>;
}

/**
 * Complete section schema structure
 */
export interface SectionSchema {
  name: string;
  class: string;
  tag?: string;
  settings: SchemaSetting[];
  blocks?: SchemaBlock[];
  max_blocks?: number;
  presets: SchemaPreset[];
  disabled_on?: {
    groups?: string[];
    templates?: string[];
  };
  enabled_on?: {
    groups?: string[];
    templates?: string[];
  };
}

/**
 * Input for section conversion
 */
export interface SectionInput {
  /** Raw HTML string of the section */
  html: string;
  /** Base64 encoded PNG screenshot of the section */
  screenshot?: string;
  /** Scoped CSS string for this section */
  css: string;
  /** Identified section type */
  sectionType: SectionType;
  /** Original section name/identifier */
  sectionName: string;
}

/**
 * Output from section conversion
 */
export interface SectionOutput {
  /** Generated Liquid template content */
  liquidContent: string;
  /** Section schema */
  schema: SectionSchema;
  /** Scoped CSS for this section */
  scopedCss: string;
  /** Section-specific JavaScript (if any) */
  javascript?: string;
  /** File path for the liquid file */
  liquidPath: string;
  /** File path for the CSS file */
  cssPath: string;
  /** File path for the JS file (if applicable) */
  jsPath?: string;
}

/**
 * Configuration for CSS extraction and scoping
 */
export interface CssScopingConfig {
  /** Section name for scoping */
  sectionName: string;
  /** Original merged CSS */
  originalCss: string;
  /** Class names found in section HTML */
  classNames: string[];
}

/**
 * Parsed CSS rule with selector and declarations
 */
export interface ParsedCssRule {
  selector: string;
  declarations: string;
  isGlobal: boolean;
}

/**
 * JavaScript handling result
 */
export interface JsHandlingResult {
  /** Converted vanilla JS code */
  vanillaJs: string;
  /** Whether the JS was successfully converted */
  converted: boolean;
  /** Original framework detected (if any) */
  originalFramework?: string;
  /** Any warnings or notes about the conversion */
  warnings?: string[];
}

/**
 * Element analysis for blocks vs settings decision
 */
export interface ElementAnalysis {
  /** Whether element should use blocks */
  useBlocks: boolean;
  /** Number of repeating elements found */
  repeatCount: number;
  /** Common structure of repeating elements */
  structure?: {
    tagName: string;
    classNames: string[];
    childElements: string[];
  };
  /** Suggested settings for the element(s) */
  suggestedSettings: SchemaSetting[];
}

/**
 * AI prompt input for Gemini API
 */
export interface GeminiPromptInput {
  /** System prompt for the AI */
  systemPrompt: string;
  /** Section HTML */
  sectionHtml: string;
  /** Section screenshot (base64) */
  screenshot?: string;
  /** Extracted CSS */
  css: string;
  /** Section type */
  sectionType: SectionType;
}

/**
 * Conversion options
 */
export interface ConversionOptions {
  /** Whether to include screenshots in AI prompts */
  includeScreenshots: boolean;
  /** Whether to generate scoped CSS */
  scopeCss: boolean;
  /** Whether to handle JavaScript */
  handleJavascript: boolean;
  /** Output directory for generated files */
  outputDir: string;
  /** Gemini API key */
  geminiApiKey: string;
}

/**
 * Full conversion result for a complete theme
 */
export interface ThemeConversionResult {
  /** All converted sections */
  sections: SectionOutput[];
  /** Global base CSS */
  baseCss: string;
  /** Theme layout liquid content */
  themeLayout: string;
  /** Any errors encountered */
  errors: Array<{
    sectionName: string;
    error: string;
  }>;
}

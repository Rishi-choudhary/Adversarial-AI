/**
 * ThemeForge Converter Module
 * 
 * Exports all converter functionality for HTML to Shopify Liquid conversion
 */

// Gemini Client
export { 
  GeminiClient, 
  buildLiquidConversionPrompt,
  type GeminiClientConfig,
  type ConversionInput,
  type ConversionResult
} from './geminiClient';

// CSS Scoper
export { 
  scopeCss, 
  generateSectionCssFile,
  type CssScopingOptions,
  type ScopedCssResult
} from './cssScoper';

// Schema Builder
export {
  buildSectionSchema,
  generateDefaultSettings,
  generateSettingsFromContent,
  generateBlockSchema,
  schemaToLiquid,
  parseSchemaFromLiquid,
  type SchemaSettings,
  type BlockSchema,
  type SectionSchema,
  type SchemaBuilderOptions,
  type ExtractedContent
} from './schemaBuilder';

// Liquid Generator (main orchestrator)
export {
  LiquidGenerator,
  extractContentFromHtml,
  generateSectionJs,
  postProcessLiquid,
  type LiquidGeneratorConfig,
  type SectionInput,
  type GeneratedSection,
  type GenerationResult
} from './liquidGenerator';

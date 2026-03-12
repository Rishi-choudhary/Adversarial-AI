/**
 * Liquid Conversion Engine
 * Main entry point for the converter module
 */

export { LiquidGenerator, createLiquidGenerator, schemaToJson, wrapSchemaInLiquid } from './liquidGenerator';

export type {
  SectionType,
  SchemaSettingType,
  SchemaSetting,
  SchemaBlock,
  SchemaPreset,
  SectionSchema,
  SectionInput,
  SectionOutput,
  CssScopingConfig,
  ParsedCssRule,
  JsHandlingResult,
  ElementAnalysis,
  GeminiPromptInput,
  ConversionOptions,
  ThemeConversionResult,
} from './types';

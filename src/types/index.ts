/**
 * Type definitions for Shopify Theme Builder
 */

/**
 * Design tokens extracted from CSS
 */
export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontBody: string;
  fontHeading: string;
  logoImage: string | null;
}

/**
 * Section settings for templates
 */
export interface SectionSettings {
  [key: string]: string | number | boolean | null;
}

/**
 * Block within a section
 */
export interface SectionBlock {
  type: string;
  settings: SectionSettings;
}

/**
 * Section definition for templates
 */
export interface Section {
  type: string;
  settings?: SectionSettings;
  blocks?: Record<string, SectionBlock>;
  block_order?: string[];
}

/**
 * Template JSON structure
 */
export interface TemplateJson {
  sections: Record<string, Section>;
  order: string[];
}

/**
 * Settings schema setting item
 */
export interface SettingItem {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Settings schema section
 */
export interface SettingsSchemaSection {
  name: string;
  settings?: SettingItem[];
  theme_name?: string;
  theme_version?: string;
  theme_author?: string;
  theme_documentation_url?: string;
}

/**
 * Image mapping for URL to asset filename
 */
export interface ImageMapping {
  originalUrl: string;
  assetFilename: string;
  hash: string;
}

/**
 * Extracted assets from the original site
 */
export interface ExtractedAssets {
  logo: string | null;
  images: ImageMapping[];
  icons: string[];
}

/**
 * Parsed CSS variables
 */
export interface ParsedCSS {
  variables: Record<string, string>;
  bodyFont: string | null;
  headingFont: string | null;
}

/**
 * Section data for theme building
 */
export interface SectionData {
  id: string;
  type: string;
  html: string;
  liquid: string;
  css: string;
  js: string;
  settings: SectionSettings;
  blocks?: Array<{
    id: string;
    type: string;
    settings: SectionSettings;
  }>;
}

/**
 * Theme files map (path -> content)
 */
export type ThemeFiles = Map<string, string | Buffer>;

/**
 * Theme configuration options
 */
export interface ThemeConfig {
  themeName: string;
  themeVersion: string;
  themeAuthor: string;
  themeDocumentationUrl: string;
}

/**
 * Image download result
 */
export interface ImageDownloadResult {
  success: boolean;
  originalUrl: string;
  filename?: string;
  buffer?: Buffer;
  error?: string;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  quality: number;
  format: 'webp' | 'png' | 'jpeg';
  maxConcurrency: number;
}

/**
 * Localization strings
 */
export interface LocaleStrings {
  [key: string]: string | LocaleStrings;
}

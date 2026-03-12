/**
 * Shopify Theme Assembler
 * 
 * Assembles a complete Shopify theme from extracted sections,
 * assets, and design tokens into a ZIP file ready for upload.
 * 
 * File: src/assembler/themeBuilder.ts
 */

import JSZip from 'jszip';
import {
  ThemeFiles,
  ThemeConfig,
  DesignTokens,
  TemplateJson,
  Section,
  SectionSettings,
  SectionData,
  SettingsSchemaSection,
  SettingItem,
  ExtractedAssets,
  ParsedCSS,
  LocaleStrings,
} from '../types';

/**
 * Default theme configuration
 */
const DEFAULT_CONFIG: ThemeConfig = {
  themeName: 'ThemeForge Generated',
  themeVersion: '1.0.0',
  themeAuthor: 'ThemeForge',
  themeDocumentationUrl: 'https://themeforge.app',
};

/**
 * Default design tokens
 */
const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  accentColor: '#0066cc',
  fontBody: 'sans-serif',
  fontHeading: 'sans-serif',
  logoImage: null,
};

/**
 * ThemeBuilder class for assembling Shopify themes
 */
export class ThemeBuilder {
  private themeFiles: ThemeFiles = new Map();
  private config: ThemeConfig;
  private designTokens: DesignTokens;

  constructor(config?: Partial<ThemeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.designTokens = { ...DEFAULT_DESIGN_TOKENS };
  }

  /**
   * Extract design tokens from parsed CSS
   */
  public extractDesignTokens(parsedCSS: ParsedCSS, extractedAssets: ExtractedAssets): DesignTokens {
    this.designTokens = {
      primaryColor: parsedCSS.variables['--color-primary'] || DEFAULT_DESIGN_TOKENS.primaryColor,
      secondaryColor: parsedCSS.variables['--color-secondary'] || DEFAULT_DESIGN_TOKENS.secondaryColor,
      accentColor: parsedCSS.variables['--color-accent'] || DEFAULT_DESIGN_TOKENS.accentColor,
      fontBody: parsedCSS.bodyFont || DEFAULT_DESIGN_TOKENS.fontBody,
      fontHeading: parsedCSS.headingFont || DEFAULT_DESIGN_TOKENS.fontHeading,
      logoImage: extractedAssets.logo || null,
    };
    return this.designTokens;
  }

  /**
   * Set design tokens directly
   */
  public setDesignTokens(tokens: Partial<DesignTokens>): void {
    this.designTokens = { ...this.designTokens, ...tokens };
  }

  /**
   * Generate layout/theme.liquid
   */
  public generateThemeLiquid(): string {
    return `<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="{{ settings.color_background }}">
  
  <title>{{ page_title }}{% if current_tags %} – {{ current_tags | join: ', ' }}{% endif %}</title>
  <meta name="description" content="{{ page_description | escape }}">
  
  {{ content_for_header }}
  
  {{- 'base.css' | asset_url | stylesheet_tag -}}
  <script src="{{ 'theme.js' | asset_url }}" defer="defer"></script>
</head>

<body class="gradient">
  {% section 'header' %}
  
  <main id="MainContent" role="main" tabindex="-1">
    {{ content_for_layout }}
  </main>
  
  {% section 'footer' %}
</body>
</html>`;
  }

  /**
   * Generate templates/index.json based on detected sections
   */
  public generateIndexTemplate(sections: SectionData[]): TemplateJson {
    const templateSections: Record<string, Section> = {};
    const order: string[] = [];

    for (const section of sections) {
      const sectionId = section.id;
      order.push(sectionId);

      const sectionDef: Section = {
        type: section.type,
        settings: { ...section.settings },
      };

      // Add blocks if present
      if (section.blocks && section.blocks.length > 0) {
        sectionDef.blocks = {};
        sectionDef.block_order = [];
        
        for (const block of section.blocks) {
          sectionDef.blocks[block.id] = {
            type: block.type,
            settings: { ...block.settings },
          };
          sectionDef.block_order.push(block.id);
        }
      }

      templateSections[sectionId] = sectionDef;
    }

    return {
      sections: templateSections,
      order,
    };
  }

  /**
   * Generate config/settings_schema.json
   */
  public generateSettingsSchema(): SettingsSchemaSection[] {
    const schema: SettingsSchemaSection[] = [
      {
        name: 'theme_info',
        theme_name: this.config.themeName,
        theme_version: this.config.themeVersion,
        theme_author: this.config.themeAuthor,
        theme_documentation_url: this.config.themeDocumentationUrl,
      },
      {
        name: 'Colors',
        settings: [
          {
            type: 'color',
            id: 'color_primary',
            label: 'Primary',
            default: this.designTokens.primaryColor,
          },
          {
            type: 'color',
            id: 'color_secondary',
            label: 'Secondary',
            default: this.designTokens.secondaryColor,
          },
          {
            type: 'color',
            id: 'color_accent',
            label: 'Accent',
            default: this.designTokens.accentColor,
          },
          {
            type: 'color',
            id: 'color_background',
            label: 'Background',
            default: '#ffffff',
          },
          {
            type: 'color',
            id: 'color_text',
            label: 'Text',
            default: '#121212',
          },
        ],
      },
      {
        name: 'Typography',
        settings: [
          {
            type: 'font_picker',
            id: 'font_body',
            label: 'Body font',
            default: this.mapFontToShopify(this.designTokens.fontBody, '4'),
          },
          {
            type: 'font_picker',
            id: 'font_heading',
            label: 'Heading font',
            default: this.mapFontToShopify(this.designTokens.fontHeading, '7'),
          },
          {
            type: 'range',
            id: 'font_body_scale',
            label: 'Body font scale',
            min: 100,
            max: 150,
            step: 5,
            default: 100,
          },
          {
            type: 'range',
            id: 'font_heading_scale',
            label: 'Heading font scale',
            min: 100,
            max: 150,
            step: 5,
            default: 100,
          },
        ],
      },
      {
        name: 'Logo',
        settings: [
          {
            type: 'image_picker',
            id: 'logo',
            label: 'Logo image',
          },
          {
            type: 'range',
            id: 'logo_width',
            label: 'Logo width',
            min: 50,
            max: 300,
            step: 10,
            default: 150,
          },
          {
            type: 'image_picker',
            id: 'favicon',
            label: 'Favicon',
            info: 'Will be scaled down to 32 x 32px',
          },
        ],
      },
      {
        name: 'Social media',
        settings: [
          {
            type: 'text',
            id: 'social_twitter_link',
            label: 'Twitter',
            info: 'https://twitter.com/shopify',
          },
          {
            type: 'text',
            id: 'social_facebook_link',
            label: 'Facebook',
            info: 'https://facebook.com/shopify',
          },
          {
            type: 'text',
            id: 'social_instagram_link',
            label: 'Instagram',
            info: 'https://instagram.com/shopify',
          },
          {
            type: 'text',
            id: 'social_youtube_link',
            label: 'YouTube',
            info: 'https://youtube.com/shopify',
          },
        ],
      },
    ];

    return schema;
  }

  /**
   * Map font family to Shopify font picker format
   */
  private mapFontToShopify(fontFamily: string, weight: string): string {
    // Map common fonts to Shopify font picker format
    const fontMap: Record<string, string> = {
      'sans-serif': 'assistant',
      'serif': 'bodoni_moda',
      'monospace': 'anonymous_pro',
      'Arial': 'assistant',
      'Helvetica': 'assistant',
      'Georgia': 'bodoni_moda',
      'Times New Roman': 'bodoni_moda',
    };

    const normalizedFont = fontFamily.replace(/['"]/g, '').trim();
    const shopifyFont = fontMap[normalizedFont] || 'assistant';
    return `${shopifyFont}_n${weight}`;
  }

  /**
   * Generate config/settings_data.json with default values
   */
  public generateSettingsData(customSettings?: Record<string, unknown>): Record<string, unknown> {
    const settings: Record<string, unknown> = {
      color_primary: this.designTokens.primaryColor,
      color_secondary: this.designTokens.secondaryColor,
      color_accent: this.designTokens.accentColor,
      color_background: '#ffffff',
      color_text: '#121212',
      font_body: this.mapFontToShopify(this.designTokens.fontBody, '4'),
      font_heading: this.mapFontToShopify(this.designTokens.fontHeading, '7'),
      font_body_scale: 100,
      font_heading_scale: 100,
      logo_width: 150,
      ...customSettings,
    };

    return {
      current: {
        ...settings,
      },
    };
  }

  /**
   * Generate locales/en.default.json
   */
  public generateLocaleStrings(): LocaleStrings {
    return {
      general: {
        password_page: {
          login_form_heading: 'Enter store using password:',
          login_form_password_label: 'Password',
          login_form_password_placeholder: 'Your password',
          login_form_submit: 'Enter',
        },
        social: {
          share: 'Share',
          share_on_facebook: 'Share on Facebook',
          share_on_twitter: 'Tweet on Twitter',
          share_on_pinterest: 'Pin on Pinterest',
        },
        search: {
          search: 'Search',
          reset: 'Clear search term',
        },
      },
      accessibility: {
        skip_to_content: 'Skip to content',
        close: 'Close',
        unit_price_separator: 'per',
        refresh_page: 'Choosing a selection results in a full page refresh.',
        link_messages: {
          new_window: 'Opens in a new window.',
          external: 'Opens external website.',
        },
      },
      cart: {
        title: 'Cart',
        empty: 'Your cart is empty',
        continue_shopping: 'Continue shopping',
        view_cart: 'View my cart',
        checkout: 'Check out',
        remove: 'Remove',
        update: 'Update',
        note: 'Order special instructions',
        subtotal: 'Subtotal',
      },
      sections: {
        header: {
          menu: 'Menu',
          cart_count: {
            one: '{{ count }} item',
            other: '{{ count }} items',
          },
        },
        footer: {
          payment_methods: 'Payment methods',
        },
      },
    };
  }

  /**
   * Generate a section liquid file
   */
  public generateSectionLiquid(section: SectionData): string {
    // Return the liquid content with schema
    const schema = this.generateSectionSchema(section);
    return `${section.liquid}

{% schema %}
${JSON.stringify(schema, null, 2)}
{% endschema %}`;
  }

  /**
   * Generate section schema from section data
   */
  private generateSectionSchema(section: SectionData): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      name: this.formatSectionName(section.type),
      tag: 'section',
      class: `section-${section.type}`,
      settings: this.generateSchemaSettings(section.settings),
    };

    // Add blocks if present
    if (section.blocks && section.blocks.length > 0) {
      const blockTypes = new Map<string, SectionSettings>();
      for (const block of section.blocks) {
        if (!blockTypes.has(block.type)) {
          blockTypes.set(block.type, block.settings);
        }
      }

      schema.blocks = Array.from(blockTypes.entries()).map(([type, settings]) => ({
        type,
        name: this.formatSectionName(type),
        settings: this.generateSchemaSettings(settings),
      }));

      schema.max_blocks = 16;
    }

    // Add presets for sections that can be added dynamically
    if (!['header', 'footer'].includes(section.type)) {
      schema.presets = [
        {
          name: this.formatSectionName(section.type),
        },
      ];
    }

    return schema;
  }

  /**
   * Format section name for display
   */
  private formatSectionName(type: string): string {
    return type
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Generate schema settings from section settings
   */
  private generateSchemaSettings(settings: SectionSettings): SettingItem[] {
    const schemaSettings: SettingItem[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const setting = this.inferSettingType(key, value);
      if (setting) {
        schemaSettings.push(setting);
      }
    }

    return schemaSettings;
  }

  /**
   * Infer setting type from key and value
   */
  private inferSettingType(key: string, value: unknown): SettingItem | null {
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    // Image-related keys
    if (key.includes('image') || key.includes('logo') || key.includes('icon') || key.includes('background')) {
      if (typeof value === 'string' && value.includes('.')) {
        return {
          type: 'image_picker',
          id: key,
          label,
        };
      }
    }

    // URL-related keys
    if (key.includes('url') || key.includes('link')) {
      return {
        type: 'url',
        id: key,
        label,
        default: typeof value === 'string' ? value : '/',
      };
    }

    // Color-related keys
    if (key.includes('color')) {
      return {
        type: 'color',
        id: key,
        label,
        default: typeof value === 'string' ? value : '#000000',
      };
    }

    // Boolean values
    if (typeof value === 'boolean') {
      return {
        type: 'checkbox',
        id: key,
        label,
        default: value,
      };
    }

    // Number values
    if (typeof value === 'number') {
      return {
        type: 'range',
        id: key,
        label,
        min: 0,
        max: Math.max(value * 2, 100),
        step: 1,
        default: value,
      };
    }

    // Text values (default)
    if (typeof value === 'string') {
      // Check if it's a rich text field (contains HTML or is long)
      if (value.includes('<') || value.length > 200) {
        return {
          type: 'richtext',
          id: key,
          label,
        };
      }

      // Check if it looks like a heading or title
      if (key.includes('heading') || key.includes('title')) {
        return {
          type: 'text',
          id: key,
          label,
          default: value,
        };
      }

      // Regular text
      return {
        type: 'text',
        id: key,
        label,
        default: value,
      };
    }

    return null;
  }

  /**
   * Add a file to the theme
   */
  public addFile(path: string, content: string | Buffer): void {
    this.themeFiles.set(path, content);
  }

  /**
   * Add an asset file
   */
  public addAsset(filename: string, content: string | Buffer): void {
    this.addFile(`assets/${filename}`, content);
  }

  /**
   * Add a section file
   */
  public addSection(sectionName: string, content: string): void {
    this.addFile(`sections/${sectionName}.liquid`, content);
  }

  /**
   * Add a snippet file
   */
  public addSnippet(snippetName: string, content: string): void {
    this.addFile(`snippets/${snippetName}.liquid`, content);
  }

  /**
   * Add a template file
   */
  public addTemplate(templateName: string, content: TemplateJson | Record<string, unknown>): void {
    this.addFile(`templates/${templateName}.json`, JSON.stringify(content, null, 2));
  }

  /**
   * Build the complete theme
   */
  public async buildTheme(
    sections: SectionData[],
    baseCSS: string,
    themeJS: string,
    extractedAssets: ExtractedAssets,
    assetFiles: Map<string, Buffer>
  ): Promise<void> {
    // Add layout
    this.addFile('layout/theme.liquid', this.generateThemeLiquid());

    // Add config files
    this.addFile('config/settings_schema.json', JSON.stringify(this.generateSettingsSchema(), null, 2));
    this.addFile('config/settings_data.json', JSON.stringify(this.generateSettingsData(), null, 2));

    // Add locales
    this.addFile('locales/en.default.json', JSON.stringify(this.generateLocaleStrings(), null, 2));

    // Add base assets
    this.addAsset('base.css', baseCSS);
    this.addAsset('theme.js', themeJS);

    // Add sections
    for (const section of sections) {
      const sectionLiquid = this.generateSectionLiquid(section);
      this.addSection(section.type, sectionLiquid);

      // Add section-specific CSS and JS if present
      if (section.css) {
        this.addAsset(`section-${section.type}.css`, section.css);
      }
      if (section.js) {
        this.addAsset(`section-${section.type}.js`, section.js);
      }
    }

    // Add templates
    this.addTemplate('index', this.generateIndexTemplate(sections));
    this.addTemplate('product', this.generateProductTemplate());
    this.addTemplate('collection', this.generateCollectionTemplate());
    this.addTemplate('page', this.generatePageTemplate());
    this.addTemplate('blog', this.generateBlogTemplate());
    this.addTemplate('article', this.generateArticleTemplate());
    this.addTemplate('cart', this.generateCartTemplate());
    this.addTemplate('404', this.generate404Template());

    // Add asset files (images, etc.)
    for (const [filename, content] of assetFiles) {
      this.addAsset(filename, content);
    }

    // Add icon snippets from extracted assets
    for (let i = 0; i < extractedAssets.icons.length; i++) {
      this.addSnippet(`icon-${i + 1}`, extractedAssets.icons[i]);
    }
  }

  /**
   * Generate product template
   */
  private generateProductTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'product',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate collection template
   */
  private generateCollectionTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'collection',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate page template
   */
  private generatePageTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'page',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate blog template
   */
  private generateBlogTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'blog',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate article template
   */
  private generateArticleTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'article',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate cart template
   */
  private generateCartTemplate(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: 'cart',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Generate 404 template
   */
  private generate404Template(): Record<string, unknown> {
    return {
      sections: {
        main: {
          type: '404',
          settings: {},
        },
      },
      order: ['main'],
    };
  }

  /**
   * Get all theme files
   */
  public getThemeFiles(): ThemeFiles {
    return this.themeFiles;
  }

  /**
   * Assemble the theme into a ZIP file
   */
  public async assembleZip(): Promise<Buffer> {
    const zip = new JSZip();
    const theme = zip.folder('theme');

    if (!theme) {
      throw new Error('Failed to create theme folder in ZIP');
    }

    // Create all directories
    theme.folder('assets');
    theme.folder('config');
    theme.folder('layout');
    theme.folder('locales');
    theme.folder('sections');
    theme.folder('snippets');
    theme.folder('templates');

    // Add each file content
    for (const [path, content] of this.themeFiles.entries()) {
      theme.file(path, content);
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return zipBuffer;
  }

  /**
   * Clear all theme files (for reuse)
   */
  public clear(): void {
    this.themeFiles.clear();
  }
}

/**
 * Replace image URLs with Shopify asset URLs in content
 */
export function replaceImageUrls(content: string, imageMap: Map<string, string>): string {
  let result = content;

  for (const [originalUrl, assetFilename] of imageMap) {
    // Escape special regex characters in URL
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedUrl, 'g');
    result = result.replace(regex, `{{ '${assetFilename}' | asset_url }}`);
  }

  return result;
}

/**
 * Create a new ThemeBuilder instance
 */
export function createThemeBuilder(config?: Partial<ThemeConfig>): ThemeBuilder {
  return new ThemeBuilder(config);
}

export default ThemeBuilder;

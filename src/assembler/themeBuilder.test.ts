/**
 * Tests for ThemeBuilder
 */

import { ThemeBuilder, createThemeBuilder, replaceImageUrls } from './themeBuilder';
import {
  SectionData,
  ParsedCSS,
  ExtractedAssets,
} from '../types';

describe('ThemeBuilder', () => {
  let builder: ThemeBuilder;

  beforeEach(() => {
    builder = createThemeBuilder();
  });

  afterEach(() => {
    builder.clear();
  });

  describe('constructor', () => {
    it('should create a ThemeBuilder with default config', () => {
      expect(builder).toBeInstanceOf(ThemeBuilder);
    });

    it('should create a ThemeBuilder with custom config', () => {
      const customBuilder = createThemeBuilder({
        themeName: 'Custom Theme',
        themeVersion: '2.0.0',
      });
      expect(customBuilder).toBeInstanceOf(ThemeBuilder);
    });
  });

  describe('generateThemeLiquid', () => {
    it('should generate valid theme.liquid content', () => {
      const liquid = builder.generateThemeLiquid();

      expect(liquid).toContain('<!doctype html>');
      expect(liquid).toContain('{{ content_for_header }}');
      expect(liquid).toContain('{{ content_for_layout }}');
      expect(liquid).toContain("{% section 'header' %}");
      expect(liquid).toContain("{% section 'footer' %}");
      expect(liquid).toContain("'base.css' | asset_url | stylesheet_tag");
      expect(liquid).toContain("'theme.js' | asset_url");
    });

    it('should include viewport meta tag', () => {
      const liquid = builder.generateThemeLiquid();
      expect(liquid).toContain('name="viewport"');
    });

    it('should include page title template', () => {
      const liquid = builder.generateThemeLiquid();
      expect(liquid).toContain('{{ page_title }}');
    });
  });

  describe('generateIndexTemplate', () => {
    it('should generate index template from sections', () => {
      const sections: SectionData[] = [
        {
          id: 'hero',
          type: 'hero',
          html: '<section>Hero</section>',
          liquid: '<section>Hero</section>',
          css: '',
          js: '',
          settings: {
            heading: 'Welcome',
            subheading: 'To our store',
          },
        },
        {
          id: 'features',
          type: 'features',
          html: '<section>Features</section>',
          liquid: '<section>Features</section>',
          css: '',
          js: '',
          settings: {},
          blocks: [
            {
              id: 'feature_1',
              type: 'item',
              settings: { title: 'Feature 1' },
            },
          ],
        },
      ];

      const template = builder.generateIndexTemplate(sections);

      expect(template.order).toEqual(['hero', 'features']);
      expect(template.sections.hero).toBeDefined();
      expect(template.sections.hero.type).toBe('hero');
      expect(template.sections.hero.settings?.heading).toBe('Welcome');
      expect(template.sections.features.blocks).toBeDefined();
      expect(template.sections.features.blocks?.feature_1).toBeDefined();
    });

    it('should handle empty sections array', () => {
      const template = builder.generateIndexTemplate([]);
      expect(template.order).toEqual([]);
      expect(Object.keys(template.sections)).toHaveLength(0);
    });
  });

  describe('generateSettingsSchema', () => {
    it('should generate valid settings schema', () => {
      const schema = builder.generateSettingsSchema();

      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThan(0);

      // Check theme info
      const themeInfo = schema.find((s) => s.name === 'theme_info');
      expect(themeInfo).toBeDefined();
      expect(themeInfo?.theme_name).toBe('ThemeForge Generated');

      // Check colors section
      const colors = schema.find((s) => s.name === 'Colors');
      expect(colors).toBeDefined();
      expect(colors?.settings).toBeDefined();
      expect(colors?.settings?.some((s) => s.id === 'color_primary')).toBe(true);

      // Check typography section
      const typography = schema.find((s) => s.name === 'Typography');
      expect(typography).toBeDefined();
      expect(typography?.settings?.some((s) => s.type === 'font_picker')).toBe(true);

      // Check logo section
      const logo = schema.find((s) => s.name === 'Logo');
      expect(logo).toBeDefined();
      expect(logo?.settings?.some((s) => s.id === 'logo')).toBe(true);
    });
  });

  describe('extractDesignTokens', () => {
    it('should extract design tokens from parsed CSS', () => {
      const parsedCSS: ParsedCSS = {
        variables: {
          '--color-primary': '#ff0000',
          '--color-secondary': '#00ff00',
          '--color-accent': '#0000ff',
        },
        bodyFont: 'Arial',
        headingFont: 'Georgia',
      };

      const extractedAssets: ExtractedAssets = {
        logo: 'logo.png',
        images: [],
        icons: [],
      };

      const tokens = builder.extractDesignTokens(parsedCSS, extractedAssets);

      expect(tokens.primaryColor).toBe('#ff0000');
      expect(tokens.secondaryColor).toBe('#00ff00');
      expect(tokens.accentColor).toBe('#0000ff');
      expect(tokens.fontBody).toBe('Arial');
      expect(tokens.fontHeading).toBe('Georgia');
      expect(tokens.logoImage).toBe('logo.png');
    });

    it('should use defaults when CSS variables are missing', () => {
      const parsedCSS: ParsedCSS = {
        variables: {},
        bodyFont: null,
        headingFont: null,
      };

      const extractedAssets: ExtractedAssets = {
        logo: null,
        images: [],
        icons: [],
      };

      const tokens = builder.extractDesignTokens(parsedCSS, extractedAssets);

      expect(tokens.primaryColor).toBe('#000000');
      expect(tokens.secondaryColor).toBe('#ffffff');
      expect(tokens.accentColor).toBe('#0066cc');
      expect(tokens.fontBody).toBe('sans-serif');
      expect(tokens.fontHeading).toBe('sans-serif');
      expect(tokens.logoImage).toBeNull();
    });
  });

  describe('generateSettingsData', () => {
    it('should generate settings data with defaults', () => {
      const settingsData = builder.generateSettingsData();

      expect(settingsData.current).toBeDefined();
      const current = settingsData.current as Record<string, unknown>;
      expect(current.color_primary).toBeDefined();
      expect(current.color_secondary).toBeDefined();
      expect(current.font_body).toBeDefined();
    });

    it('should include custom settings', () => {
      const settingsData = builder.generateSettingsData({
        custom_setting: 'custom_value',
      });

      const current = settingsData.current as Record<string, unknown>;
      expect(current.custom_setting).toBe('custom_value');
    });
  });

  describe('generateLocaleStrings', () => {
    it('should generate valid locale strings', () => {
      const locales = builder.generateLocaleStrings();

      expect(locales.general).toBeDefined();
      expect(locales.accessibility).toBeDefined();
      expect(locales.cart).toBeDefined();
      expect(locales.sections).toBeDefined();
    });

    it('should include skip to content translation', () => {
      const locales = builder.generateLocaleStrings();
      const accessibility = locales.accessibility as Record<string, unknown>;
      expect(accessibility.skip_to_content).toBe('Skip to content');
    });
  });

  describe('addFile methods', () => {
    it('should add files to theme', () => {
      builder.addFile('test/file.txt', 'content');
      const files = builder.getThemeFiles();
      expect(files.get('test/file.txt')).toBe('content');
    });

    it('should add assets', () => {
      builder.addAsset('test.css', 'body {}');
      const files = builder.getThemeFiles();
      expect(files.get('assets/test.css')).toBe('body {}');
    });

    it('should add sections', () => {
      builder.addSection('hero', '<section>Hero</section>');
      const files = builder.getThemeFiles();
      expect(files.get('sections/hero.liquid')).toBe('<section>Hero</section>');
    });

    it('should add snippets', () => {
      builder.addSnippet('icon-arrow', '<svg></svg>');
      const files = builder.getThemeFiles();
      expect(files.get('snippets/icon-arrow.liquid')).toBe('<svg></svg>');
    });

    it('should add templates', () => {
      const templateData = { sections: {}, order: [] };
      builder.addTemplate('index', templateData);
      const files = builder.getThemeFiles();
      expect(JSON.parse(files.get('templates/index.json') as string)).toEqual(templateData);
    });
  });

  describe('generateSectionLiquid', () => {
    it('should generate section liquid with schema', () => {
      const section: SectionData = {
        id: 'hero',
        type: 'hero',
        html: '<section>Hero</section>',
        liquid: '<section>Hero Liquid</section>',
        css: '',
        js: '',
        settings: {
          heading: 'Welcome',
        },
      };

      const liquid = builder.generateSectionLiquid(section);

      expect(liquid).toContain('<section>Hero Liquid</section>');
      expect(liquid).toContain('{% schema %}');
      expect(liquid).toContain('{% endschema %}');
      expect(liquid).toContain('"name": "Hero"');
    });
  });

  describe('assembleZip', () => {
    it('should create a valid ZIP buffer', async () => {
      builder.addFile('layout/theme.liquid', builder.generateThemeLiquid());
      builder.addAsset('base.css', 'body {}');

      const zipBuffer = await builder.assembleZip();

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all theme files', () => {
      builder.addFile('test.txt', 'content');
      expect(builder.getThemeFiles().size).toBe(1);

      builder.clear();
      expect(builder.getThemeFiles().size).toBe(0);
    });
  });
});

describe('replaceImageUrls', () => {
  it('should replace image URLs with Shopify asset URLs', () => {
    const content = 'background: url("https://example.com/image.png")';
    const imageMap = new Map([
      ['https://example.com/image.png', 'image-example-abc123.webp'],
    ]);

    const result = replaceImageUrls(content, imageMap);

    expect(result).toBe("background: url(\"{{ 'image-example-abc123.webp' | asset_url }}\")");
  });

  it('should handle multiple replacements', () => {
    const content = `
      <img src="https://example.com/img1.png">
      <img src="https://example.com/img2.png">
    `;
    const imageMap = new Map([
      ['https://example.com/img1.png', 'image-1-abc.webp'],
      ['https://example.com/img2.png', 'image-2-def.webp'],
    ]);

    const result = replaceImageUrls(content, imageMap);

    expect(result).toContain("{{ 'image-1-abc.webp' | asset_url }}");
    expect(result).toContain("{{ 'image-2-def.webp' | asset_url }}");
  });

  it('should escape special characters in URLs', () => {
    const content = 'url("https://example.com/image[1].png?v=123")';
    const imageMap = new Map([
      ['https://example.com/image[1].png?v=123', 'image-special-xyz.webp'],
    ]);

    const result = replaceImageUrls(content, imageMap);

    expect(result).toBe("url(\"{{ 'image-special-xyz.webp' | asset_url }}\")");
  });
});

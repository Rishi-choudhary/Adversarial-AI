/**
 * Schema Builder - Generates Shopify section schema JSON
 * Analyzes HTML content to automatically generate appropriate settings
 */

export interface SchemaSettings {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
  placeholder?: string;
  info?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface BlockSchema {
  type: string;
  name: string;
  settings: SchemaSettings[];
  limit?: number;
}

export interface SectionSchema {
  name: string;
  class?: string;
  tag?: string;
  settings: SchemaSettings[];
  blocks?: BlockSchema[];
  max_blocks?: number;
  presets?: Array<{
    name: string;
    blocks?: Array<{ type: string }>;
  }>;
}

export interface SchemaBuilderOptions {
  sectionName: string;
  sectionType?: string;
  includeDefaultSettings?: boolean;
  extractedContent?: ExtractedContent;
}

export interface ExtractedContent {
  headings: string[];
  texts: string[];
  images: string[];
  links: Array<{ url: string; text: string }>;
  colors: string[];
  backgroundImages: string[];
}

/**
 * Generate default settings that every section should have
 */
export function generateDefaultSettings(): SchemaSettings[] {
  return [
    {
      type: 'color',
      id: 'background_color',
      label: 'Background color',
      default: '#FFFFFF'
    },
    {
      type: 'range',
      id: 'padding_top',
      label: 'Padding top',
      min: 0,
      max: 100,
      step: 4,
      unit: 'px',
      default: 60
    },
    {
      type: 'range',
      id: 'padding_bottom',
      label: 'Padding bottom',
      min: 0,
      max: 100,
      step: 4,
      unit: 'px',
      default: 60
    },
    {
      type: 'text',
      id: 'section_class',
      label: 'Additional CSS class',
      default: ''
    },
    {
      type: 'checkbox',
      id: 'enable_custom_css',
      label: 'Enable custom CSS',
      default: false
    },
    {
      type: 'textarea',
      id: 'custom_css',
      label: 'Custom CSS'
    }
  ];
}

/**
 * Generate settings from extracted content
 */
export function generateSettingsFromContent(
  content: ExtractedContent
): SchemaSettings[] {
  const settings: SchemaSettings[] = [];
  
  // Generate heading settings
  content.headings.forEach((heading, index) => {
    const id = content.headings.length === 1 ? 'heading' : `heading_${index + 1}`;
    settings.push({
      type: 'text',
      id,
      label: content.headings.length === 1 ? 'Heading' : `Heading ${index + 1}`,
      default: heading
    });
  });
  
  // Generate text/paragraph settings
  content.texts.forEach((text, index) => {
    const id = content.texts.length === 1 ? 'text' : `text_${index + 1}`;
    const isLong = text.length > 100;
    settings.push({
      type: isLong ? 'richtext' : 'textarea',
      id,
      label: content.texts.length === 1 ? 'Text content' : `Text content ${index + 1}`,
      default: text
    });
  });
  
  // Generate image settings
  content.images.forEach((image, index) => {
    const id = content.images.length === 1 ? 'image' : `image_${index + 1}`;
    settings.push({
      type: 'image_picker',
      id,
      label: content.images.length === 1 ? 'Image' : `Image ${index + 1}`
    });
  });
  
  // Generate link settings
  content.links.forEach((link, index) => {
    const suffix = content.links.length === 1 ? '' : `_${index + 1}`;
    settings.push({
      type: 'url',
      id: `link_url${suffix}`,
      label: content.links.length === 1 ? 'Link URL' : `Link URL ${index + 1}`,
      default: link.url
    });
    settings.push({
      type: 'text',
      id: `link_text${suffix}`,
      label: content.links.length === 1 ? 'Link text' : `Link text ${index + 1}`,
      default: link.text || 'Learn more'
    });
  });
  
  // Generate color settings
  content.colors.forEach((color, index) => {
    const id = content.colors.length === 1 ? 'accent_color' : `color_${index + 1}`;
    settings.push({
      type: 'color',
      id,
      label: content.colors.length === 1 ? 'Accent color' : `Color ${index + 1}`,
      default: color
    });
  });
  
  // Generate background image settings
  content.backgroundImages.forEach((_, index) => {
    const id = content.backgroundImages.length === 1 ? 'background_image' : `bg_image_${index + 1}`;
    settings.push({
      type: 'image_picker',
      id,
      label: content.backgroundImages.length === 1 ? 'Background image' : `Background image ${index + 1}`
    });
  });
  
  return settings;
}

/**
 * Generate a block schema for repeating elements
 */
export function generateBlockSchema(
  blockType: string,
  blockName: string,
  extractedContent: ExtractedContent
): BlockSchema {
  const settings: SchemaSettings[] = [];
  
  // Image setting
  if (extractedContent.images.length > 0) {
    settings.push({
      type: 'image_picker',
      id: 'image',
      label: 'Image'
    });
  }
  
  // Title setting
  if (extractedContent.headings.length > 0) {
    settings.push({
      type: 'text',
      id: 'title',
      label: 'Title',
      default: extractedContent.headings[0]
    });
  }
  
  // Text setting
  if (extractedContent.texts.length > 0) {
    settings.push({
      type: 'richtext',
      id: 'text',
      label: 'Text content',
      default: extractedContent.texts[0]
    });
  }
  
  // Link settings
  if (extractedContent.links.length > 0) {
    settings.push({
      type: 'url',
      id: 'link_url',
      label: 'Link URL',
      default: extractedContent.links[0].url
    });
    settings.push({
      type: 'text',
      id: 'link_text',
      label: 'Link text',
      default: extractedContent.links[0].text || 'Learn more'
    });
  }
  
  return {
    type: blockType,
    name: blockName,
    settings
  };
}

/**
 * Build complete section schema
 */
export function buildSectionSchema(options: SchemaBuilderOptions): SectionSchema {
  const { 
    sectionName, 
    sectionType, 
    includeDefaultSettings = true,
    extractedContent 
  } = options;
  
  // Start with default settings
  let settings: SchemaSettings[] = [];
  
  if (includeDefaultSettings) {
    settings = generateDefaultSettings();
  }
  
  // Add settings from extracted content
  if (extractedContent) {
    const contentSettings = generateSettingsFromContent(extractedContent);
    settings = [...contentSettings, ...settings];
  }
  
  const schema: SectionSchema = {
    name: sectionName,
    class: `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}`,
    settings,
    blocks: [],
    presets: [
      {
        name: sectionName
      }
    ]
  };
  
  // Set tag based on section type
  if (sectionType) {
    switch (sectionType.toLowerCase()) {
      case 'header':
        schema.tag = 'header';
        break;
      case 'footer':
        schema.tag = 'footer';
        break;
      case 'main':
        schema.tag = 'main';
        break;
      default:
        schema.tag = 'section';
    }
  }
  
  return schema;
}

/**
 * Convert schema object to Liquid schema tag
 */
export function schemaToLiquid(schema: SectionSchema): string {
  const schemaJson = JSON.stringify(schema, null, 2);
  return `{% schema %}\n${schemaJson}\n{% endschema %}`;
}

/**
 * Parse existing Liquid schema tag
 */
export function parseSchemaFromLiquid(liquidContent: string): SectionSchema | null {
  const schemaMatch = liquidContent.match(/{% schema %}([\s\S]*?){% endschema %}/);
  if (!schemaMatch) {
    return null;
  }
  
  try {
    return JSON.parse(schemaMatch[1]) as SectionSchema;
  } catch {
    return null;
  }
}

export default {
  buildSectionSchema,
  generateDefaultSettings,
  generateSettingsFromContent,
  generateBlockSchema,
  schemaToLiquid,
  parseSchemaFromLiquid
};

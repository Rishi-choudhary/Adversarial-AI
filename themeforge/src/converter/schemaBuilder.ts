import { ClassifiedSection, SchemaField } from '../analyzer/sectionClassifier';

export interface SectionSchema {
  name: string;
  tag: string;
  class: string;
  settings: SchemaSettingField[];
  blocks?: SchemaBlock[];
  presets?: SchemaPreset[];
  max_blocks?: number;
}

export interface SchemaSettingField {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
  info?: string;
  options?: SchemaOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SchemaOption {
  value: string;
  label: string;
}

export interface SchemaBlock {
  type: string;
  name: string;
  settings: SchemaSettingField[];
}

export interface SchemaPreset {
  name: string;
  settings?: Record<string, unknown>;
  blocks?: { type: string; settings?: Record<string, unknown> }[];
}

/**
 * Generate a Shopify section schema from a classified section
 */
export function generateSectionSchema(section: ClassifiedSection): SectionSchema {
  const capitalizedName = section.suggestedName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const schema: SectionSchema = {
    name: capitalizedName,
    tag: 'section',
    class: `section-${section.suggestedName}`,
    settings: generateSettings(section),
    presets: [
      {
        name: capitalizedName,
      },
    ],
  };

  // Add blocks if the section type supports them
  const blocks = generateBlocks(section);
  if (blocks.length > 0) {
    schema.blocks = blocks;
    schema.max_blocks = 12;
  }

  return schema;
}

/**
 * Generate settings array from section data
 */
function generateSettings(section: ClassifiedSection): SchemaSettingField[] {
  const settings: SchemaSettingField[] = [];

  // Add common settings based on section type
  settings.push({
    type: 'text',
    id: 'heading',
    label: 'Heading',
    default: section.suggestedName.charAt(0).toUpperCase() + section.suggestedName.slice(1),
  });

  settings.push({
    type: 'textarea',
    id: 'description',
    label: 'Description',
  });

  // Add type-specific settings
  const typeSettings = getTypeSpecificSettings(section.shopifyType);
  settings.push(...typeSettings);

  // Add color settings
  settings.push({
    type: 'color',
    id: 'background_color',
    label: 'Background color',
    default: '#ffffff',
  });

  settings.push({
    type: 'color',
    id: 'text_color',
    label: 'Text color',
    default: '#000000',
  });

  // Add spacing settings
  settings.push({
    type: 'range',
    id: 'padding_top',
    label: 'Top padding',
    min: 0,
    max: 100,
    step: 4,
    unit: 'px',
    default: 40,
  });

  settings.push({
    type: 'range',
    id: 'padding_bottom',
    label: 'Bottom padding',
    min: 0,
    max: 100,
    step: 4,
    unit: 'px',
    default: 40,
  });

  return settings;
}

/**
 * Get type-specific settings based on section type
 */
function getTypeSpecificSettings(type: string): SchemaSettingField[] {
  const settings: SchemaSettingField[] = [];

  switch (type) {
    case 'hero':
      settings.push({
        type: 'image_picker',
        id: 'image',
        label: 'Background image',
      });
      settings.push({
        type: 'text',
        id: 'button_label',
        label: 'Button label',
        default: 'Learn More',
      });
      settings.push({
        type: 'url',
        id: 'button_link',
        label: 'Button link',
      });
      settings.push({
        type: 'select',
        id: 'text_alignment',
        label: 'Text alignment',
        default: 'center',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      });
      break;

    case 'multicolumn':
    case 'features':
      settings.push({
        type: 'range',
        id: 'columns',
        label: 'Columns',
        min: 2,
        max: 4,
        step: 1,
        default: 3,
      });
      break;

    case 'testimonials':
      settings.push({
        type: 'checkbox',
        id: 'show_rating',
        label: 'Show rating stars',
        default: true,
      });
      break;

    case 'newsletter':
      settings.push({
        type: 'text',
        id: 'button_label',
        label: 'Button label',
        default: 'Subscribe',
      });
      settings.push({
        type: 'text',
        id: 'placeholder',
        label: 'Email placeholder',
        default: 'Enter your email',
      });
      break;

    case 'image-with-text':
      settings.push({
        type: 'image_picker',
        id: 'image',
        label: 'Image',
      });
      settings.push({
        type: 'select',
        id: 'image_position',
        label: 'Image position',
        default: 'left',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      });
      break;

    case 'video':
      settings.push({
        type: 'video_url',
        id: 'video_url',
        label: 'Video URL',
        info: 'Supports YouTube and Vimeo',
      });
      settings.push({
        type: 'image_picker',
        id: 'cover_image',
        label: 'Cover image',
      });
      break;
  }

  return settings;
}

/**
 * Generate block definitions for the section
 */
function generateBlocks(section: ClassifiedSection): SchemaBlock[] {
  const blocks: SchemaBlock[] = [];

  // Add blocks based on section type
  switch (section.shopifyType) {
    case 'multicolumn':
    case 'features':
      blocks.push({
        type: 'column',
        name: 'Column',
        settings: [
          { type: 'image_picker', id: 'image', label: 'Image' },
          { type: 'text', id: 'title', label: 'Title' },
          { type: 'richtext', id: 'text', label: 'Text' },
          { type: 'text', id: 'button_label', label: 'Button label' },
          { type: 'url', id: 'button_link', label: 'Button link' },
        ],
      });
      break;

    case 'testimonials':
      blocks.push({
        type: 'testimonial',
        name: 'Testimonial',
        settings: [
          { type: 'image_picker', id: 'image', label: 'Author image' },
          { type: 'text', id: 'author', label: 'Author name' },
          { type: 'text', id: 'title', label: 'Author title' },
          { type: 'richtext', id: 'quote', label: 'Quote' },
          { type: 'range', id: 'rating', label: 'Rating', min: 1, max: 5, default: 5 },
        ],
      });
      break;

    case 'collage':
    case 'gallery':
      blocks.push({
        type: 'image',
        name: 'Image',
        settings: [
          { type: 'image_picker', id: 'image', label: 'Image' },
          { type: 'text', id: 'caption', label: 'Caption' },
          { type: 'url', id: 'link', label: 'Link' },
        ],
      });
      break;

    case 'slideshow':
      blocks.push({
        type: 'slide',
        name: 'Slide',
        settings: [
          { type: 'image_picker', id: 'image', label: 'Image' },
          { type: 'text', id: 'heading', label: 'Heading' },
          { type: 'textarea', id: 'subheading', label: 'Subheading' },
          { type: 'text', id: 'button_label', label: 'Button label' },
          { type: 'url', id: 'button_link', label: 'Button link' },
        ],
      });
      break;

    default:
      // Generic item block for custom sections
      blocks.push({
        type: 'item',
        name: 'Item',
        settings: [
          { type: 'text', id: 'title', label: 'Title' },
          { type: 'richtext', id: 'text', label: 'Text' },
          { type: 'image_picker', id: 'image', label: 'Image' },
        ],
      });
      break;
  }

  return blocks;
}

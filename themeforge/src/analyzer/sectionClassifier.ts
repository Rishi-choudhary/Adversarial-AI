import { DetectedSection } from './sectionDetector';

export interface ClassifiedSection extends DetectedSection {
  shopifyType: ShopifySectionType;
  confidence: number;
  suggestedName: string;
  suggestedSchema: SchemaField[];
}

export type ShopifySectionType =
  | 'header'
  | 'footer'
  | 'hero'
  | 'featured-collection'
  | 'featured-product'
  | 'image-with-text'
  | 'rich-text'
  | 'collage'
  | 'multicolumn'
  | 'video'
  | 'slideshow'
  | 'testimonials'
  | 'newsletter'
  | 'contact-form'
  | 'custom';

export interface SchemaField {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
}

// Mapping from detected types to Shopify section types
const TYPE_MAPPING: Record<string, ShopifySectionType> = {
  header: 'header',
  footer: 'footer',
  hero: 'hero',
  features: 'multicolumn',
  testimonials: 'testimonials',
  pricing: 'multicolumn',
  faq: 'rich-text',
  newsletter: 'newsletter',
  contact: 'contact-form',
  about: 'image-with-text',
  gallery: 'collage',
  blog: 'rich-text',
  logos: 'multicolumn',
  stats: 'multicolumn',
  cta: 'image-with-text',
  content: 'rich-text',
  section: 'custom',
};

// Schema templates for different section types
const SCHEMA_TEMPLATES: Record<ShopifySectionType, SchemaField[]> = {
  header: [
    { type: 'image_picker', id: 'logo', label: 'Logo' },
    { type: 'checkbox', id: 'show_announcement', label: 'Show announcement bar', default: false },
    { type: 'text', id: 'announcement_text', label: 'Announcement text' },
  ],
  footer: [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'richtext', id: 'content', label: 'Content' },
    { type: 'checkbox', id: 'show_social', label: 'Show social icons', default: true },
  ],
  hero: [
    { type: 'image_picker', id: 'image', label: 'Background image' },
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'textarea', id: 'subheading', label: 'Subheading' },
    { type: 'text', id: 'button_label', label: 'Button label' },
    { type: 'url', id: 'button_link', label: 'Button link' },
  ],
  'featured-collection': [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'collection', id: 'collection', label: 'Collection' },
    { type: 'range', id: 'products_to_show', label: 'Products to show', default: 4 },
  ],
  'featured-product': [
    { type: 'product', id: 'product', label: 'Product' },
    { type: 'checkbox', id: 'show_description', label: 'Show description', default: true },
  ],
  'image-with-text': [
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'richtext', id: 'text', label: 'Text' },
    { type: 'text', id: 'button_label', label: 'Button label' },
    { type: 'url', id: 'button_link', label: 'Button link' },
  ],
  'rich-text': [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'richtext', id: 'text', label: 'Text' },
  ],
  collage: [
    { type: 'text', id: 'heading', label: 'Heading' },
  ],
  multicolumn: [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'textarea', id: 'description', label: 'Description' },
  ],
  video: [
    { type: 'video_url', id: 'video_url', label: 'Video URL' },
    { type: 'image_picker', id: 'cover_image', label: 'Cover image' },
  ],
  slideshow: [
    { type: 'checkbox', id: 'auto_rotate', label: 'Auto-rotate', default: false },
    { type: 'range', id: 'change_slides_speed', label: 'Change slides every', default: 5 },
  ],
  testimonials: [
    { type: 'text', id: 'heading', label: 'Heading' },
  ],
  newsletter: [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'textarea', id: 'description', label: 'Description' },
    { type: 'text', id: 'button_label', label: 'Button label', default: 'Subscribe' },
  ],
  'contact-form': [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'textarea', id: 'description', label: 'Description' },
  ],
  custom: [
    { type: 'text', id: 'heading', label: 'Heading' },
    { type: 'richtext', id: 'content', label: 'Content' },
  ],
};

/**
 * Classify a detected section into a Shopify section type
 */
export function classifySection(section: DetectedSection): ClassifiedSection {
  const shopifyType = TYPE_MAPPING[section.type] || 'custom';
  const confidence = calculateConfidence(section, shopifyType);
  const suggestedName = generateSectionName(section, shopifyType);
  const suggestedSchema = generateSchema(section, shopifyType);

  return {
    ...section,
    shopifyType,
    confidence,
    suggestedName,
    suggestedSchema,
  };
}

/**
 * Classify multiple sections
 */
export function classifySections(sections: DetectedSection[]): ClassifiedSection[] {
  return sections.map(classifySection);
}

/**
 * Calculate confidence score for classification
 */
function calculateConfidence(
  section: DetectedSection,
  shopifyType: ShopifySectionType
): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence for semantic matches
  if (section.element === 'header' && shopifyType === 'header') confidence += 0.3;
  if (section.element === 'footer' && shopifyType === 'footer') confidence += 0.3;
  if (section.element === 'nav' && shopifyType === 'header') confidence += 0.2;

  // Increase confidence for class name matches
  const className = section.classList.join(' ').toLowerCase();
  if (className.includes(shopifyType.replace('-', ''))) confidence += 0.2;
  if (className.includes(section.type)) confidence += 0.1;

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Generate a suggested section name
 */
function generateSectionName(
  section: DetectedSection,
  shopifyType: ShopifySectionType
): string {
  // Use the detected type if it's meaningful
  if (section.type !== 'section') {
    return section.type.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  // Fall back to Shopify type
  return shopifyType;
}

/**
 * Generate schema fields for a section
 */
function generateSchema(
  section: DetectedSection,
  shopifyType: ShopifySectionType
): SchemaField[] {
  const baseSchema = SCHEMA_TEMPLATES[shopifyType] || SCHEMA_TEMPLATES.custom;
  
  // Analyze section HTML for additional schema suggestions
  const additionalFields = analyzeHtmlForSchema(section.html);
  
  // Merge and deduplicate
  const allFields = [...baseSchema, ...additionalFields];
  const seen = new Set<string>();
  
  return allFields.filter(field => {
    if (seen.has(field.id)) return false;
    seen.add(field.id);
    return true;
  });
}

/**
 * Analyze HTML content to suggest additional schema fields
 */
function analyzeHtmlForSchema(html: string): SchemaField[] {
  const fields: SchemaField[] = [];

  // Check for images
  const imageCount = (html.match(/<img/gi) || []).length;
  if (imageCount > 1) {
    fields.push({ type: 'range', id: 'images_per_row', label: 'Images per row', default: 3 });
  }

  // Check for links/buttons
  const hasButtons = /<(button|a[^>]*class[^>]*btn)/i.test(html);
  if (hasButtons && !fields.some(f => f.id.includes('button'))) {
    fields.push({ type: 'text', id: 'button_label', label: 'Button label' });
    fields.push({ type: 'url', id: 'button_link', label: 'Button link' });
  }

  // Check for color backgrounds
  const hasColorBg = /background(-color)?:\s*#|background:\s*rgb/i.test(html);
  if (hasColorBg) {
    fields.push({ type: 'color', id: 'background_color', label: 'Background color' });
  }

  return fields;
}

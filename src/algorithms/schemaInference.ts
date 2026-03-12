/**
 * Algorithm B: Schema Field Inference
 * 
 * Infers schema settings from DOM elements by analyzing:
 * - Headings (h1-h6) → text fields
 * - Paragraphs → richtext fields  
 * - Images → image_picker fields
 * - Links/buttons → url and text fields
 * - Background colors → color fields
 */

import type { SchemaSettings } from './types';
import { rgbToHex } from './utils';

/**
 * Infer schema settings from an element's content
 * 
 * @param element - The Element to analyze
 * @param computedStyles - Optional computed styles getter (for server-side rendering)
 * @returns Array of schema settings inferred from the element
 * 
 * @example
 * ```typescript
 * const settings = inferSchemaSettings(document.querySelector('.hero'));
 * settings.forEach(setting => {
 *   console.log(`${setting.type}: ${setting.label}`);
 * });
 * ```
 */
export function inferSchemaSettings(
  element: Element,
  computedStyles?: (el: Element) => CSSStyleDeclaration
): SchemaSettings[] {
  const settings: SchemaSettings[] = [];
  
  // Get computed styles function (use window.getComputedStyle if available)
  const getStyles = computedStyles || 
    (typeof window !== 'undefined' 
      ? (el: Element) => window.getComputedStyle(el)
      : undefined);

  // Text nodes - Headings
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((el, i) => {
    settings.push({
      type: 'text',
      id: `heading_${i}`,
      label: `Heading ${i + 1}`,
      default: el.textContent?.trim() || null,
    });
  });

  // Text nodes - Paragraphs
  const paragraphs = element.querySelectorAll('p');
  paragraphs.forEach((el, i) => {
    settings.push({
      type: 'richtext',
      id: `text_${i}`,
      label: `Text ${i + 1}`,
      default: el.innerHTML?.trim() || null,
    });
  });

  // Images
  const images = element.querySelectorAll('img');
  images.forEach((el, i) => {
    const imgElement = el as HTMLImageElement;
    const altText = imgElement.getAttribute('alt');
    
    settings.push({
      type: 'image_picker',
      id: `image_${i}`,
      label: altText ? `Image: ${altText}` : `Image ${i + 1}`,
      default: imgElement.getAttribute('src') || null,
    });
  });

  // Links/buttons
  const links = element.querySelectorAll('a[href]');
  links.forEach((el, i) => {
    settings.push({
      type: 'url',
      id: `link_${i}_url`,
      label: `Link ${i + 1} URL`,
      default: el.getAttribute('href') || null,
    });
    settings.push({
      type: 'text',
      id: `link_${i}_text`,
      label: `Link ${i + 1} Text`,
      default: el.textContent?.trim() || null,
    });
  });

  // Background colors
  if (getStyles) {
    const bgColor = getStyles(element).backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      settings.push({
        type: 'color',
        id: 'background_color',
        label: 'Background Color',
        default: rgbToHex(bgColor),
      });
    }
  }

  return settings;
}

/**
 * Infer schema settings with additional element types
 * Extended version that also detects buttons, lists, and videos
 * 
 * @param element - The Element to analyze
 * @param computedStyles - Optional computed styles getter
 * @returns Array of schema settings
 */
export function inferSchemaSettingsExtended(
  element: Element,
  computedStyles?: (el: Element) => CSSStyleDeclaration
): SchemaSettings[] {
  // Get base settings
  const settings = inferSchemaSettings(element, computedStyles);
  
  // Buttons (not links)
  const buttons = element.querySelectorAll('button');
  buttons.forEach((el, i) => {
    settings.push({
      type: 'text',
      id: `button_${i}_text`,
      label: `Button ${i + 1} Text`,
      default: el.textContent?.trim() || null,
    });
  });

  // Videos
  const videos = element.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
  videos.forEach((el, i) => {
    const src = el.getAttribute('src') || 
                (el as HTMLVideoElement).currentSrc || null;
    settings.push({
      type: 'url',
      id: `video_${i}_url`,
      label: `Video ${i + 1} URL`,
      default: src,
    });
  });

  // Lists (for items like features, benefits)
  const lists = element.querySelectorAll('ul, ol');
  lists.forEach((list, listIndex) => {
    const items = list.querySelectorAll('li');
    items.forEach((item, itemIndex) => {
      settings.push({
        type: 'text',
        id: `list_${listIndex}_item_${itemIndex}`,
        label: `List ${listIndex + 1} Item ${itemIndex + 1}`,
        default: item.textContent?.trim() || null,
      });
    });
  });

  return settings;
}

/**
 * Group settings by their type for easier processing
 * 
 * @param settings - Array of schema settings
 * @returns Object with settings grouped by type
 */
export function groupSettingsByType(
  settings: SchemaSettings[]
): Record<SchemaSettings['type'], SchemaSettings[]> {
  return settings.reduce((acc, setting) => {
    if (!acc[setting.type]) {
      acc[setting.type] = [];
    }
    acc[setting.type].push(setting);
    return acc;
  }, {} as Record<SchemaSettings['type'], SchemaSettings[]>);
}

/**
 * Generate a Liquid-compatible schema from settings
 * 
 * @param settings - Array of schema settings
 * @returns JSON schema object compatible with Shopify Liquid
 */
export function generateLiquidSchema(
  settings: SchemaSettings[]
): object {
  return {
    name: 'Section',
    settings: settings.map(setting => ({
      type: setting.type === 'richtext' ? 'richtext' : 
            setting.type === 'image_picker' ? 'image_picker' :
            setting.type === 'url' ? 'url' :
            setting.type === 'color' ? 'color' : 'text',
      id: setting.id,
      label: setting.label,
      default: setting.default,
    })),
  };
}

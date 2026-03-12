/**
 * Utility functions for the section detection algorithms
 */

import type { Section } from './types';

/**
 * Count occurrences of each value in an array
 * @param items - Array of items to count
 * @returns Object with items as keys and counts as values
 */
export function countBy<T extends string | number>(items: T[]): Record<T, number> {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

/**
 * Find the entry with the maximum value based on a selector function
 * @param entries - Array of entries to search
 * @param selector - Function to extract the value to compare
 * @returns The entry with the maximum value, or undefined if empty
 */
export function maxBy<T>(
  entries: T[],
  selector: (entry: T) => number
): T | undefined {
  if (entries.length === 0) return undefined;
  
  let maxEntry = entries[0];
  let maxValue = selector(maxEntry);
  
  for (let i = 1; i < entries.length; i++) {
    const value = selector(entries[i]);
    if (value > maxValue) {
      maxValue = value;
      maxEntry = entries[i];
    }
  }
  
  return maxEntry;
}

/**
 * Convert RGB color string to hex format
 * @param rgb - RGB color string (e.g., "rgb(255, 128, 0)" or "rgba(255, 128, 0, 1)")
 * @returns Hex color string (e.g., "#ff8000")
 */
export function rgbToHex(rgb: string): string {
  // Handle rgba format
  const match = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  
  if (!match) {
    return rgb; // Return original if not a valid RGB string
  }
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a structural fingerprint for an element based on its tag tree
 * Does not include content, only structure
 * @param element - The element to fingerprint
 * @returns A string fingerprint representing the element's structure
 */
export function getStructuralFingerprint(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const childFingerprints = Array.from(element.children)
    .map(child => getStructuralFingerprint(child))
    .sort() // Sort for consistent ordering
    .join(',');
  
  return childFingerprints ? `${tagName}[${childFingerprints}]` : tagName;
}

/**
 * Check if two bounding boxes overlap
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns True if the boxes overlap
 */
export function boxesOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Check if one element is nested within another
 * @param inner - Potential inner element
 * @param outer - Potential outer element
 * @returns True if inner is a descendant of outer
 */
export function isNestedWithin(inner: Element, outer: Element): boolean {
  let current: Element | null = inner.parentElement;
  while (current) {
    if (current === outer) return true;
    current = current.parentElement;
  }
  return false;
}

/**
 * Merge overlapping sections and remove nested duplicates
 * @param sections - Array of detected sections
 * @returns Deduplicated array of sections
 */
export function mergeAndDeduplicate(sections: Section[]): Section[] {
  if (sections.length === 0) return [];
  
  // Sort by priority (lower is better) then by DOM position
  const sorted = [...sections].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Use DOM comparison for stable sorting
    const position = a.element.compareDocumentPosition(b.element);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  
  const result: Section[] = [];
  const processedElements = new Set<Element>();
  
  for (const section of sorted) {
    // Skip if this element was already processed
    if (processedElements.has(section.element)) continue;
    
    // Check if this section is nested within an already-added section
    const isNested = result.some(
      existing => isNestedWithin(section.element, existing.element)
    );
    
    if (!isNested) {
      // Check for overlapping bounding boxes if both have boundingBox
      let shouldAdd = true;
      
      if (section.boundingBox) {
        for (const existing of result) {
          if (existing.boundingBox && boxesOverlap(section.boundingBox, existing.boundingBox)) {
            // If overlapping, keep the higher priority one
            if (section.priority >= existing.priority) {
              shouldAdd = false;
              break;
            }
          }
        }
      }
      
      if (shouldAdd) {
        result.push(section);
        processedElements.add(section.element);
      }
    }
  }
  
  return result;
}

/**
 * Generate a unique ID for a section
 * @param type - The section type
 * @param index - Index for uniqueness
 * @returns A unique section ID
 */
export function generateSectionId(type: string, index: number): string {
  return `section_${type}_${index}`;
}

/**
 * Algorithm C: Repeating Block Detection
 * 
 * Detects repeating block patterns in elements by:
 * - Computing structural fingerprints (tag tree only, no content)
 * - Finding elements with matching structures
 * - Identifying dominant patterns for template generation
 */

import type { BlockDefinition } from './types';
import { getStructuralFingerprint, countBy, maxBy } from './utils';

/**
 * Detect repeating blocks within an element
 * 
 * @param element - The Element to analyze for repeating patterns
 * @returns BlockDefinition if repeating blocks found, null otherwise
 * 
 * @example
 * ```typescript
 * const cardContainer = document.querySelector('.card-grid');
 * const blocks = detectRepeatingBlocks(cardContainer);
 * if (blocks) {
 *   console.log(`Found ${blocks.count} repeating blocks`);
 *   // Use for: {% for block in section.blocks %}
 * }
 * ```
 */
export function detectRepeatingBlocks(element: Element): BlockDefinition | null {
  const children = Array.from(element.children);
  
  // Need at least 2 children to have repeating blocks
  if (children.length < 2) return null;

  // Compute structural fingerprint (tag tree only, no content)
  const fingerprints = children.map(child => getStructuralFingerprint(child));

  // Check if majority of children share same fingerprint
  const fingerprintCounts = countBy(fingerprints);
  const entries = Object.entries(fingerprintCounts) as [string, number][];
  const dominantFingerprint = maxBy(entries, ([, count]) => count);

  if (dominantFingerprint && dominantFingerprint[1] >= 2) {
    // This is a repeating block — use {% for block in section.blocks %}
    return {
      isBlock: true,
      blockTemplate: children.find(
        c => getStructuralFingerprint(c) === dominantFingerprint[0]
      ),
      count: dominantFingerprint[1],
      fingerprint: dominantFingerprint[0],
    };
  }

  return null;
}

/**
 * Detect all repeating block patterns in an element tree
 * Recursively finds nested repeating patterns
 * 
 * @param element - Root element to analyze
 * @returns Array of detected block definitions with their parent elements
 */
export function detectAllRepeatingBlocks(
  element: Element
): Array<{ parent: Element; blocks: BlockDefinition }> {
  const results: Array<{ parent: Element; blocks: BlockDefinition }> = [];

  // Check current element
  const blocks = detectRepeatingBlocks(element);
  if (blocks) {
    results.push({ parent: element, blocks });
  }

  // Recursively check children
  Array.from(element.children).forEach(child => {
    results.push(...detectAllRepeatingBlocks(child));
  });

  return results;
}

/**
 * Get all unique fingerprints and their counts from children
 * Useful for analysis and debugging
 * 
 * @param element - Element to analyze
 * @returns Map of fingerprints to their counts
 */
export function getChildFingerprints(
  element: Element
): Map<string, number> {
  const children = Array.from(element.children);
  const fingerprints = children.map(child => getStructuralFingerprint(child));
  const counts = countBy(fingerprints);
  return new Map(Object.entries(counts));
}

/**
 * Find elements that match a specific structural fingerprint
 * 
 * @param element - Parent element to search within
 * @param targetFingerprint - The fingerprint to match
 * @returns Array of matching child elements
 */
export function findMatchingElements(
  element: Element,
  targetFingerprint: string
): Element[] {
  return Array.from(element.children).filter(
    child => getStructuralFingerprint(child) === targetFingerprint
  );
}

/**
 * Analyze element for potential block patterns with detailed info
 * 
 * @param element - Element to analyze
 * @returns Detailed analysis of block patterns
 */
export function analyzeBlockPatterns(element: Element): {
  totalChildren: number;
  uniquePatterns: number;
  patterns: Array<{
    fingerprint: string;
    count: number;
    percentage: number;
    elements: Element[];
  }>;
  dominantPattern: {
    fingerprint: string;
    count: number;
    percentage: number;
  } | null;
  isRepeatingContainer: boolean;
} {
  const children = Array.from(element.children);
  const totalChildren = children.length;

  if (totalChildren === 0) {
    return {
      totalChildren: 0,
      uniquePatterns: 0,
      patterns: [],
      dominantPattern: null,
      isRepeatingContainer: false,
    };
  }

  const fingerprints = children.map(child => getStructuralFingerprint(child));
  const counts = countBy(fingerprints);
  const entries = Object.entries(counts) as [string, number][];

  const patterns = entries.map(([fingerprint, count]) => ({
    fingerprint,
    count,
    percentage: (count / totalChildren) * 100,
    elements: children.filter(c => getStructuralFingerprint(c) === fingerprint),
  })).sort((a, b) => b.count - a.count);

  const dominant = patterns[0];
  const dominantPattern = dominant && dominant.count >= 2
    ? {
        fingerprint: dominant.fingerprint,
        count: dominant.count,
        percentage: dominant.percentage,
      }
    : null;

  return {
    totalChildren,
    uniquePatterns: patterns.length,
    patterns,
    dominantPattern,
    isRepeatingContainer: dominantPattern !== null,
  };
}

/**
 * Generate a template suggestion for repeating blocks
 * Creates a Liquid-compatible block definition
 * 
 * @param blockDefinition - The detected block definition
 * @returns Object representing the block schema
 */
export function generateBlockSchema(
  blockDefinition: BlockDefinition
): object | null {
  if (!blockDefinition.isBlock || !blockDefinition.blockTemplate) {
    return null;
  }

  // Extract block type from template element
  const template = blockDefinition.blockTemplate;
  const tagName = template.tagName.toLowerCase();
  const className = template.getAttribute('class') || '';

  // Try to infer a meaningful block type name
  let blockType = 'item';
  if (className.includes('card')) blockType = 'card';
  else if (className.includes('feature')) blockType = 'feature';
  else if (className.includes('testimonial')) blockType = 'testimonial';
  else if (className.includes('item')) blockType = 'item';
  else if (tagName === 'li') blockType = 'list_item';
  else if (tagName === 'article') blockType = 'article';

  return {
    type: blockType,
    name: blockType.charAt(0).toUpperCase() + blockType.slice(1),
    settings: [],
    limit: blockDefinition.count + 2, // Allow some additional blocks
  };
}

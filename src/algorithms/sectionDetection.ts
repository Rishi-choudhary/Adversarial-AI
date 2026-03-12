/**
 * Algorithm A: Section Boundary Detection
 * 
 * Detects section boundaries in a DOM document using multiple strategies:
 * - Priority 1: Explicit semantic/landmark elements
 * - Priority 2: Common class name patterns
 * - Priority 3: Visual boundary detection via bounding boxes
 */

import type { Section } from './types';
import { mergeAndDeduplicate, generateSectionId } from './utils';

/**
 * Landmark selectors for semantic HTML elements
 */
const LANDMARK_SELECTORS = [
  'header',
  'footer', 
  'nav',
  'main',
  'section',
  'article',
  'aside',
  '[role="banner"]',
  '[role="main"]',
  '[role="contentinfo"]',
  '[role="navigation"]',
  '[role="complementary"]',
].join(', ');

/**
 * Common class name patterns that indicate section boundaries
 */
const CLASS_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /hero|banner|jumbotron/i, type: 'hero' },
  { pattern: /feature|benefit|why/i, type: 'features' },
  { pattern: /testimonial|review|quote/i, type: 'testimonials' },
  { pattern: /pricing|plan|tier/i, type: 'pricing' },
  { pattern: /faq|accordion|question/i, type: 'faq' },
  { pattern: /footer|foot/i, type: 'footer' },
  { pattern: /header|head|nav/i, type: 'header' },
  { pattern: /cta|call-to-action/i, type: 'cta' },
  { pattern: /logo|brand|partner/i, type: 'brands' },
  { pattern: /stat|counter|metric/i, type: 'stats' },
  { pattern: /newsletter|subscribe|signup/i, type: 'newsletter' },
  { pattern: /contact|form/i, type: 'contact' },
  { pattern: /about|team|company/i, type: 'about' },
  { pattern: /gallery|portfolio|showcase/i, type: 'gallery' },
  { pattern: /service|solution/i, type: 'services' },
];

/**
 * Map element tag names to section types
 */
const TAG_TO_TYPE: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  nav: 'navigation',
  main: 'main',
  section: 'section',
  article: 'article',
  aside: 'sidebar',
};

/**
 * Map ARIA roles to section types
 */
const ROLE_TO_TYPE: Record<string, string> = {
  banner: 'header',
  main: 'main',
  contentinfo: 'footer',
  navigation: 'navigation',
  complementary: 'sidebar',
};

/**
 * Detect sections in a DOM document using multiple strategies
 * 
 * @param dom - The Document object to analyze
 * @returns Array of detected sections, deduplicated and sorted
 * 
 * @example
 * ```typescript
 * const sections = detectSections(document);
 * sections.forEach(section => {
 *   console.log(`Found ${section.type} section at priority ${section.priority}`);
 * });
 * ```
 */
export function detectSections(dom: Document): Section[] {
  const sections: Section[] = [];
  let sectionIndex = 0;

  // Priority 1: Explicit semantic/landmark elements
  const landmarks = dom.querySelectorAll(LANDMARK_SELECTORS);
  
  landmarks.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    // Determine section type from tag or role
    let type = TAG_TO_TYPE[tagName] || 'section';
    if (role && ROLE_TO_TYPE[role]) {
      type = ROLE_TO_TYPE[role];
    }

    sections.push({
      id: generateSectionId(type, sectionIndex++),
      element,
      type,
      priority: 1,
    });
  });

  // Priority 2: Common class name patterns
  const allElements = dom.querySelectorAll('[class]');
  
  allElements.forEach((element) => {
    const className = element.getAttribute('class') || '';
    const id = element.getAttribute('id') || '';
    const combinedIdentifier = `${className} ${id}`;

    for (const { pattern, type } of CLASS_PATTERNS) {
      if (pattern.test(combinedIdentifier)) {
        // Skip if this element is already captured by landmark detection
        const alreadyCaptured = sections.some(
          s => s.element === element && s.priority === 1
        );
        
        if (!alreadyCaptured) {
          sections.push({
            id: generateSectionId(type, sectionIndex++),
            element,
            type,
            priority: 2,
          });
        }
        break; // Only match one pattern per element
      }
    }
  });

  // Priority 3: Visual boundary detection
  // Note: This requires bounding boxes from Playwright, which are added
  // during the scraper phase. We check for data attributes that might
  // contain this information.
  const visualBoundaryElements = dom.querySelectorAll(
    '[data-boundary], [data-section-boundary], [data-visual-section]'
  );

  visualBoundaryElements.forEach((element) => {
    const boundingBox = extractBoundingBox(element);
    const alreadyCaptured = sections.some(s => s.element === element);

    if (!alreadyCaptured) {
      sections.push({
        id: generateSectionId('visual', sectionIndex++),
        element,
        type: 'visual-section',
        priority: 3,
        boundingBox,
      });
    }
  });

  // Dedup: merge overlapping, remove nested duplicates
  return mergeAndDeduplicate(sections);
}

/**
 * Extract bounding box from element data attributes
 * @param element - Element to extract bounding box from
 * @returns Bounding box object or undefined
 */
function extractBoundingBox(
  element: Element
): { x: number; y: number; width: number; height: number } | undefined {
  const boundaryData = 
    element.getAttribute('data-boundary') ||
    element.getAttribute('data-bounding-box');

  if (!boundaryData) return undefined;

  try {
    const parsed = JSON.parse(boundaryData);
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Invalid JSON, return undefined
  }

  return undefined;
}

/**
 * Add bounding box information to sections
 * Used after Playwright provides bounding box data
 * 
 * @param sections - Array of sections to update
 * @param boundingBoxes - Map of element IDs to bounding boxes
 * @returns Updated sections with bounding box information
 */
export function addBoundingBoxes(
  sections: Section[],
  boundingBoxes: Map<string, { x: number; y: number; width: number; height: number }>
): Section[] {
  return sections.map(section => {
    const elementId = section.element.getAttribute('id');
    if (elementId && boundingBoxes.has(elementId)) {
      return {
        ...section,
        boundingBox: boundingBoxes.get(elementId),
      };
    }
    return section;
  });
}

export { LANDMARK_SELECTORS, CLASS_PATTERNS };

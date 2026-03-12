import { JSDOM } from 'jsdom';

export interface DetectedSection {
  id: string;
  type: string;
  element: string;
  selector: string;
  html: string;
  classList: string[];
  attributes: Record<string, string>;
  boundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

// Semantic section elements that typically mark section boundaries
const SECTION_ELEMENTS = [
  'header',
  'footer',
  'main',
  'nav',
  'section',
  'article',
  'aside',
];

// Common class patterns that indicate sections
const SECTION_CLASS_PATTERNS = [
  /^(hero|banner|masthead|jumbotron)/i,
  /^(features?|benefits?|services?)/i,
  /^(testimonials?|reviews?|quotes?)/i,
  /^(pricing|plans?|packages?)/i,
  /^(faq|questions?|accordion)/i,
  /^(newsletter|subscribe|signup|cta)/i,
  /^(contact|form|enquiry)/i,
  /^(team|about|company)/i,
  /^(gallery|portfolio|showcase)/i,
  /^(blog|posts?|news)/i,
  /^(partners?|clients?|logos?)/i,
  /^(stats?|numbers?|counters?)/i,
];

// ID patterns that indicate sections
const SECTION_ID_PATTERNS = SECTION_CLASS_PATTERNS;

/**
 * Detect sections in HTML content
 */
export function detectSections(html: string): DetectedSection[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const sections: DetectedSection[] = [];
  let sectionIndex = 0;

  // First, find semantic section elements
  for (const tagName of SECTION_ELEMENTS) {
    const elements = document.querySelectorAll(tagName);
    elements.forEach((element) => {
      const section = elementToSection(element as HTMLElement, sectionIndex++);
      if (section && isValidSection(section)) {
        sections.push(section);
      }
    });
  }

  // Then, find divs with section-like classes or IDs
  const allDivs = document.querySelectorAll('div[class], div[id]');
  allDivs.forEach((element) => {
    const el = element as HTMLElement;
    
    // Skip if already inside a detected section
    if (isInsideSection(el, sections, document)) {
      return;
    }

    // Check if this div looks like a section
    if (looksLikeSection(el)) {
      const section = elementToSection(el, sectionIndex++);
      if (section && isValidSection(section)) {
        sections.push(section);
      }
    }
  });

  // Sort sections by their position in the document
  sections.sort((a, b) => {
    const aTop = a.boundingBox?.top || 0;
    const bTop = b.boundingBox?.top || 0;
    return aTop - bTop;
  });

  return sections;
}

/**
 * Convert an HTML element to a DetectedSection
 */
function elementToSection(
  element: HTMLElement,
  index: number
): DetectedSection | null {
  try {
    const tagName = element.tagName.toLowerCase();
    const id = element.id || `section-${index}`;
    const classList = Array.from(element.classList);
    
    // Generate a unique selector
    let selector = tagName;
    if (element.id) {
      selector = `#${element.id}`;
    } else if (classList.length > 0) {
      selector = `${tagName}.${classList[0]}`;
    }

    // Get attributes
    const attributes: Record<string, string> = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }

    return {
      id,
      type: detectSectionType(element),
      element: tagName,
      selector,
      html: element.outerHTML,
      classList,
      attributes,
    };
  } catch {
    return null;
  }
}

/**
 * Check if an element looks like a section based on its classes/ID
 */
function looksLikeSection(element: HTMLElement): boolean {
  const className = element.className || '';
  const id = element.id || '';

  // Check class patterns
  for (const pattern of SECTION_CLASS_PATTERNS) {
    if (pattern.test(className)) {
      return true;
    }
  }

  // Check ID patterns
  for (const pattern of SECTION_ID_PATTERNS) {
    if (pattern.test(id)) {
      return true;
    }
  }

  // Check for common section wrapper classes
  if (className.match(/section|container|wrapper|block/i)) {
    // Only if it's a direct child of body or main
    const parent = element.parentElement;
    if (parent && ['body', 'main', 'div'].includes(parent.tagName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Detect the type of a section
 */
function detectSectionType(element: HTMLElement): string {
  const className = (element.className || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const tagName = element.tagName.toLowerCase();

  // Check semantic elements first
  if (tagName === 'header' || tagName === 'nav') return 'header';
  if (tagName === 'footer') return 'footer';

  // Check class/ID patterns
  const combined = `${className} ${id}`;

  if (/hero|banner|masthead|jumbotron/i.test(combined)) return 'hero';
  if (/features?|benefits?|services?/i.test(combined)) return 'features';
  if (/testimonials?|reviews?|quotes?/i.test(combined)) return 'testimonials';
  if (/pricing|plans?|packages?/i.test(combined)) return 'pricing';
  if (/faq|questions?|accordion/i.test(combined)) return 'faq';
  if (/newsletter|subscribe|signup|cta/i.test(combined)) return 'newsletter';
  if (/contact|form|enquiry/i.test(combined)) return 'contact';
  if (/team|about|company/i.test(combined)) return 'about';
  if (/gallery|portfolio|showcase/i.test(combined)) return 'gallery';
  if (/blog|posts?|news/i.test(combined)) return 'blog';
  if (/partners?|clients?|logos?/i.test(combined)) return 'logos';
  if (/stats?|numbers?|counters?/i.test(combined)) return 'stats';

  // Default type based on content analysis
  return analyzeContentType(element);
}

/**
 * Analyze content to determine section type
 */
function analyzeContentType(element: HTMLElement): string {
  const text = element.textContent || '';
  const hasImages = element.querySelectorAll('img').length > 0;
  const hasHeadings = element.querySelectorAll('h1, h2, h3').length > 0;
  const hasParagraphs = element.querySelectorAll('p').length > 0;
  const hasButtons = element.querySelectorAll('button, .btn, [class*="button"]').length > 0;
  const hasForms = element.querySelectorAll('form, input').length > 0;
  const hasLists = element.querySelectorAll('ul, ol').length > 0;

  if (hasForms) return 'contact';
  if (hasImages && element.querySelectorAll('img').length > 3) return 'gallery';
  if (hasHeadings && hasButtons && !hasParagraphs) return 'cta';
  if (hasLists && hasHeadings) return 'features';
  if (hasParagraphs && hasImages) return 'content';

  return 'section';
}

/**
 * Check if a section is valid (has enough content)
 */
function isValidSection(section: DetectedSection): boolean {
  // Skip empty sections
  if (!section.html || section.html.length < 50) {
    return false;
  }

  // Skip script-only or style-only sections
  if (section.html.match(/^<[^>]+>\s*<(script|style)/i)) {
    return false;
  }

  return true;
}

/**
 * Check if an element is inside an already detected section
 */
function isInsideSection(
  element: HTMLElement,
  sections: DetectedSection[],
  document: Document
): boolean {
  for (const section of sections) {
    try {
      const sectionElement = document.querySelector(section.selector);
      if (sectionElement && sectionElement.contains(element)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

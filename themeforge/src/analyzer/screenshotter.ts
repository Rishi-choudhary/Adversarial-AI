import { Page } from 'playwright';
import { DetectedSection } from './sectionDetector';

export interface SectionScreenshot {
  sectionId: string;
  screenshot: Buffer;
  width: number;
  height: number;
}

/**
 * Take screenshots of individual sections
 */
export async function screenshotSections(
  page: Page,
  sections: DetectedSection[]
): Promise<SectionScreenshot[]> {
  const screenshots: SectionScreenshot[] = [];

  for (const section of sections) {
    try {
      const screenshot = await screenshotSection(page, section);
      if (screenshot) {
        screenshots.push(screenshot);
      }
    } catch (error) {
      console.error(`Failed to screenshot section ${section.id}:`, error);
    }
  }

  return screenshots;
}

/**
 * Take a screenshot of a single section
 */
async function screenshotSection(
  page: Page,
  section: DetectedSection
): Promise<SectionScreenshot | null> {
  try {
    // Try to find the element using the selector
    const element = await page.$(section.selector);
    
    if (!element) {
      // Try alternative selectors
      const altElement = await findSectionElement(page, section);
      if (!altElement) return null;
      
      const box = await altElement.boundingBox();
      if (!box) return null;

      const screenshot = await altElement.screenshot({ type: 'png' });
      
      return {
        sectionId: section.id,
        screenshot,
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    }

    const box = await element.boundingBox();
    if (!box) return null;

    const screenshot = await element.screenshot({ type: 'png' });

    return {
      sectionId: section.id,
      screenshot,
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  } catch {
    return null;
  }
}

/**
 * Try to find a section element using alternative methods
 */
async function findSectionElement(page: Page, section: DetectedSection) {
  // Try by ID
  if (section.id && !section.id.startsWith('section-')) {
    const byId = await page.$(`#${section.id}`);
    if (byId) return byId;
  }

  // Try by class
  if (section.classList.length > 0) {
    for (const className of section.classList) {
      const byClass = await page.$(`.${className}`);
      if (byClass) return byClass;
    }
  }

  // Try by element type
  const byElement = await page.$(section.element);
  return byElement;
}

/**
 * Take a full-page screenshot with section annotations
 */
export async function screenshotWithAnnotations(
  page: Page,
  sections: DetectedSection[]
): Promise<Buffer> {
  // Add visual annotations to the page
  await page.evaluate((sectionsData) => {
    sectionsData.forEach((section, index) => {
      try {
        const element = document.querySelector(section.selector);
        if (element) {
          // Create annotation overlay
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute;
            border: 2px solid #f97316;
            pointer-events: none;
            z-index: 10000;
          `;
          
          const rect = element.getBoundingClientRect();
          overlay.style.top = `${rect.top + window.scrollY}px`;
          overlay.style.left = `${rect.left + window.scrollX}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
          
          // Add label
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            top: -24px;
            left: 0;
            background: #f97316;
            color: white;
            padding: 2px 8px;
            font-size: 12px;
            font-family: system-ui, sans-serif;
          `;
          label.textContent = `${index + 1}. ${section.type}`;
          overlay.appendChild(label);
          
          document.body.appendChild(overlay);
        }
      } catch {
        // Ignore annotation errors
      }
    });
  }, sections.map(s => ({ selector: s.selector, type: s.type })));

  // Take screenshot
  const screenshot = await page.screenshot({
    fullPage: true,
    type: 'png',
  });

  // Remove annotations
  await page.evaluate(() => {
    document.querySelectorAll('div[style*="z-index: 10000"]').forEach(el => el.remove());
  });

  return screenshot;
}

/**
 * Generate thumbnail for a screenshot
 */
export function generateThumbnail(
  screenshot: Buffer,
  options: { width?: number; height?: number } = {}
): Promise<Buffer> {
  // This would use sharp or similar library to resize
  // For now, return the original
  return Promise.resolve(screenshot);
}

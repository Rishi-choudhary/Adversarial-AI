import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;

export interface BrowserConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
}

const defaultConfig: BrowserConfig = {
  headless: true,
  timeout: 30000,
  viewport: { width: 1920, height: 1080 },
};

export async function getBrowser(config: BrowserConfig = {}): Promise<Browser> {
  const mergedConfig = { ...defaultConfig, ...config };
  
  if (!browser) {
    browser = await chromium.launch({
      headless: mergedConfig.headless,
    });
  }
  
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function createPage(config: BrowserConfig = {}): Promise<Page> {
  const mergedConfig = { ...defaultConfig, ...config };
  const browserInstance = await getBrowser(config);
  
  const context = await browserInstance.newContext({
    viewport: mergedConfig.viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(mergedConfig.timeout!);
  
  return page;
}

export async function navigateToUrl(page: Page, url: string): Promise<void> {
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
}

export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for any lazy-loaded content
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  
  // Scroll to trigger lazy loading
  await autoScroll(page);
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}

export async function getPageHtml(page: Page): Promise<string> {
  return page.content();
}

export async function getPageTitle(page: Page): Promise<string> {
  return page.title();
}

export async function takeScreenshot(
  page: Page,
  options: { fullPage?: boolean; path?: string } = {}
): Promise<Buffer> {
  return page.screenshot({
    fullPage: options.fullPage ?? true,
    path: options.path,
    type: 'png',
  });
}

export async function takeElementScreenshot(
  page: Page,
  selector: string
): Promise<Buffer | null> {
  const element = await page.$(selector);
  if (!element) return null;
  return element.screenshot({ type: 'png' });
}

export async function evaluateInPage<T>(
  page: Page,
  fn: () => T
): Promise<T> {
  return page.evaluate(fn);
}

export async function getComputedStyles(
  page: Page,
  selector: string
): Promise<Record<string, string> | null> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    
    const computed = window.getComputedStyle(element);
    const styles: Record<string, string> = {};
    
    for (let i = 0; i < computed.length; i++) {
      const property = computed[i];
      styles[property] = computed.getPropertyValue(property);
    }
    
    return styles;
  }, selector);
}

export async function getAllLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links
      .map(link => link.getAttribute('href'))
      .filter((href): href is string => href !== null)
      .filter(href => !href.startsWith('#') && !href.startsWith('javascript:'));
  });
}

export async function getAllImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img[src]'));
    const bgImages = Array.from(document.querySelectorAll('[style*="background"]'));
    
    const srcs = images
      .map(img => img.getAttribute('src'))
      .filter((src): src is string => src !== null);
    
    const bgSrcs = bgImages
      .map(el => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        return match ? match[1] : null;
      })
      .filter((src): src is string => src !== null);
    
    return [...new Set([...srcs, ...bgSrcs])];
  });
}

export async function getAllStylesheets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
    return links
      .map(link => link.getAttribute('href'))
      .filter((href): href is string => href !== null);
  });
}

export async function getAllScripts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts
      .map(script => script.getAttribute('src'))
      .filter((src): src is string => src !== null);
  });
}

import { Page } from 'playwright';
import {
  createPage,
  closeBrowser,
  navigateToUrl,
  waitForPageLoad,
  getPageHtml,
  takeScreenshot,
  getAllImages,
  getAllStylesheets,
  getAllScripts,
} from './playwright';
import {
  downloadAssets,
  extractAssetUrls,
  Asset,
  DownloadResult,
} from './assetDownloader';
import {
  parseCSS,
  mergeCSS,
  extractInlineStyles,
  ExtractedCSS,
} from './cssExtractor';
import { resolveUrl } from '../lib/utils';

export interface ScrapeResult {
  url: string;
  html: string;
  screenshot: Buffer;
  assets: DownloadResult[];
  css: ExtractedCSS;
  inlineStyles: string[];
  stylesheetUrls: string[];
  scriptUrls: string[];
  imageUrls: string[];
}

export interface ScrapeOptions {
  includeScreenshot?: boolean;
  downloadAssets?: boolean;
  onProgress?: (step: string, detail?: string) => void;
}

/**
 * Main scraper orchestrator
 * Scrapes a website and extracts all necessary assets
 */
export async function scrapeWebsite(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const {
    includeScreenshot = true,
    downloadAssets: shouldDownloadAssets = true,
    onProgress,
  } = options;

  let page: Page | null = null;

  try {
    // Create browser page
    onProgress?.('Initializing browser...');
    page = await createPage();

    // Navigate to URL
    onProgress?.('Navigating to website...');
    await navigateToUrl(page, url);
    await waitForPageLoad(page);

    // Get page HTML
    onProgress?.('Extracting HTML...');
    const html = await getPageHtml(page);

    // Take screenshot
    let screenshot: Buffer = Buffer.alloc(0);
    if (includeScreenshot) {
      onProgress?.('Taking screenshot...');
      screenshot = await takeScreenshot(page, { fullPage: true });
    }

    // Extract asset URLs from page
    onProgress?.('Discovering assets...');
    const imageUrls = await getAllImages(page);
    const stylesheetUrls = await getAllStylesheets(page);
    const scriptUrls = await getAllScripts(page);

    // Extract inline styles
    const inlineStyles = extractInlineStyles(html);

    // Download all assets
    let assets: DownloadResult[] = [];
    if (shouldDownloadAssets) {
      onProgress?.('Downloading images...');
      const allAssetUrls = extractAssetUrls(html, url);
      
      // Add discovered URLs
      const resolvedImageUrls = imageUrls.map(u => resolveUrl(url, u));
      const resolvedStylesheetUrls = stylesheetUrls.map(u => resolveUrl(url, u));
      const resolvedScriptUrls = scriptUrls.map(u => resolveUrl(url, u));
      
      const uniqueUrls = [
        ...new Set([
          ...allAssetUrls,
          ...resolvedImageUrls,
          ...resolvedStylesheetUrls,
          ...resolvedScriptUrls,
        ]),
      ];

      assets = await downloadAssets(uniqueUrls, url, {
        concurrency: 5,
        onProgress: (completed, total) => {
          onProgress?.(`Downloading assets... (${completed}/${total})`);
        },
      });
    }

    // Parse and merge CSS
    onProgress?.('Processing CSS...');
    const cssAssets = assets.filter(
      (a) => a.success && a.asset.type === 'css' && typeof a.asset.content === 'string'
    );
    const cssContents = cssAssets.map((a) => a.asset.content as string);
    const mergedCss = mergeCSS([...inlineStyles, ...cssContents]);
    const css = parseCSS(mergedCss);

    return {
      url,
      html,
      screenshot,
      assets,
      css,
      inlineStyles,
      stylesheetUrls: resolvedStylesheetUrls,
      scriptUrls: resolvedScriptUrls,
      imageUrls: resolvedImageUrls,
    };
  } finally {
    // Close page if created
    if (page) {
      await page.close();
    }
  }

  // Helper variables scoped for return
  function resolvedStylesheetUrls(): string[] {
    return stylesheetUrls.map((u: string) => resolveUrl(url, u));
  }

  function resolvedScriptUrls(): string[] {
    return scriptUrls.map((u: string) => resolveUrl(url, u));
  }

  function resolvedImageUrls(): string[] {
    return imageUrls.map((u: string) => resolveUrl(url, u));
  }
}

/**
 * Scrape multiple pages from a website
 */
export async function scrapeMultiplePages(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const url of urls) {
    try {
      const result = await scrapeWebsite(url, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
    }
  }

  return results;
}

/**
 * Clean up resources
 */
export async function cleanup(): Promise<void> {
  await closeBrowser();
}

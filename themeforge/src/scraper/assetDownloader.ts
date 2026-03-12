import { resolveUrl, isImageUrl, isCssUrl, isJsUrl, sanitizeFilename } from '../lib/utils';

export interface Asset {
  url: string;
  type: 'image' | 'css' | 'js' | 'font' | 'other';
  originalUrl: string;
  localPath?: string;
  content?: Buffer | string;
}

export interface DownloadResult {
  success: boolean;
  asset: Asset;
  error?: string;
}

/**
 * Classify an asset URL by type
 */
export function classifyAsset(url: string): Asset['type'] {
  if (isImageUrl(url)) return 'image';
  if (isCssUrl(url)) return 'css';
  if (isJsUrl(url)) return 'js';
  if (url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) return 'font';
  return 'other';
}

/**
 * Download a single asset
 */
export async function downloadAsset(
  url: string,
  baseUrl: string
): Promise<DownloadResult> {
  const absoluteUrl = resolveUrl(baseUrl, url);
  const type = classifyAsset(absoluteUrl);
  
  const asset: Asset = {
    url: absoluteUrl,
    type,
    originalUrl: url,
  };

  try {
    const response = await fetch(absoluteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (type === 'css' || type === 'js') {
      asset.content = await response.text();
    } else {
      const buffer = await response.arrayBuffer();
      asset.content = Buffer.from(buffer);
    }

    // Generate local path
    const filename = generateLocalFilename(absoluteUrl, type);
    asset.localPath = filename;

    return { success: true, asset };
  } catch (error) {
    return {
      success: false,
      asset,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download multiple assets in parallel with concurrency limit
 */
export async function downloadAssets(
  urls: string[],
  baseUrl: string,
  options: { concurrency?: number; onProgress?: (completed: number, total: number) => void } = {}
): Promise<DownloadResult[]> {
  const { concurrency = 5, onProgress } = options;
  const results: DownloadResult[] = [];
  const uniqueUrls = [...new Set(urls)];
  
  let completed = 0;
  
  // Process in batches
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => downloadAsset(url, baseUrl))
    );
    
    results.push(...batchResults);
    completed += batch.length;
    
    if (onProgress) {
      onProgress(completed, uniqueUrls.length);
    }
  }
  
  return results;
}

/**
 * Generate a local filename for an asset
 */
function generateLocalFilename(url: string, type: Asset['type']): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const basename = pathname.split('/').pop() || 'asset';
    
    // Sanitize the filename
    let filename = sanitizeFilename(basename);
    
    // Add type-specific prefix
    const prefix = type === 'image' ? 'img-' : type === 'font' ? 'font-' : '';
    
    // Ensure extension
    if (!filename.includes('.')) {
      const ext = getDefaultExtension(type);
      filename = `${filename}.${ext}`;
    }
    
    return `${prefix}${filename}`;
  } catch {
    return `asset-${Date.now()}.bin`;
  }
}

/**
 * Get default file extension for asset type
 */
function getDefaultExtension(type: Asset['type']): string {
  switch (type) {
    case 'image': return 'png';
    case 'css': return 'css';
    case 'js': return 'js';
    case 'font': return 'woff2';
    default: return 'bin';
  }
}

/**
 * Extract and collect all assets from HTML content
 */
export function extractAssetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  
  // Extract image sources
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  // Extract CSS links
  const cssRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi;
  while ((match = cssRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  // Extract script sources
  const jsRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  while ((match = jsRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  // Extract background images from inline styles
  const bgRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  
  // Extract srcset images
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    const srcsetUrls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    urls.push(...srcsetUrls);
  }
  
  // Resolve relative URLs and deduplicate
  const resolved = urls
    .map(url => resolveUrl(baseUrl, url))
    .filter(url => url.startsWith('http'));
  
  return [...new Set(resolved)];
}

/**
 * Image Pipeline Processor
 * 
 * Handles downloading, converting, and optimizing images
 * for Shopify theme assets.
 * 
 * File: src/pipeline/imageProcessor.ts
 */

import * as crypto from 'crypto';
import * as path from 'path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import {
  ImageMapping,
  ImageDownloadResult,
  ImageProcessingOptions,
} from '../types';

/**
 * Default image processing options
 */
const DEFAULT_OPTIONS: ImageProcessingOptions = {
  quality: 85,
  format: 'webp',
  maxConcurrency: 10,
};

/**
 * ImageProcessor class for handling image pipeline
 */
export class ImageProcessor {
  private options: ImageProcessingOptions;
  private imageMap: Map<string, string> = new Map();
  private processedImages: Map<string, Buffer> = new Map();

  constructor(options?: Partial<ImageProcessingOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate MD5 hash for content
   */
  private generateHash(content: Buffer): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Generate asset filename from original URL
   */
  private generateAssetFilename(originalUrl: string, content: Buffer): string {
    const hash = this.generateHash(content);
    const ext = this.options.format;
    
    // Try to extract a meaningful name from the URL
    const urlParts = originalUrl.split('/');
    const originalFilename = urlParts[urlParts.length - 1]?.split('?')[0] || '';
    const nameWithoutExt = path.parse(originalFilename).name || 'image';
    
    // Clean the name (remove special characters)
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    return `image-${cleanName}-${hash}.${ext}`;
  }

  /**
   * Download an image from URL
   */
  public async downloadImage(url: string): Promise<ImageDownloadResult> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          originalUrl: url,
          error: 'Invalid URL protocol',
        };
      }

      // Use dynamic import for node-fetch (ESM compatibility)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ThemeForge Image Processor/1.0',
          'Accept': 'image/*',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          originalUrl: url,
          error: `HTTP error: ${response.status}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        originalUrl: url,
        buffer,
      };
    } catch (error) {
      return {
        success: false,
        originalUrl: url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert image to WebP format
   */
  public async convertToWebP(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Skip conversion for SVG (not supported by sharp for output)
      if (metadata.format === 'svg') {
        return buffer;
      }

      // Convert to WebP with specified quality
      return await image
        .webp({ quality: this.options.quality })
        .toBuffer();
    } catch (error) {
      // If conversion fails, return original buffer
      console.warn('Image conversion failed, using original:', error);
      return buffer;
    }
  }

  /**
   * Convert image to specified format
   */
  public async convertImage(buffer: Buffer, format: 'webp' | 'png' | 'jpeg'): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Skip conversion for SVG
      if (metadata.format === 'svg') {
        return buffer;
      }

      switch (format) {
        case 'webp':
          return await image.webp({ quality: this.options.quality }).toBuffer();
        case 'png':
          return await image.png({ quality: this.options.quality }).toBuffer();
        case 'jpeg':
          return await image.jpeg({ quality: this.options.quality }).toBuffer();
        default:
          return buffer;
      }
    } catch (error) {
      console.warn('Image conversion failed, using original:', error);
      return buffer;
    }
  }

  /**
   * Process a single image (download + convert)
   */
  public async processImage(url: string): Promise<ImageMapping | null> {
    // Check if already processed
    if (this.imageMap.has(url)) {
      return {
        originalUrl: url,
        assetFilename: this.imageMap.get(url)!,
        hash: '',
      };
    }

    // Download image
    const downloadResult = await this.downloadImage(url);
    if (!downloadResult.success || !downloadResult.buffer) {
      console.warn(`Failed to download image: ${url}`, downloadResult.error);
      return null;
    }

    // Convert to WebP
    const convertedBuffer = await this.convertToWebP(downloadResult.buffer);

    // Generate filename
    const filename = this.generateAssetFilename(url, convertedBuffer);
    const hash = this.generateHash(convertedBuffer);

    // Store in maps
    this.imageMap.set(url, filename);
    this.processedImages.set(filename, convertedBuffer);

    return {
      originalUrl: url,
      assetFilename: filename,
      hash,
    };
  }

  /**
   * Process multiple images in parallel
   */
  public async processImages(urls: string[]): Promise<ImageMapping[]> {
    const limit = pLimit(this.options.maxConcurrency);
    const results: ImageMapping[] = [];

    // Filter out duplicates
    const uniqueUrls = [...new Set(urls)];

    const promises = uniqueUrls.map((url) =>
      limit(async () => {
        const result = await this.processImage(url);
        if (result) {
          results.push(result);
        }
        return result;
      })
    );

    await Promise.all(promises);

    return results;
  }

  /**
   * Extract image URLs from HTML content
   */
  public extractImageUrls(html: string): string[] {
    const urls: string[] = [];
    const patterns = [
      // img src attribute
      /<img[^>]+src=["']([^"']+)["']/gi,
      // background-image in style
      /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
      // srcset attribute
      /srcset=["']([^"']+)["']/gi,
      // data-src (lazy loading)
      /data-src=["']([^"']+)["']/gi,
      // source srcset
      /<source[^>]+srcset=["']([^"']+)["']/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const urlString = match[1];
        
        // Handle srcset (multiple URLs)
        if (pattern.source.includes('srcset')) {
          const srcsetUrls = urlString.split(',').map((entry: string) => {
            const parts = entry.trim().split(/\s+/);
            return parts[0];
          });
          urls.push(...srcsetUrls.filter((u: string) => this.isValidImageUrl(u)));
        } else if (this.isValidImageUrl(urlString)) {
          urls.push(urlString);
        }
      }
    }

    return [...new Set(urls)];
  }

  /**
   * Check if URL is a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || url.startsWith('data:')) {
      return false;
    }

    // Check for image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.ico'];
    const lowerUrl = url.toLowerCase();
    
    // Check if URL has image extension
    const hasImageExtension = imageExtensions.some(ext => lowerUrl.includes(ext));
    
    // Or check if it looks like an image URL (common patterns)
    const hasImagePath = /\/(images?|img|assets?|media|photos?|pictures?|uploads?)\//i.test(url);
    
    return hasImageExtension || hasImagePath;
  }

  /**
   * Get the image URL to asset filename map
   */
  public getImageMap(): Map<string, string> {
    return this.imageMap;
  }

  /**
   * Get all processed image buffers
   */
  public getProcessedImages(): Map<string, Buffer> {
    return this.processedImages;
  }

  /**
   * Replace image URLs in content with Shopify asset URLs
   */
  public replaceUrlsInContent(content: string): string {
    let result = content;

    for (const [originalUrl, assetFilename] of this.imageMap) {
      // Escape special regex characters in URL
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedUrl, 'g');
      result = result.replace(regex, `{{ '${assetFilename}' | asset_url }}`);
    }

    return result;
  }

  /**
   * Get image dimensions
   */
  public async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        return {
          width: metadata.width,
          height: metadata.height,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Resize image if needed (for thumbnails, etc.)
   */
  public async resizeImage(
    buffer: Buffer,
    maxWidth: number,
    maxHeight: number
  ): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Skip if already smaller than target
      if (
        metadata.width &&
        metadata.height &&
        metadata.width <= maxWidth &&
        metadata.height <= maxHeight
      ) {
        return buffer;
      }

      return await image
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
    } catch {
      return buffer;
    }
  }

  /**
   * Clear all processed data (for reuse)
   */
  public clear(): void {
    this.imageMap.clear();
    this.processedImages.clear();
  }

  /**
   * Process image from buffer (without downloading)
   */
  public async processImageFromBuffer(
    buffer: Buffer,
    suggestedName: string
  ): Promise<{ filename: string; buffer: Buffer }> {
    // Convert to WebP
    const convertedBuffer = await this.convertToWebP(buffer);
    
    // Generate filename
    const hash = this.generateHash(convertedBuffer);
    const cleanName = suggestedName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    const filename = `image-${cleanName}-${hash}.${this.options.format}`;
    
    // Store in processed images
    this.processedImages.set(filename, convertedBuffer);
    
    return {
      filename,
      buffer: convertedBuffer,
    };
  }
}

/**
 * Create a new ImageProcessor instance
 */
export function createImageProcessor(options?: Partial<ImageProcessingOptions>): ImageProcessor {
  return new ImageProcessor(options);
}

/**
 * Download images in parallel with rate limiting
 */
export async function downloadImagesParallel(
  urls: string[],
  options?: Partial<ImageProcessingOptions>
): Promise<ImageMapping[]> {
  const processor = createImageProcessor(options);
  return processor.processImages(urls);
}

export default ImageProcessor;

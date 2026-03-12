import sharp from 'sharp';

export interface ProcessedImage {
  filename: string;
  content: Buffer;
  width?: number;
  height?: number;
  format: string;
}

export interface ImageInput {
  filename: string;
  content: Buffer;
}

export interface ProcessOptions {
  optimize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'original';
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Process multiple images
 */
export async function processImages(
  images: ImageInput[],
  options: ProcessOptions = {}
): Promise<ProcessedImage[]> {
  const {
    optimize = true,
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 80,
    format = 'webp',
    onProgress,
  } = options;

  const results: ProcessedImage[] = [];
  let completed = 0;

  for (const image of images) {
    try {
      const processed = await processImage(image, {
        optimize,
        maxWidth,
        maxHeight,
        quality,
        format,
      });
      results.push(processed);
    } catch (error) {
      console.error(`Failed to process image ${image.filename}:`, error);
      // Keep original on failure
      results.push({
        filename: image.filename,
        content: image.content,
        format: 'original',
      });
    }

    completed++;
    onProgress?.(completed, images.length);
  }

  return results;
}

/**
 * Process a single image
 */
export async function processImage(
  image: ImageInput,
  options: Omit<ProcessOptions, 'onProgress'>
): Promise<ProcessedImage> {
  const {
    optimize = true,
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 80,
    format = 'webp',
  } = options;

  if (!optimize) {
    return {
      filename: image.filename,
      content: image.content,
      format: 'original',
    };
  }

  try {
    let pipeline = sharp(image.content);
    
    // Get metadata
    const metadata = await pipeline.metadata();
    
    // Resize if necessary
    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // Convert format
    let outputFilename = image.filename;
    let outputFormat: string = format;

    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({ quality });
        outputFilename = changeExtension(image.filename, 'webp');
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        outputFilename = changeExtension(image.filename, 'jpg');
        break;
      case 'png':
        pipeline = pipeline.png({ quality: Math.min(quality, 100), compressionLevel: 9 });
        outputFilename = changeExtension(image.filename, 'png');
        break;
      default:
        // Keep original format but optimize
        if (metadata.format === 'jpeg') {
          pipeline = pipeline.jpeg({ quality, progressive: true });
        } else if (metadata.format === 'png') {
          pipeline = pipeline.png({ compressionLevel: 9 });
        }
        outputFormat = (metadata.format as string) || 'original';
    }

    const outputBuffer = await pipeline.toBuffer();

    // Get output dimensions
    const outputMetadata = await sharp(outputBuffer).metadata();

    return {
      filename: outputFilename,
      content: outputBuffer,
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputFormat,
    };
  } catch (error) {
    console.error(`Image processing error for ${image.filename}:`, error);
    // Return original on error
    return {
      filename: image.filename,
      content: image.content,
      format: 'original',
    };
  }
}

/**
 * Generate image thumbnails
 */
export async function generateThumbnail(
  image: Buffer,
  options: { width?: number; height?: number; quality?: number } = {}
): Promise<Buffer> {
  const { width = 200, height = 200, quality = 60 } = options;

  return sharp(image)
    .resize(width, height, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality })
    .toBuffer();
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(
  image: Buffer,
  quality: number = 80
): Promise<Buffer> {
  return sharp(image).webp({ quality }).toBuffer();
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  image: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(image).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Change file extension
 */
function changeExtension(filename: string, newExt: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return `${filename}.${newExt}`;
  }
  return `${filename.substring(0, lastDot)}.${newExt}`;
}

/**
 * Check if buffer is a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!metadata.format;
  } catch {
    return false;
  }
}

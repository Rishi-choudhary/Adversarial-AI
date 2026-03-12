import archiver from 'archiver';
import { Writable } from 'stream';
import { ThemeStructure } from './themeBuilder';

export interface ZipResult {
  buffer: Buffer;
  size: number;
  fileCount: number;
}

/**
 * Build a ZIP file from the theme structure
 */
export async function buildZip(theme: ThemeStructure): Promise<ZipResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let fileCount = 0;

    // Create a writable stream to collect chunks
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    // Create the archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        size: buffer.length,
        fileCount,
      });
    });

    // Pipe archive to writable stream
    archive.pipe(writableStream);

    // Add files from each directory
    for (const [directory, files] of Object.entries(theme)) {
      for (const [filename, content] of Object.entries(files)) {
        const path = `${directory}/${filename}`;
        
        if (Buffer.isBuffer(content)) {
          archive.append(content, { name: path });
        } else {
          archive.append(content as string, { name: path });
        }
        
        fileCount++;
      }
    }

    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Build a ZIP file from files map
 */
export async function buildZipFromFiles(
  files: Map<string, string | Buffer>
): Promise<ZipResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let fileCount = 0;

    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', reject);

    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        size: buffer.length,
        fileCount,
      });
    });

    archive.pipe(writableStream);

    for (const [path, content] of files) {
      archive.append(content, { name: path });
      fileCount++;
    }

    archive.finalize();
  });
}

/**
 * Stream a ZIP file (for large files)
 */
export function createZipStream(theme: ThemeStructure): archiver.Archiver {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  // Add files from each directory
  for (const [directory, files] of Object.entries(theme)) {
    for (const [filename, content] of Object.entries(files)) {
      const path = `${directory}/${filename}`;
      
      if (Buffer.isBuffer(content)) {
        archive.append(content, { name: path });
      } else {
        archive.append(content as string, { name: path });
      }
    }
  }

  return archive;
}

/**
 * Calculate compressed size estimate
 */
export function estimateCompressedSize(theme: ThemeStructure): number {
  let totalSize = 0;

  for (const files of Object.values(theme)) {
    for (const content of Object.values(files)) {
      if (Buffer.isBuffer(content)) {
        totalSize += content.length;
      } else if (typeof content === 'string') {
        totalSize += Buffer.byteLength(content, 'utf8');
      }
    }
  }

  // Estimate compression ratio (typically 60-80% for text-heavy content)
  return Math.round(totalSize * 0.3);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

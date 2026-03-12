import * as fs from 'fs/promises';
import * as path from 'path';

export type StorageType = 'local' | 's3';

export interface StorageConfig {
  type: StorageType;
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
}

function getConfig(): StorageConfig {
  return {
    type: (process.env.STORAGE_TYPE as StorageType) || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './tmp/jobs',
    s3Bucket: process.env.S3_BUCKET,
    s3Region: process.env.S3_REGION || 'us-east-1',
  };
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function getJobPath(jobId: string): Promise<string> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const jobPath = path.join(config.localPath!, jobId);
    await ensureDirectory(jobPath);
    return jobPath;
  }
  
  // For S3, return the prefix path
  return `jobs/${jobId}`;
}

export async function writeFile(
  jobId: string,
  filePath: string,
  content: string | Buffer
): Promise<string> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const fullPath = path.join(config.localPath!, jobId, filePath);
    await ensureDirectory(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    return fullPath;
  }
  
  // S3 implementation would go here
  throw new Error('S3 storage not implemented');
}

export async function readFile(jobId: string, filePath: string): Promise<Buffer> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const fullPath = path.join(config.localPath!, jobId, filePath);
    return fs.readFile(fullPath);
  }
  
  throw new Error('S3 storage not implemented');
}

export async function fileExists(jobId: string, filePath: string): Promise<boolean> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const fullPath = path.join(config.localPath!, jobId, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

export async function listFiles(jobId: string, dirPath: string = ''): Promise<string[]> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const fullPath = path.join(config.localPath!, jobId, dirPath);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: string[] = [];
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await listFiles(jobId, entryPath);
          files.push(...subFiles);
        } else {
          files.push(entryPath);
        }
      }
      
      return files;
    } catch {
      return [];
    }
  }
  
  return [];
}

export async function deleteJob(jobId: string): Promise<void> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const jobPath = path.join(config.localPath!, jobId);
    await fs.rm(jobPath, { recursive: true, force: true });
  }
}

export async function getFileStats(jobId: string, filePath: string): Promise<{ size: number } | null> {
  const config = getConfig();
  
  if (config.type === 'local') {
    const fullPath = path.join(config.localPath!, jobId, filePath);
    try {
      const stats = await fs.stat(fullPath);
      return { size: stats.size };
    } catch {
      return null;
    }
  }
  
  return null;
}

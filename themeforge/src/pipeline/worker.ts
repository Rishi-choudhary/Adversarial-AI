import { Worker, Job } from 'bullmq';
import { getRedis, setJob, completeJob, failJob, JobData, StepStatus } from '../lib/redis';
import { scrapeWebsite, cleanup as cleanupScraper } from '../scraper';
import { detectSections } from '../analyzer/sectionDetector';
import { classifySections } from '../analyzer/sectionClassifier';
import { deduplicateSections } from '../analyzer/deduplicator';
import { convertSectionsToLiquid } from '../converter/liquidGenerator';
import { generateThemeJS } from '../converter/jsProcessor';
import { buildTheme } from '../assembler/themeBuilder';
import { buildZip, formatFileSize } from '../assembler/zipBuilder';
import { writeFile, getJobPath } from '../lib/storage';
import { processImages } from './imageProcessor';
import { emitProgress, ProgressStep } from './progressEmitter';

export interface ConversionJob {
  id: string;
  url: string;
  options?: {
    includeImages?: boolean;
    optimizeImages?: boolean;
    generatePreviews?: boolean;
    aiAssisted?: boolean;
  };
}

let worker: Worker | null = null;

/**
 * Start the worker process
 */
export function startWorker(): Worker {
  if (worker) {
    return worker;
  }

  const connection = getRedis();

  worker = new Worker<ConversionJob>(
    'themeforge-conversion',
    async (job) => {
      return processConversionJob(job);
    },
    {
      connection,
      concurrency: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute max
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return worker;
}

/**
 * Stop the worker process
 */
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await cleanupScraper();
}

/**
 * Process a conversion job
 */
async function processConversionJob(job: Job<ConversionJob>): Promise<string> {
  const { id: jobId, url, options = {} } = job.data;
  
  const steps: ProgressStep[] = [
    { id: 'scrape', label: 'Scraping website...', status: 'waiting' },
    { id: 'images', label: 'Extracting images...', status: 'waiting' },
    { id: 'css', label: 'Extracting CSS & JS...', status: 'waiting' },
    { id: 'detect', label: 'Detecting sections...', status: 'waiting' },
    { id: 'convert', label: 'Converting sections to Liquid...', status: 'waiting' },
    { id: 'assemble', label: 'Assembling Shopify theme...', status: 'waiting' },
    { id: 'zip', label: 'Generating ZIP...', status: 'waiting' },
  ];

  const updateProgress = async (stepId: string, progress: number, detail?: string) => {
    steps.forEach(step => {
      if (step.id === stepId) {
        step.status = 'active';
        step.detail = detail;
      } else if (steps.indexOf(step) < steps.findIndex(s => s.id === stepId)) {
        step.status = 'done';
      }
    });

    await emitProgress(jobId, { url, percentage: progress, steps });
    await job.updateProgress(progress);
  };

  try {
    // Initialize job in Redis
    const jobData: JobData = {
      id: jobId,
      url,
      status: 'processing',
      progress: 0,
      steps: steps as StepStatus[],
      createdAt: new Date().toISOString(),
    };
    await setJob(jobId, jobData);

    // Step 1: Scrape website
    await updateProgress('scrape', 5);
    const scrapeResult = await scrapeWebsite(url, {
      includeScreenshot: true,
      downloadAssets: options.includeImages !== false,
      onProgress: (step) => {
        console.log(`Scraping: ${step}`);
      },
    });
    await updateProgress('scrape', 15);

    // Step 2: Process images
    await updateProgress('images', 20);
    const imageCount = scrapeResult.assets.filter(a => a.asset.type === 'image').length;
    const processedImages = await processImages(
      scrapeResult.assets
        .filter(a => a.success && a.asset.type === 'image')
        .map(a => ({
          filename: a.asset.localPath || 'image.png',
          content: a.asset.content as Buffer,
        })),
      {
        optimize: options.optimizeImages !== false,
        onProgress: (completed, total) => {
          const progress = 20 + Math.round((completed / total) * 10);
          updateProgress('images', progress, `${completed}/${total} images`);
        },
      }
    );
    await updateProgress('images', 30, `${imageCount} images`);

    // Step 3: Extract CSS & JS
    await updateProgress('css', 35);
    const cssContent = scrapeResult.css.content;
    const jsContent = scrapeResult.assets
      .filter(a => a.success && a.asset.type === 'js')
      .map(a => a.asset.content as string)
      .join('\n\n');
    await updateProgress('css', 45);

    // Step 4: Detect sections
    await updateProgress('detect', 50);
    const detectedSections = detectSections(scrapeResult.html);
    const classifiedSections = classifySections(detectedSections);
    const { unique: uniqueSections } = deduplicateSections(classifiedSections);
    await updateProgress('detect', 55, `${uniqueSections.length} sections`);

    // Step 5: Convert to Liquid
    await updateProgress('convert', 60);
    const liquidSections = convertSectionsToLiquid(classifiedSections);
    
    for (let i = 0; i < liquidSections.length; i++) {
      const progress = 60 + Math.round((i / liquidSections.length) * 15);
      await updateProgress('convert', progress, `${i + 1}/${liquidSections.length}`);
    }
    await updateProgress('convert', 75);

    // Step 6: Assemble theme
    await updateProgress('assemble', 80);
    const themeJs = generateThemeJS();
    const imagesMap = new Map<string, Buffer>();
    
    for (const img of processedImages) {
      imagesMap.set(img.filename, img.content);
    }

    // Save screenshot
    if (scrapeResult.screenshot.length > 0) {
      imagesMap.set('screenshot.png', scrapeResult.screenshot);
    }

    const theme = await buildTheme(
      jobId,
      liquidSections,
      cssContent,
      themeJs,
      imagesMap
    );
    await updateProgress('assemble', 90);

    // Step 7: Generate ZIP
    await updateProgress('zip', 95);
    const zipResult = await buildZip(theme);
    const zipPath = `${jobId}/theme.zip`;
    await writeFile(jobId, 'theme.zip', zipResult.buffer);
    
    // Mark all steps as done
    steps.forEach(step => { step.status = 'done'; });
    await emitProgress(jobId, {
      url,
      percentage: 100,
      steps,
      complete: true,
      fileSize: formatFileSize(zipResult.size),
    });

    // Complete job
    await completeJob(jobId, zipPath);

    return zipPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await failJob(jobId, errorMessage);
    throw error;
  }
}

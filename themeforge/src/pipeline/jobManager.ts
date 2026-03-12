import { Queue, Job, QueueEvents } from 'bullmq';

export interface ConversionJob {
  id: string;
  url: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  includeImages?: boolean;
  optimizeImages?: boolean;
  generatePreviews?: boolean;
  aiAssisted?: boolean;
}

let conversionQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Get Redis connection options for BullMQ
 */
function getRedisOptions() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
  };
}

/**
 * Get or create the conversion queue
 */
export function getQueue(): Queue {
  if (!conversionQueue) {
    conversionQueue = new Queue('themeforge-conversion', {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 24 * 3600,
        },
      },
    });
  }

  return conversionQueue;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    queueEvents = new QueueEvents('themeforge-conversion', { connection: getRedisOptions() });
  }
  return queueEvents;
}

/**
 * Add a conversion job to the queue
 */
export async function addJob(
  url: string,
  options: ConversionOptions = {}
): Promise<Job<ConversionJob>> {
  const queue = getQueue();
  
  const jobData: ConversionJob = {
    id: generateJobId(),
    url,
    options: {
      includeImages: true,
      optimizeImages: true,
      generatePreviews: true,
      aiAssisted: false,
      ...options,
    },
  };

  const job = await queue.add('convert', jobData, {
    jobId: jobData.id,
  });

  return job;
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<Job<ConversionJob> | undefined> {
  const queue = getQueue();
  return queue.getJob(jobId);
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  data?: ConversionJob;
  failedReason?: string;
} | null> {
  const job = await getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress as number || 0;

  return {
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await getJob(jobId);
  
  if (!job) {
    return false;
  }

  const state = await job.getState();
  
  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    return true;
  }

  return false;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const queue = getQueue();
  
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

/**
 * Clean old jobs
 */
export async function cleanOldJobs(maxAge: number = 24 * 3600 * 1000): Promise<void> {
  const queue = getQueue();
  
  await Promise.all([
    queue.clean(maxAge, 100, 'completed'),
    queue.clean(maxAge, 100, 'failed'),
  ]);
}

/**
 * Close queue connections
 */
export async function closeQueue(): Promise<void> {
  if (conversionQueue) {
    await conversionQueue.close();
    conversionQueue = null;
  }
  
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}_${random}`;
}

/**
 * Wait for a job to complete
 */
export async function waitForJob(
  jobId: string,
  timeout: number = 300000 // 5 minutes
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const events = getQueueEvents();
  
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ success: false, error: 'Job timed out' });
    }, timeout);

    events.on('completed', ({ jobId: completedJobId, returnvalue }) => {
      if (completedJobId === jobId) {
        clearTimeout(timer);
        resolve({ success: true, result: returnvalue });
      }
    });

    events.on('failed', ({ jobId: failedJobId, failedReason }) => {
      if (failedJobId === jobId) {
        clearTimeout(timer);
        resolve({ success: false, error: failedReason });
      }
    });
  });
}
